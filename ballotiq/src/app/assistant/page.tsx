'use client';

/**
 * AI Assistant page — context-aware election Q&A.
 * Full page chat with user context from assessment and learning.
 */

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Menu } from 'lucide-react';
import Image from 'next/image';
import type { UserContext, ElectionStep, ConversationMetadata } from '@/types';
import { useTTS } from '@/hooks/useTTS';
import { useProgress } from '@/hooks/useProgress';
import { getFallbackGuide } from '@/lib/gemini/fallback';
import ChatWindow from '@/components/Assistant/ChatWindow';
import KnowledgeMeter from '@/components/Assessment/KnowledgeMeter';
import LanguageSelector from '@/components/ui/LanguageSelector';
import ThemeToggle from '@/components/ui/ThemeToggle';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import TranslatedText from '@/components/ui/TranslatedText';
import { getCountryByCode } from '@/lib/constants/countries';
import BottomNav from '@/components/ui/BottomNav';
import ChatSidebar from '@/components/Assistant/ChatSidebar';
import {
  getUserConversations,
  deleteConversation,
  renameConversation,
  getUserContext,
  saveUserContext,
  saveConversationMetadata
} from '@/lib/firebase/firestore';
import { generateUUID } from '@/lib/utils';
import { authReady, getFirebaseAuth } from '@/lib/firebase/client';

/** Full-page AI assistant with context-aware responses */
export default function AssistantPage() {
  const router = useRouter();
  const [userContext, setUserContext] = useState<UserContext | null>(null);
  const [mounted, setMounted] = useState(false);
  const [conversations, setConversations] = useState<ConversationMetadata[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userId, setUserId] = useState<string>('');

  useEffect(() => {
    async function initUser() {
      if (typeof window === 'undefined') return;
      
      await authReady;
      const auth = getFirebaseAuth();
      const uid = auth?.currentUser?.uid;
      
      if (uid) {
        setUserId(uid);
      } else {
        const storedUserId = localStorage.getItem('ballotiq_session_id') || '';
        setUserId(storedUserId);
      }
    }
    initUser();
  }, []);

  const loadConversations = useCallback(async () => {
    if (!userId) return;
    const list = await getUserConversations(userId);
    setConversations(list);
  }, [userId]);

  useEffect(() => {
    loadConversations();
  }, [userId, loadConversations]);

  useEffect(() => {
    const stored = sessionStorage.getItem('ballotiq_context');
    if (!stored) {
      router.push('/');
      return;
    }

    const ctx = JSON.parse(stored) as UserContext;
    if (!ctx.electionBody || !ctx.electionBodyUrl) {
      const countryData = getCountryByCode(ctx.countryCode);
      if (countryData) {
        ctx.electionBody = countryData.electionBody;
        ctx.electionBodyUrl = countryData.electionBodyUrl;
        sessionStorage.setItem('ballotiq_context', JSON.stringify(ctx));
      }
    }
    setUserContext(ctx);
    setMounted(true);
  }, [router]);

  const completedSteps = useMemo<ElectionStep[]>(() => {
    if (!userContext) return [];
    return getFallbackGuide(userContext.countryCode, userContext.knowledgeLevel) ?? [];
  }, [userContext]);

  // Persist language preference to Firestore when user changes it on this page.
  // useProgress is safe to call unconditionally; it no-ops until userContext is loaded.
  const { updateLanguage } = useProgress(
    userContext?.countryCode ?? '',
    userContext?.knowledgeLevel ?? 'beginner'
  );

  const isOpenChat = userContext?.mainConfusion === 'Direct query';

  const { isSpeaking, currentText, toggle: toggleTTS } = useTTS(
    userContext?.sessionId ?? ''
  );

  const handleNewChat = async () => {
    if (!userContext || !userId) return;
    const newSessionId = generateUUID();
    const newContext: UserContext = {
      ...userContext,
      sessionId: newSessionId,
      consecutiveErrors: 0,
      adaptationActive: false,
    };
    sessionStorage.setItem('ballotiq_context', JSON.stringify(newContext));
    setUserContext(newContext);
    await saveUserContext(newContext);

    const newConv: ConversationMetadata = {
      id: newSessionId,
      userId,
      title: 'New Conversation',
      countryCode: userContext.countryCode,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await saveConversationMetadata(newConv);
    setConversations((prev) => [newConv, ...prev]);
    setSidebarOpen(false);
  };

  const handleSelectConversation = async (id: string) => {
    const restoredContext = await getUserContext(id);
    if (restoredContext) {
      sessionStorage.setItem('ballotiq_context', JSON.stringify(restoredContext));
      setUserContext(restoredContext);
    } else {
      if (userContext) {
        const fallbackContext = { ...userContext, sessionId: id };
        sessionStorage.setItem('ballotiq_context', JSON.stringify(fallbackContext));
        setUserContext(fallbackContext);
      }
    }
  };

  const handleDeleteConversation = async (id: string) => {
    await deleteConversation(id);
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (userContext?.sessionId === id) {
      const remaining = conversations.filter((c) => c.id !== id);
      if (remaining.length > 0) {
        await handleSelectConversation(remaining[0].id);
      } else {
        await handleNewChat();
      }
    }
  };

  const handleRenameConversation = async (id: string, newTitle: string) => {
    await renameConversation(id, newTitle);
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title: newTitle, updatedAt: new Date().toISOString() } : c))
    );
  };

  if (!mounted || !userContext) return null;

  const countryInfo = getCountryByCode(userContext.countryCode);

  return (
    <div className="h-[100dvh] flex flex-col bg-gradient-to-br from-gray-950 via-blue-950 to-gray-950 text-gray-200 selection:bg-blue-500/30 overflow-hidden">
      {/* Header */}
      <header className="sticky top-0 z-50 flex-shrink-0 bg-white/90 dark:bg-gray-950/80 backdrop-blur-xl border-b border-gray-200 dark:border-white/5 shadow-sm dark:shadow-2xl">
        <div className="max-w-[1600px] mx-auto px-4 h-16 sm:h-20 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <button
              onClick={() => router.back()}
              className="p-2.5 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-all group shadow-sm flex-shrink-0"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            </button>

            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2.5 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-all shadow-sm flex-shrink-0 md:hidden"
              aria-label="Toggle history"
            >
              <Menu className="w-5 h-5" />
            </button>

            <h1 className="text-sm sm:text-lg font-black text-gray-900 dark:text-white tracking-tight leading-none whitespace-nowrap hidden xs:block">
              <TranslatedText text="Assistant" />
            </h1>

            <div className="flex items-center gap-3 min-w-0">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 shadow-inner">
                <Image
                  src={`https://flagcdn.com/w80/${userContext.countryCode.toLowerCase()}.png`}
                  alt={`Flag of ${userContext.countryName}`}
                  width={80}
                  height={50}
                  unoptimized
                  className="w-5 h-3.5 object-cover rounded-sm"
                />
                <span className="text-sm font-bold text-gray-900 dark:text-white tracking-tight leading-none whitespace-nowrap truncate max-w-[80px] sm:max-w-none">
                  <TranslatedText text={userContext.countryName} />
                </span>
              </div>
              {!isOpenChat && (
                <div className="hidden sm:block">
                  <KnowledgeMeter level={userContext.knowledgeLevel} />
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="hidden md:flex items-center gap-2 text-xs font-medium text-blue-600 dark:text-blue-400/80">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              <TranslatedText text="BallotIQ AI Active" />
            </div>
            <ThemeToggle />
            <LanguageSelector onLanguageChange={updateLanguage} />
          </div>
        </div>
      </header>

      {/* Disclaimer */}
      <div className="flex-shrink-0 px-3 sm:px-4 py-1.5 sm:py-2 bg-amber-500/5 border-b border-amber-500/15">
        <p className="text-[10px] sm:text-[11px] text-amber-800 dark:text-amber-400/80 text-center max-w-2xl mx-auto leading-snug">
          <TranslatedText text="BallotIQ provides educational information only. For official guidance, visit" />{' '}
          <a
            href={countryInfo?.electionBodyUrl || `https://www.google.com/search?q=${userContext.countryName}+election+commission`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-amber-600 dark:hover:text-amber-300 font-bold"
          >
            <TranslatedText text={countryInfo?.electionBody || "your official election body"} />
          </a>.
        </p>
      </div>

      {/* Main Section containing Chat Sidebar and Active Chat */}
      <div className="flex-1 flex overflow-hidden w-full max-w-[1600px] mx-auto pb-[60px] md:pb-0">
        <ChatSidebar
          isOpen={sidebarOpen}
          setIsOpen={setSidebarOpen}
          conversations={conversations}
          activeConversationId={userContext.sessionId}
          onSelectConversation={handleSelectConversation}
          onDeleteConversation={handleDeleteConversation}
          onRenameConversation={handleRenameConversation}
          onNewChat={handleNewChat}
        />

        <div className="flex-1 overflow-hidden px-0 md:px-6 py-4 flex flex-col h-full">
          <ErrorBoundary componentName="AssistantPage">
            <ChatWindow
              userContext={userContext}
              completedSteps={completedSteps}
              isSpeaking={isSpeaking}
              currentSpokenText={currentText}
              onSpeak={toggleTTS}
              onConversationUpdated={loadConversations}
            />
          </ErrorBoundary>
        </div>
      </div>

      {/* BottomNav only on mobile — fixed at bottom */}
      <BottomNav activeTab="assistant" countryCode={userContext.countryCode} />
    </div>
  );
}
