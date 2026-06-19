'use client';

/**
 * Hook for persisting and restoring user learning progress.
 * Uses localStorage for sessionId and Firestore for sync.
 */

import { useState, useEffect, useCallback } from 'react';
import type { KnowledgeLevel, SupportedLanguage, UserProgress } from '@/types';
import { saveProgress, getProgress } from '@/lib/firebase/firestore';
import { authReady, getFirebaseAuth } from '@/lib/firebase/client';
import { offlineDB, STORES } from '@/lib/offline/db';

/** localStorage key for session ID */
const SESSION_KEY = 'ballotiq_session_id';

/**
 * Generates a simple UUID v4.
 * @returns Random UUID string
 */
function generateSessionId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

interface UseProgressReturn {
  progress: UserProgress | null;
  sessionId: string;
  completeStep: (stepId: string) => void;
  completedSteps: string[];
  isStepComplete: (stepId: string) => boolean;
  saveMicroQuizResult: (stepId: string, correct: boolean) => void;
  saveQuizScore: (score: number) => void;
  updateLanguage: (lang: SupportedLanguage) => void;
  resetProgress: () => void;
}

/**
 * Manages user learning progress with persistence.
 * @param countryCode - Current country being studied
 * @param knowledgeLevel - User's knowledge level
 * @returns Progress state and mutation functions
 */
export function useProgress(
  countryCode: string,
  knowledgeLevel: KnowledgeLevel
): UseProgressReturn {
  const [sessionId, setSessionId] = useState<string>('');

  useEffect(() => {
    async function initSession() {
      if (typeof window === 'undefined') return;

      // Wait for Firebase Auth to be ready
      await authReady;
      const auth = getFirebaseAuth();
      const uid = auth?.currentUser?.uid;

      if (uid) {
        setSessionId(uid);
        // Sync the old session ID to the new UID if needed? 
        // For now, let's just use UID as it's the most stable.
        localStorage.setItem(SESSION_KEY, uid);
      } else {
        const stored = localStorage.getItem(SESSION_KEY);
        if (stored) {
          setSessionId(stored);
        } else {
          const newId = generateSessionId();
          localStorage.setItem(SESSION_KEY, newId);
          setSessionId(newId);
        }
      }
    }
    initSession();
  }, []);

  const [progress, setProgress] = useState<UserProgress | null>(null);

  // Restore progress on mount
  useEffect(() => {
    async function restore() {
      if (!sessionId) return;

      /**
       * Applies saved progress, performing a soft knowledgeLevel migration if needed.
       * The knowledgeLevel check is intentionally NOT a hard gate — discarding saved
       * progress on a level mismatch would cause silent data loss (see issue #87).
       * Instead we restore completedSteps and all other fields, then update the level
       * to the current session value so future saves reflect the correct level.
       */
      function applyRestored(saved: UserProgress): UserProgress {
        if (saved.knowledgeLevel !== knowledgeLevel) {
          console.warn(
            `[useProgress] knowledgeLevel mismatch: stored="${saved.knowledgeLevel}" current="${knowledgeLevel}". ` +
            'Restoring progress and migrating to current level.'
          );
          return { ...saved, knowledgeLevel };
        }
        return saved;
      }

      // 1. Try Offline DB first for immediate response
      try {
        const localSaved = await offlineDB.get<UserProgress>(STORES.PROGRESS, sessionId);
        // Guard on countryCode only — knowledgeLevel mismatch is handled via soft migration
        if (localSaved && localSaved.countryCode === countryCode) {
          setProgress(applyRestored(localSaved));
        }
      } catch { /* ignore */ }

      // 2. Sync with Firestore
      try {
        await authReady;
        const saved = await getProgress(sessionId);
        // Guard on countryCode only — knowledgeLevel mismatch is handled via soft migration
        if (saved && saved.countryCode === countryCode) {
          // Firestore is the source of truth; apply soft migration if needed
          const migrated = applyRestored(saved);
          setProgress(migrated);
          offlineDB.set(STORES.PROGRESS, sessionId, migrated).catch(() => {});
        } else if (!progress) {
          const initial: UserProgress = {
            sessionId, countryCode, completedSteps: [],
            microQuizResults: {}, knowledgeLevel,
            language: 'en', adaptationActive: false,
            lastUpdated: new Date().toISOString(),
          };
          setProgress(initial);
        }
      } catch {
        if (!progress) {
          setProgress({
            sessionId, countryCode, completedSteps: [],
            microQuizResults: {}, knowledgeLevel,
            language: 'en', adaptationActive: false,
            lastUpdated: new Date().toISOString(),
          });
        }
      }
    }
    if (!sessionId) return;
    restore();
  }, [sessionId, countryCode, knowledgeLevel, progress]);

  const persist = useCallback(async (updated: UserProgress) => {
    setProgress(updated);
    // Always save to Offline DB
    try {
      await offlineDB.set(STORES.PROGRESS, sessionId, updated);
    } catch { /* ignore */ }

    // Try to sync to Firestore
    try { 
      await authReady;
      await saveProgress(updated); 
    } catch { /* non-critical */ }
  }, [sessionId]);

  /** Marks a step as finished and persists the updated progress. */
  const completeStep = useCallback((stepId: string) => {
    if (!progress) return;
    if (progress.completedSteps.includes(stepId)) return;
    const updated: UserProgress = {
      ...progress,
      completedSteps: [...progress.completedSteps, stepId],
      lastUpdated: new Date().toISOString(),
    };
    persist(updated);
  }, [progress, persist]);

  /** Saves the outcome of a post-step micro-quiz. */
  const saveMicroQuizResult = useCallback((stepId: string, correct: boolean) => {
    if (!progress) return;
    const updated: UserProgress = {
      ...progress,
      microQuizResults: { ...progress.microQuizResults, [stepId]: correct },
      lastUpdated: new Date().toISOString(),
    };
    persist(updated);
  }, [progress, persist]);

  /** Persists the final score from the certification quiz. */
  const saveQuizScore = useCallback((score: number) => {
    if (!progress) return;
    persist({ ...progress, quizScore: score, lastUpdated: new Date().toISOString() });
  }, [progress, persist]);

  /** Updates the user's preferred language in the stored progress profile. */
  const updateLanguage = useCallback((lang: SupportedLanguage) => {
    if (!progress) return;
    persist({ ...progress, language: lang, lastUpdated: new Date().toISOString() });
  }, [progress, persist]);

  /** Clears all learning data and reverts the session to an initial state. */
  const resetProgress = useCallback(() => {
    const initial: UserProgress = {
      sessionId, countryCode, completedSteps: [],
      microQuizResults: {}, knowledgeLevel,
      language: 'en', adaptationActive: false,
      lastUpdated: new Date().toISOString(),
    };
    persist(initial);
  }, [sessionId, countryCode, knowledgeLevel, persist]);

  return {
    progress, sessionId,
    completeStep,
    completedSteps: progress?.completedSteps ?? [],
    isStepComplete: (stepId: string) => progress?.completedSteps.includes(stepId) ?? false,
    saveMicroQuizResult, saveQuizScore, updateLanguage, resetProgress,
  };
}
