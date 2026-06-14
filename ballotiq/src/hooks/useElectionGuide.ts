'use client';

/**
 * Hook for fetching adaptive election content with three-tier fallback.
 * Optimized for <1s initial load by serving fallback content immediately.
 */

import { useState, useEffect, useRef } from 'react';
import type { ElectionStep, LearningSource, UserContext } from '@/types';
import { apiGeneratePersonalizedGuideStream } from '@/lib/gemini/api';
import { getFallbackGuide } from '@/lib/gemini/fallback';
import { isElectionStepsArray } from '@/lib/gemini/validator';

interface UseElectionGuideReturn {
  steps: ElectionStep[];
  loading: boolean;
  error: string | null;
  source: LearningSource;
  personalizedFor: string;
}

/**
 * Fetches and manages the personalized election guide.
 */
export function useElectionGuide(
  countryCode: string,
  userContext: UserContext | null,
): UseElectionGuideReturn {
  const [steps, setSteps] = useState<ElectionStep[]>(() => {
    if (!countryCode || !userContext) return [];
    const initialFallback = getFallbackGuide(countryCode, userContext.knowledgeLevel);
    return initialFallback?.map((s, i) => ({
      ...s,
      status: i === 0 ? 'current' as const : 'locked' as const,
    })) ?? [];
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<LearningSource>(() => {
    return (countryCode && userContext) ? 'fallback' : 'fallback';
  });
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (countryCode && userContext && steps.length === 0 && source === 'fallback') {
      const fallback = getFallbackGuide(countryCode, userContext.knowledgeLevel);
      if (fallback) {
        setSteps(fallback.map((s, i) => ({
          ...s,
          status: i === 0 ? 'current' as const : 'locked' as const,
        })));
      }
    }
  }, [countryCode, userContext, steps.length, source]);

  useEffect(() => {
    if (!userContext || !countryCode || fetchedRef.current) return;
    
    fetchedRef.current = true;

    let didTimeout = false;
    let accumulated = '';

    async function loadGuide() {
      setLoading(true);
      setError(null);

      // 800ms timeout for initial load to guarantee <1s display
      const timeoutId = setTimeout(() => {
        if (!didTimeout) {
          didTimeout = true;
          console.info('[ElectionGuide] Fast-rendering fallback while AI generates in background...');
          setLoading(false);
        }
      }, 800);

      try {
        await apiGeneratePersonalizedGuideStream(
          countryCode,
          userContext!.countryName,
          userContext!.knowledgeLevel,
          [userContext!.mainConfusion || 'general election process'],
          userContext!.mainConfusion || '',
          (chunk) => {
            accumulated += chunk;
            
            // Try to parse the accumulated JSON array
            // We use a simple strategy: try to find the last complete object in the array
            try {
              let textToParse = accumulated.trim();
              if (!textToParse.endsWith(']')) {
                // Try to close the array if it's not closed
                textToParse = textToParse.replace(/,?\s*$/, '') + ']';
                if (!textToParse.startsWith('[')) {
                   // If it doesn't start with [, it might be starting with markdown fence or just raw content
                   const startIdx = textToParse.indexOf('[');
                   if (startIdx !== -1) textToParse = textToParse.substring(startIdx);
                }
              }

              const parsed = JSON.parse(textToParse);
              if (isElectionStepsArray(parsed)) {
                setSteps(parsed.map((s, i) => ({
                  ...s,
                  status: i === 0 ? 'current' as const : 'locked' as const,
                })));
                setSource('gemini');
                // If we have at least one step, we can stop the loading pulse
                if (parsed.length > 0) setLoading(false);
              }
            } catch {
              // Ignore partial parse errors
            }
          },
          userContext!.sessionId,
          userContext!.recommendedStepCount,
        );

        clearTimeout(timeoutId);
      } catch (err) {
        if (didTimeout) return;
        clearTimeout(timeoutId);
        console.error('[ElectionGuide] AI fetch failed, using already loaded fallback:', err);
      } finally {
        if (!didTimeout) setLoading(false);
      }
    }

    loadGuide();
  }, [countryCode, userContext]);

  return {
    steps,
    loading,
    error,
    source,
    personalizedFor: userContext?.knowledgeLevel ?? 'beginner',
  };
}
