'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, BookOpen, CheckCircle, XCircle, Trophy, BarChart2, RotateCcw } from 'lucide-react';
import type { UserContext } from '@/types';
import { useProgress } from '@/hooks/useProgress';
import { getFallbackGuide } from '@/lib/gemini/fallback';
import TranslatedText from '@/components/ui/TranslatedText';
import LanguageSelector from '@/components/ui/LanguageSelector';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';
import BottomNav from '@/components/ui/BottomNav';

export default function ProgressPage() {
  const router = useRouter();

  const [userContext] = useState<UserContext | null>(() => {
    if (typeof window === 'undefined') return null;
    const stored = sessionStorage.getItem('ballotiq_context');
    return stored ? (JSON.parse(stored) as UserContext) : null;
  });

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { progress, completedSteps, resetProgress } = useProgress(
    userContext?.countryCode || 'IN',
    userContext?.knowledgeLevel || 'beginner'
  );

  const guide = useMemo(() => {
    if (!userContext) return [];
    return getFallbackGuide(userContext.countryCode, userContext.knowledgeLevel) || [];
  }, [userContext]);

  const totalSteps = guide.length;
  const completedCount = completedSteps.length;
  const completionPercent = totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0;

  const microQuizResults = progress?.microQuizResults || {};
  const quizScore = progress?.quizScore;
  const microCorrect = Object.values(microQuizResults).filter(Boolean).length;
  const microTotal = Object.keys(microQuizResults).length;

  if (!mounted || !userContext) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-blue-950 to-gray-950 p-8 flex flex-col items-center justify-center">
        <LoadingSkeleton lines={10} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-blue-950 to-gray-950 text-gray-200 overflow-x-hidden">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-gray-950/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-4xl mx-auto px-4 h-16 sm:h-20 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-2.5 rounded-2xl bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-all group"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            </button>
            <h1 className="text-base sm:text-lg font-black text-white tracking-tight">
              <TranslatedText text="Your Progress" />
            </h1>
          </div>
          <LanguageSelector />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">

        {/* Overall Completion Card */}
        <div className="rounded-3xl bg-white/5 border border-white/10 p-6">
          <div className="flex items-center gap-3 mb-4">
            <BarChart2 className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-bold text-white">
              <TranslatedText text="Overall Completion" />
            </h2>
          </div>
          <div className="flex items-end justify-between mb-3">
            <span className="text-4xl font-black text-white">{completionPercent}%</span>
            <span className="text-sm text-gray-400">{completedCount} / {totalSteps} <TranslatedText text="steps" /></span>
          </div>
          <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-700"
              style={{ width: `${completionPercent}%` }}
            />
          </div>
          <p className="mt-3 text-sm text-gray-400">
            {userContext.countryName} · <TranslatedText text={userContext.knowledgeLevel} />
          </p>
        </div>

        {/* Quiz Score Card */}
        <div className="rounded-3xl bg-white/5 border border-white/10 p-6">
          <div className="flex items-center gap-3 mb-4">
            <Trophy className="w-5 h-5 text-yellow-400" />
            <h2 className="text-lg font-bold text-white">
              <TranslatedText text="Quiz Performance" />
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-2xl bg-white/5 p-4 text-center">
              <p className="text-3xl font-black text-white">
                {quizScore !== undefined ? `${quizScore}%` : '—'}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                <TranslatedText text="Final Quiz Score" />
              </p>
            </div>
            <div className="rounded-2xl bg-white/5 p-4 text-center">
              <p className="text-3xl font-black text-white">
                {microTotal > 0 ? `${microCorrect}/${microTotal}` : '—'}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                <TranslatedText text="Micro-quiz Correct" />
              </p>
            </div>
          </div>
        </div>

        {/* Learning Steps */}
        <div className="rounded-3xl bg-white/5 border border-white/10 p-6">
          <div className="flex items-center gap-3 mb-4">
            <BookOpen className="w-5 h-5 text-green-400" />
            <h2 className="text-lg font-bold text-white">
              <TranslatedText text="Learning Steps" />
            </h2>
          </div>
          <div className="space-y-3">
            {guide.map((step, i) => {
              const done = completedSteps.includes(step.id);
              const microResult = microQuizResults[step.id];
              return (
                <div
                  key={step.id}
                  className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${
                    done
                      ? 'bg-green-500/10 border-green-500/30'
                      : 'bg-white/5 border-white/10'
                  }`}
                >
                  <span className="text-xs font-bold text-gray-500 w-6 text-center">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold truncate ${done ? 'text-white' : 'text-gray-400'}`}>
                      {step.title}
                    </p>
                    {microResult !== undefined && (
                      <p className="text-xs mt-0.5 flex items-center gap-1">
                        {microResult
                          ? <><CheckCircle className="w-3 h-3 text-green-400" /><span className="text-green-400">Quiz passed</span></>
                          : <><XCircle className="w-3 h-3 text-red-400" /><span className="text-red-400">Quiz failed</span></>
                        }
                      </p>
                    )}
                  </div>
                  {done
                    ? <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                    : <div className="w-5 h-5 rounded-full border-2 border-white/20 flex-shrink-0" />
                  }
                </div>
              );
            })}
            {guide.length === 0 && (
              <p className="text-gray-500 text-sm text-center py-4">
                <TranslatedText text="No learning steps found." />
              </p>
            )}
          </div>
        </div>

        {/* Reset Button */}
        <button
          onClick={() => { resetProgress(); router.push('/'); }}
          className="w-full py-4 rounded-2xl border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-all flex items-center justify-center gap-2 text-sm font-bold"
        >
          <RotateCcw className="w-4 h-4" />
          <TranslatedText text="Reset My Progress" />
        </button>

      </main>

      <BottomNav activeTab="progress" countryCode={userContext.countryCode} />
    </div>
  );
}