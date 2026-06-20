'use client';

/**
 * Context-aware AI chat window.
 * Passes full user context to Gemini for personalized responses.
 */

import { useState, useRef, useEffect } from 'react';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import type { ChatMessage as ChatMessageType, ElectionStep, UserContext } from '@/types';
import { apiGetAssistantResponse } from '@/lib/gemini/api';
import { saveChatMessage, getChatHistory, saveConversationMetadata } from '@/lib/firebase/firestore';
import { logAssistantQuestion } from '@/lib/firebase/analytics';
import { sanitizeUserInput } from '@/lib/security/sanitize';
import { useSTT } from '@/hooks/useSTT';
import { getLanguageInfo } from '@/lib/constants/languages';
import { authReady, getFirebaseAuth } from '@/lib/firebase/client';
import TranslatedText from '@/components/ui/TranslatedText';
import AIStatusBadge from '@/components/ui/AIStatusBadge';
import ChatMessage from './ChatMessage';
import ChatTypingIndicator from './ChatTypingIndicator';
import ChatInput from './ChatInput';
import ChatEmptyState from './ChatEmptyState';
import ChatStatusBar from './ChatStatusBar';

interface ChatWindowProps {
  userContext: UserContext;
  completedSteps: ElectionStep[];
  isSpeaking: boolean;
  currentSpokenText: string | null;
  onSpeak: (text: string) => void;
  onAiStatusChange?: (active: boolean) => void;
  onConversationUpdated?: () => void;
}

function generateTitle(message: string): string {
  let clean = message.trim();
  clean = clean.replace(/[?.,!]+$/, '');
  if (clean.length > 30) {
    const spaceIndex = clean.lastIndexOf(' ', 30);
    if (spaceIndex > 15) {
      return clean.substring(0, spaceIndex) + '...';
    }
    return clean.substring(0, 27) + '...';
  }
  return clean || 'New Conversation';
}

/** Full-featured chat interface with context-aware AI responses */
export default function ChatWindow({
  userContext, completedSteps, isSpeaking, currentSpokenText, onSpeak, onAiStatusChange, onConversationUpdated,
}: ChatWindowProps) {
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<ChatMessageType[]>([]);
  messagesRef.current = messages;
  // Tracks whether conversation metadata has already been saved for this session.
  // Using a ref (not state) so the flag is visible synchronously across concurrent
  // sendMessage calls, preventing duplicate sidebar entries when the user sends
  // messages rapidly before the first setMessages re-render propagates.
  const metadataSavedRef = useRef<boolean>(false);
  
  const langInfo = getLanguageInfo(userContext.language);
  const { isListening, error: sttError, startListening, stopListening } = useSTT(
    langInfo?.googleTTSCode ?? 'en-US',
    (finalText) => {
      // Final STT transcript arrives asynchronously; send it as a chat message.
      void sendMessage(finalText, true);
    },
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    let active = true;
    async function loadHistory() {
      if (!userContext.sessionId) return;
      setIsHistoryLoading(true);
      const history = await getChatHistory(userContext.sessionId);
      if (active) {
        setMessages(history);
        setShowSuggestions(history.length === 0);
        // If the session already has history, metadata was previously saved.
        if (history.length > 0) metadataSavedRef.current = true;
        setIsHistoryLoading(false);
      }
    }
    loadHistory();
    return () => {
      active = false;
    };
  }, [userContext.sessionId]);

  async function sendMessage(text: string, fromVoice: boolean = false) {
    const sanitized = sanitizeUserInput(text);
    if (!sanitized.trim() || isLoading) return;

    setShowSuggestions(false);
    const userMsg: ChatMessageType = {
      id: `msg_${Date.now()}_user`,
      role: 'user',
      content: sanitized,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      await saveChatMessage(userContext.sessionId, userMsg);
      await logAssistantQuestion(userContext.countryCode, userContext.knowledgeLevel);

      // Save conversation metadata only once per session (first message).
      // We use a ref instead of checking messages.length to avoid a stale-closure
      // race where two rapid sends both read messages.length === 0 before the
      // first setMessages re-render propagates, which would create duplicate entries.
      if (!metadataSavedRef.current) {
        metadataSavedRef.current = true; // set synchronously before any await
        const title = generateTitle(sanitized);
        
        // Determine userId (prefer Firebase UID)
        await authReady;
        const auth = getFirebaseAuth();
        const userId = auth?.currentUser?.uid || (typeof window !== 'undefined' ? localStorage.getItem('ballotiq_session_id') || userContext.sessionId : userContext.sessionId);
        
        const metadata = {
          id: userContext.sessionId,
          userId,
          title,
          countryCode: userContext.countryCode,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await saveConversationMetadata(metadata);
        onConversationUpdated?.();
      }

      const result = await apiGetAssistantResponse(
        sanitized,
        userContext,
        completedSteps,
        [...messagesRef.current, userMsg],
      );
      const response = result.content;

      // Detect AI failure responses
      onAiStatusChange?.(result.source !== 'error');

      const assistantMsg: ChatMessageType = {
        id: `msg_${Date.now()}_assistant`,
        role: 'assistant',
        content: response,
        timestamp: new Date().toISOString(),
        officialSource: result.officialSource,
      };

      setMessages((prev) => [...prev, assistantMsg]);
      await saveChatMessage(userContext.sessionId, assistantMsg);

      // Auto-speak if the user initiated with voice
      if (fromVoice) {
        onSpeak(response);
      }
    } catch {
      onAiStatusChange?.(false);
      const errorMsg: ChatMessageType = {
        id: `msg_${Date.now()}_error`,
        role: 'assistant',
        content: 'Something went wrong. Please try again.',
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <ErrorBoundary componentName="ChatWindow">
      <div className="flex flex-col min-h-0 h-full rounded-none md:rounded-[1.75rem] border-y border-x-0 md:border border-gray-200 dark:border-white/10 bg-white/60 dark:bg-white/[0.02] backdrop-blur-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-4 sm:px-5 py-3 border-b border-gray-200 dark:border-white/10 flex items-center justify-between gap-3 bg-gray-50/50 dark:bg-transparent">
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate font-medium">
            <TranslatedText text="Personalized for" /> {userContext.countryName} • <TranslatedText text={userContext.knowledgeLevel} /> <TranslatedText text="level" />
          </p>
          <AIStatusBadge mode={isLoading ? 'live' : 'cached'} />
        </div>

        {/* Messages */}
        <div 
          className="chat-messages-container flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-gradient-to-b from-transparent to-gray-100/30 dark:to-[#030712]/40"
          role="log"
          aria-live="polite"
          aria-label="Conversation"
        >
          {isHistoryLoading ? (
            <div className="flex flex-col items-center justify-center h-full py-20">
              <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-gray-500 mt-2">Loading conversation history...</p>
            </div>
          ) : (
            <>
              {messages.length === 0 && (
                <ChatEmptyState
                  countryName={userContext.countryName}
                  mainConfusion={userContext.mainConfusion}
                  showSuggestions={showSuggestions}
                  onSelect={sendMessage}
                />
              )}

              {messages.map((msg) => (
                <ChatMessage
                  key={msg.id}
                  message={msg}
                  userContext={userContext}
                  isSpeaking={isSpeaking}
                  currentSpokenText={currentSpokenText}
                  onSpeak={onSpeak}
                />
              ))}

              {isLoading && <ChatTypingIndicator />}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        <ChatStatusBar />

        <ChatInput
          input={input}
          setInput={setInput}
          isListening={isListening}
          isLoading={isLoading}
          sttError={sttError}
          onSendMessage={sendMessage}
          onStartListening={startListening}
          onStopListening={stopListening}
          onKeyDown={handleKeyDown}
        />
      </div>
    </ErrorBoundary>
  );
}
