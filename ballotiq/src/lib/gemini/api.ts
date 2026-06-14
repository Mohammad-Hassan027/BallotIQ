/**
 * Client-side fetch helpers for Gemini API routes.
 *
 * These functions are the ONLY way client components should interact with Gemini.
 * They call internal Next.js Route Handlers (/api/gemini/*) which run server-side
 * and keep the GEMINI_API_KEY out of the browser bundle entirely.
 *
 * DO NOT import anything from '@/lib/gemini/core' or '@/lib/gemini/client' in
 * client components. Use these helpers instead.
 */

import type {
  AssessmentAnswer,
  ChatMessage,
  ElectionStep,
  KnowledgeLevel,
  MicroQuizQuestion,
  QuizQuestion,
  QuizResult,
  UserContext,
} from '@/types';

/** Shared fetch helper with consistent error handling */
async function geminiPost<T>(endpoint: string, body: unknown): Promise<T> {
  const res = await fetch(`/api/gemini/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' })) as { error?: string };
    throw new Error(err.error ?? `Request to /api/gemini/${endpoint} failed with status ${res.status}`);
  }

  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Assessment
// ---------------------------------------------------------------------------

/**
 * Analyzes user's assessment answers to determine knowledge level.
 * Calls POST /api/gemini/assess
 */
export async function apiAnalyzeAssessment(
  answers: AssessmentAnswer,
  countryCode: string,
  countryName: string,
): Promise<{ knowledgeLevel: KnowledgeLevel; recommendedStepCount: number; focusAreas: string[] }> {
  return geminiPost('assess', { answers, countryCode, countryName });
}

// ---------------------------------------------------------------------------
// Election Guide
// ---------------------------------------------------------------------------

/**
 * Generates a personalized election guide.
 * Calls POST /api/gemini/guide
 */
export async function apiGeneratePersonalizedGuide(
  countryCode: string,
  countryName: string,
  knowledgeLevel: KnowledgeLevel,
  focusAreas: string[],
  userConfusion: string,
  sessionId?: string,
  stepCount?: number,
): Promise<{ steps: ElectionStep[]; source: 'gemini' | 'cache' | 'fallback' }> {
  return geminiPost('guide', {
    countryCode, countryName, knowledgeLevel,
    focusAreas, userConfusion, sessionId, stepCount,
  });
}

/**
 * Generates a personalized election guide as a stream.
 */
export async function apiGeneratePersonalizedGuideStream(
  countryCode: string,
  countryName: string,
  knowledgeLevel: KnowledgeLevel,
  focusAreas: string[],
  userConfusion: string,
  onChunk: (text: string) => void,
  sessionId?: string,
  stepCount?: number,
): Promise<void> {
  const res = await fetch('/api/gemini/guide', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      countryCode, countryName, knowledgeLevel,
      focusAreas, userConfusion, sessionId, stepCount,
      stream: true,
    }),
  });

  if (!res.ok) {
    throw new Error(`Streaming request failed: ${res.status}`);
  }

  const reader = res.body?.getReader();
  const decoder = new TextDecoder();

  if (!reader) throw new Error('No reader available');

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    onChunk(decoder.decode(value, { stream: true }));
  }
}

// ---------------------------------------------------------------------------
// Micro-Quiz
// ---------------------------------------------------------------------------

/**
 * Generates a micro-quiz question for a specific learning step.
 * Calls POST /api/gemini/micro-quiz
 */
export async function apiGenerateMicroQuiz(
  step: ElectionStep,
  knowledgeLevel: KnowledgeLevel,
  sessionId?: string,
): Promise<MicroQuizQuestion> {
  return geminiPost('micro-quiz', { step, knowledgeLevel, sessionId });
}

// ---------------------------------------------------------------------------
// Final Quiz
// ---------------------------------------------------------------------------

/**
 * Generates a personalized final certification quiz.
 * Calls POST /api/gemini/quiz
 */
export async function apiGeneratePersonalizedQuiz(
  completedSteps: ElectionStep[],
  knowledgeLevel: KnowledgeLevel,
  countryCode: string,
  sessionId?: string,
): Promise<QuizQuestion[]> {
  return geminiPost('quiz', { completedSteps, knowledgeLevel, countryCode, sessionId });
}

// ---------------------------------------------------------------------------
// Performance Insight
// ---------------------------------------------------------------------------

/**
 * Generates a post-quiz performance insight.
 * Calls POST /api/gemini/insight
 */
export async function apiGeneratePerformanceInsight(
  results: QuizResult[],
  questions: QuizQuestion[],
  knowledgeLevel: KnowledgeLevel,
  countryCode: string,
  sessionId?: string,
): Promise<string> {
  const data = await geminiPost<{ insight: string }>(
    'insight',
    { results, questions, knowledgeLevel, countryCode, sessionId },
  );
  return data.insight;
}

// ---------------------------------------------------------------------------
// Re-Explain Concept
// ---------------------------------------------------------------------------

/**
 * Re-explains a concept after a user answers a micro-quiz incorrectly.
 * Calls POST /api/gemini/re-explain
 */
export async function apiReExplainConcept(
  step: ElectionStep,
  userAnswer: string,
  correctAnswer: string,
  knowledgeLevel: KnowledgeLevel,
  sessionId?: string,
): Promise<string> {
  const data = await geminiPost<{ explanation: string }>(
    're-explain',
    { step, userAnswer, correctAnswer, knowledgeLevel, sessionId },
  );
  return data.explanation;
}

// ---------------------------------------------------------------------------
// AI Assistant
// ---------------------------------------------------------------------------

/**
 * Sends a message to the hybrid AI assistant.
 * Calls POST /api/gemini/assistant
 */
export async function apiGetAssistantResponse(
  question: string,
  userContext: UserContext,
  completedSteps: ElectionStep[],
  chatHistory: ChatMessage[],
): Promise<{
  content: string;
  source: 'ai' | 'faq' | 'fallback' | 'error';
  officialSource?: { name: string; url: string };
  suggestedQuestions?: string[];
}> {
  return geminiPost('assistant', { question, userContext, completedSteps, chatHistory });
}
