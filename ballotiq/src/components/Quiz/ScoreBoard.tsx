/**
 * Quiz results scoreboard with shareable completion badge.
 * Shows score, performance message, and celebratory animation.
 */

import { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import type { QuizResult } from '@/types';
import KnowledgeMeter from '@/components/Assessment/KnowledgeMeter';
import type { KnowledgeLevel } from '@/types';
import TranslatedText from '@/components/ui/TranslatedText';
import { copyToClipboard } from '@/lib/utils/clipboard';

interface ScoreBoardProps {
  score: number;
  total: number;
  results: QuizResult[];
  knowledgeLevel: KnowledgeLevel;
  performanceInsight: string;
  countryName: string;
  onRetake?: () => void;
}

/** Results display with badge, score, and performance insight */
export default function ScoreBoard({
  score, total, results, knowledgeLevel,
  performanceInsight, countryName, onRetake,
}: ScoreBoardProps) {
  const percentage = Math.round((score / total) * 100);
  const isPassing = percentage >= 60;
  const isPerfect = percentage === 100;

  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isPerfect) {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#3b82f6', '#10b981', '#f59e0b', '#ffffff'],
      });
    }
  }, [isPerfect]);

  /** Copies a formatted result string to the clipboard. */
  const handleShare = async () => {
    const levelLabel = knowledgeLevel.charAt(0).toUpperCase() + knowledgeLevel.slice(1);
    const text =
      `🗳️ I just scored ${score}/${total} on BallotIQ's ${countryName} Election Knowledge Quiz!\n` +
      `Level: ${levelLabel} | ${percentage}% correct\n` +
      `Learn about your elections: https://ballotiq-61721852903.us-central1.run.app`;
    const success = await copyToClipboard(text);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const avgTime = results.length > 0
    ? Math.round(results.reduce((sum, r) => sum + r.timeTakenSeconds, 0) / results.length)
    : 0;

  return (
    <div className="text-center space-y-8 py-6">
      {/* Celebration emoji */}
      <div className="text-6xl animate-bounce" aria-hidden="true">
        {isPerfect ? '🏆' : isPassing ? '🎉' : '📖'}
      </div>

      {/* Score circle */}
      <div className="relative mx-auto w-32 h-32">
        <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="54" fill="none" stroke="currentColor" strokeWidth="8" className="text-white/10" />
          <circle cx="60" cy="60" r="54" fill="none" stroke="currentColor" strokeWidth="8"
            className={isPerfect ? 'text-amber-400' : isPassing ? 'text-emerald-400' : 'text-blue-400'}
            strokeDasharray={`${(percentage / 100) * 339.3} 339.3`}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-3xl font-bold ${isPerfect ? 'text-amber-400' : isPassing ? 'text-emerald-400' : 'text-blue-400'}`}>
            {score}/{total}
          </span>
          <span className="text-xs text-gray-500">{percentage}%</span>
        </div>
      </div>

      {/* Title */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">
          {isPerfect ? <TranslatedText text="Perfect Score!" /> : isPassing ? <TranslatedText text="Quiz Complete!" /> : <TranslatedText text="Keep Learning!" />}
        </h2>
        <p className="text-gray-400">
          <TranslatedText text={countryName} /> <TranslatedText text="Election Knowledge Assessment" />
        </p>
        <div className="mt-3 flex justify-center">
          <KnowledgeMeter level={knowledgeLevel} />
        </div>
      </div>

      {/* Stats */}
      <div className="flex justify-center gap-6">
        <div className="text-center">
          <p className="text-2xl font-bold text-amber-300">{avgTime}s</p>
          <p className="text-xs text-gray-500"><TranslatedText text="Avg. time per question" /></p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-emerald-400">{score}</p>
          <p className="text-xs text-gray-500"><TranslatedText text="Correct answers" /></p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-red-400">{total - score}</p>
          <p className="text-xs text-gray-500"><TranslatedText text="Incorrect" /></p>
        </div>
      </div>

      {/* Performance insight from Gemini */}
      {performanceInsight && (
        <div className="max-w-lg mx-auto p-8 bg-white/[0.03] border border-white/5 backdrop-blur-xl rounded-[2rem] shadow-2xl">
          <p className="text-[15px] text-gray-300 leading-relaxed italic">
            &ldquo;<TranslatedText text={performanceInsight} />&rdquo;
          </p>
        </div>
      )}

      {/* Shareable badge + clipboard button */}
      {isPassing && (
        <div className="flex flex-col items-center gap-4">
          <div className="inline-block p-1 rounded-[2.5rem] bg-gradient-to-b from-emerald-500/20 to-transparent">
            <div className="p-8 bg-[#081508] border border-emerald-500/10 rounded-[2.25rem] shadow-2xl">
              <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-[0.2em] mb-2"><TranslatedText text="Certificate of Completion" /></p>
              <p className="text-2xl font-black text-white mb-1">🗳️ <TranslatedText text="BallotIQ Certified" /></p>
              <p className="text-sm text-emerald-400/60 font-medium">
                <TranslatedText text={countryName} /> <TranslatedText text="Election Process" /> • {percentage}%
              </p>
            </div>
          </div>

          {/* Clipboard share button */}
          <button
            id="share-result-btn"
            onClick={handleShare}
            aria-label="Copy result to clipboard"
            className={
              `inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-semibold text-sm
              border transition-all duration-300 active:scale-95 shadow-lg
              ${
                copied
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                  : 'bg-white/5 border-white/10 text-white hover:bg-white/10 hover:scale-105'
              }`
            }
          >
            {copied ? (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <TranslatedText text="Copied!" />
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                  <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                </svg>
                <TranslatedText text="Share Result" />
              </>
            )}
          </button>
        </div>
      )}

      {onRetake && (
        <div className="pt-4">
          <button
            onClick={onRetake}
            className="px-10 py-4 bg-white/5 border border-white/10 text-white font-bold rounded-2xl hover:bg-white/10 hover:scale-105 transition-all duration-300 active:scale-95 shadow-xl"
            aria-label="Retake the quiz"
          >
            <TranslatedText text="Retake Quiz" />
          </button>
        </div>
      )}
    </div>
  );
}
