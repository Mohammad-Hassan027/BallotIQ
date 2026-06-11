/**
 * Gemini AI assistant and concept re-explanation logic.
 */

import type { ChatMessage, ElectionStep, KnowledgeLevel, UserContext } from '@/types';
import { buildAssistantSystemPrompt, buildAssistantUserMessage, buildReExplanationPrompt } from './prompts';
import { sanitizeAIResponse } from '@/lib/security/sanitize';
import { checkRateLimit } from '@/lib/security/rateLimit';
import { withTrace } from '@/lib/firebase/performance';
import { logger } from '@/lib/logger';
import { callGemini, isGeminiEnabled } from './core';
import { sanitizeUserInput } from '@/lib/security/sanitize';

import { getConversationMetadata, saveConversationMetadata } from '@/lib/firebase/firestore';

/**
 * Summarizes the conversation to maintain long-term context.
 */
async function summarizeConversation(
  sessionId: string,
  oldSummary: string | undefined,
  messagesToSummarize: ChatMessage[]
): Promise<string> {
  try {
    const historyText = messagesToSummarize.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n');
    const prompt = `Update the following concise summary (max 100 words) of a conversation between a user and an election assistant by incorporating the oldest messages provided. Focus on key topics discussed, the user's country context, and specific election procedures explained.
Current Summary: ${oldSummary || 'None'}
Oldest Messages to incorporate:
${historyText}
New Summary:`;

    const newSummary = await callGemini(
      prompt, 
      sessionId, 
      true, 
      "You are a helpful assistant that summarizes conversations accurately and concisely. Maintain all important civic context and previous answers provided to the user.", 
      150
    );
    return newSummary?.trim() || oldSummary || '';
  } catch (err) {
    logger.error('Summarization failed', err as Error, { sessionId });
    return oldSummary || '';
  }
}

/**
 * Conversational assistant with full user context.
 */
export async function askAssistant(
  question: string,
  userContext: UserContext,
  completedSteps: ElectionStep[],
  chatHistory: ChatMessage[],
): Promise<string> {
  return withTrace(
    'gemini_assistant_response',
    { countryCode: userContext.countryCode },
    async () => {
      if (!isGeminiEnabled) {
        return 'The AI assistant is offline. Check your API key configuration.';
      }

      const limit = await checkRateLimit(userContext.sessionId, 'gemini');
      if (!limit.allowed) {
        return 'You\'ve reached the daily AI request limit. Try again tomorrow.';
      }

      // 1. Fetch current summary if it exists
      const metadata = await getConversationMetadata(userContext.sessionId);
      let summary = metadata?.conversationSummary;

      // 2. Trigger Summarization Pipeline if history is long enough
      // Threshold: 6 messages (3 user/assistant pairs)
      if (chatHistory.length > 6) {
        // We summarize everything EXCEPT the last 3 messages (which will be literal context)
        const toSummarize = chatHistory.slice(0, -3);
        const newSummary = await summarizeConversation(userContext.sessionId, summary, toSummarize);
        
        if (newSummary && newSummary !== summary) {
          summary = newSummary;
          // Persist summary back to Firestore
          if (metadata) {
            await saveConversationMetadata({
              ...metadata,
              conversationSummary: summary,
              updatedAt: new Date().toISOString()
            });
          }
        }
      }

      const systemPrompt = buildAssistantSystemPrompt(userContext, completedSteps, chatHistory.length, summary);
      const sanitizedQuestion = sanitizeUserInput(question);
      const userMessage = buildAssistantUserMessage(sanitizedQuestion, chatHistory);

      try {
        const raw = await callGemini(userMessage, userContext.sessionId, true, systemPrompt, 1024);
        if (raw) return sanitizeAIResponse(raw);
        return 'The AI assistant is temporarily unavailable. Please try your question again in a moment or check your connection.';
      } catch (err: unknown) {
        logger.error('Assistant API call failed', err as Error, { component: 'GeminiClient', sessionId: userContext.sessionId });
        throw err;
      }
    }
  );
}

/**
 * Re-explains a concept when user gets micro-quiz wrong.
 */
export async function reExplainConcept(
  step: ElectionStep,
  userAnswer: string,
  correctAnswer: string,
  knowledgeLevel: KnowledgeLevel,
  sessionId?: string,
): Promise<string> {
  const fallback = `The correct answer is "${correctAnswer}". ${step.simpleExplanation}`;
  const prompt = buildReExplanationPrompt(step, userAnswer, correctAnswer, knowledgeLevel);
  const raw = await callGemini(prompt, sessionId ?? 'explain', true);
  if (!raw) return fallback;
  return sanitizeAIResponse(raw);
}
