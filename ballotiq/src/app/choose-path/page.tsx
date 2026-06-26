'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, MessageSquare, Map, Mic } from 'lucide-react';
import Image from 'next/image';
import TranslatedText from '@/components/ui/TranslatedText';
import LanguageSelector from '@/components/ui/LanguageSelector';
import ThemeToggle from '@/components/ui/ThemeToggle';
import type { Country, UserContext } from '@/types';
import { captureEvent } from '@/lib/posthog/helper';
import { EVENTS } from '@/lib/posthog/events';

/**
 * Formats an ISO date string to a human-readable relative time representation.
 * Handles try-catch internally to gracefully handle invalid/missing dates.
 */
function relativeTime(isoString: string): string {
  try {
    const time = new Date(isoString).getTime();
    if (isNaN(time)) return '';
    const diff = Date.now() - time;
    const days = Math.floor(diff / 86400000);
    if (days < 0) return 'Today';
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    return `${days} days ago`;
  } catch (error) {
    return '';
  }
}

/**
 * Path selection page — shown after country selection.
 * Allows users to choose between Guided Learning and Open Chat.
 */
export default function ChoosePathPage() {
  const router = useRouter();
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [lastVisited, setLastVisited] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('ballotiq_country');
      if (stored) {
        setSelectedCountry(JSON.parse(stored) as Country);
      } else {
        router.push('/');
      }
    }
  }, [router]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      let lastUpdated: string | null = null;

      // 1. Try reading from localStorage key ballotiq_progress
      const storedProgress = localStorage.getItem('ballotiq_progress');
      if (storedProgress) {
        const progress = JSON.parse(storedProgress);
        if (progress && typeof progress === 'object' && progress.lastUpdated) {
          lastUpdated = progress.lastUpdated;
        }
      }

      // 2. If not found, try sessionStorage ballotiq_context
      if (!lastUpdated) {
        const storedContext = sessionStorage.getItem('ballotiq_context');
        if (storedContext) {
          const context = JSON.parse(storedContext);
          if (context && typeof context === 'object') {
            if (context.lastUpdated) {
              lastUpdated = context.lastUpdated;
            } else if (context.sessionId && context.sessionId.startsWith('chat_')) {
              // Fallback: parse timestamp from chat session ID
              const parts = context.sessionId.split('_');
              if (parts.length > 1) {
                const ts = parseInt(parts[1], 10);
                if (!isNaN(ts)) {
                  lastUpdated = new Date(ts).toISOString();
                }
              }
            }
          }
        }
      }

      if (lastUpdated) {
        const relative = relativeTime(lastUpdated);
        if (relative) {
          setLastVisited(relative);
        }
      }
    } catch (error) {
      console.error('Error parsing progress or context for last visited date:', error);
    }
  }, []);

  const startGuidedPath = () => {
    captureEvent(EVENTS.PATH_CHOSEN, { path: 'guided', country_code: selectedCountry?.code });
    router.push('/assess');
  };

  const startOpenChat = () => {
    if (!selectedCountry) return;
    captureEvent(EVENTS.PATH_CHOSEN, { path: 'chat', country_code: selectedCountry.code });
    
    const context: UserContext = {
      sessionId: `chat_${Date.now()}`,
      countryCode: selectedCountry.code,
      countryName: selectedCountry.name,
      hasVotedBefore: null,
      selfRatedKnowledge: 1,
      mainConfusion: 'Direct query',
      knowledgeLevel: 'beginner',
      language: 'en',
      adaptationActive: false,
      consecutiveErrors: 0,
    };
    
    sessionStorage.setItem('ballotiq_context', JSON.stringify(context));
    router.push('/assistant');
  };

  if (!selectedCountry) return null;

  return (
    <div className="min-h-screen lg:min-h-screen overflow-y-auto overflow-x-hidden bg-gradient-to-br from-gray-950 via-blue-950 to-gray-950 text-gray-200 selection:bg-blue-500/30 flex flex-col relative">
      
      {/* Navigation - Sticky */}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-20 relative z-50 sticky top-0 bg-gradient-to-b from-gray-950/95 to-transparent backdrop-blur-sm">
        
        {/* Back Button - Left */}
        <button 
          onClick={() => router.push('/#country-selection')}
          className="absolute left-4 sm:left-6 top-1/2 -translate-y-1/2 p-2.5 sm:p-3 rounded-2xl bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-all group shrink-0"
          aria-label="Back to home"
        >
          <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6 group-hover:-translate-x-1 transition-transform" />
        </button>

        {/* Country Display - Center */}
        <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold shrink-0">
          <Image 
            src={`https://flagcdn.com/w80/${selectedCountry.code.toLowerCase()}.png`} 
            alt={`Flag of ${selectedCountry.name}`}
            width={16}
            height={12}
            unoptimized
            className="w-4 h-3 object-cover rounded-sm"
          />
          <span className="hidden xs:inline">{selectedCountry.name}</span>
          <span className="xs:hidden">{selectedCountry.code.toUpperCase()}</span>
        </div>

        {/* Theme & Language - Right */}
        <div className="absolute right-4 sm:right-6 top-1/2 -translate-y-1/2 shrink-0 flex items-center gap-1.5 sm:gap-2">
          <ThemeToggle />
          <LanguageSelector />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-6 sm:py-8 w-full max-w-4xl mx-auto">
        <div className="w-full text-center space-y-6 sm:space-y-8 animate-in slide-in-from-bottom-8 duration-700">
          
          {/* Header */}
          <div className="space-y-3 sm:space-y-4 px-2">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight">
              <TranslatedText text="How do you want to learn?" />
            </h1>
            <p className="text-sm sm:text-base md:text-lg text-gray-400 max-w-2xl mx-auto leading-relaxed px-2">
              <TranslatedText text="Choose the experience that fits your pace. Deep dive with a structured path or just talk with our AI assistant." />
            </p>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 md:gap-8 px-2">
            
            {/* Talk with AI */}
            <button
              onClick={startOpenChat}
              className="group relative p-1 rounded-[2.5rem] bg-gradient-to-br from-blue-500 to-indigo-600 hover:scale-[1.02] transition-all duration-500 shadow-[0_0_50px_rgba(59,130,246,0.2)]"
            >
              <div className="path-card-body relative h-full p-6 sm:p-8 md:p-10 rounded-[2.25rem] bg-[#080815] flex flex-col items-center text-center space-y-4 sm:space-y-6 overflow-hidden">
                
                <div className="absolute top-0 right-0 w-24 sm:w-32 h-24 sm:h-32 bg-blue-500/10 blur-3xl -mr-16 -mt-16 group-hover:bg-blue-500/20 transition-colors" />
                
                <div className="w-16 sm:w-20 h-16 sm:h-20 rounded-2xl sm:rounded-3xl bg-blue-500 flex items-center justify-center shadow-xl shadow-blue-500/20 group-hover:rotate-6 transition-transform">
                  <MessageSquare className="w-8 sm:w-10 h-8 sm:h-10 text-white" />
                </div>
                
                <div className="space-y-2 sm:space-y-3">
                  <h3 className="text-2xl sm:text-3xl font-bold text-white">
                    <TranslatedText text="Talk with AI" />
                  </h3>
                  <p className="text-sm sm:text-base text-gray-400 leading-relaxed">
                    <TranslatedText text="Just text or talk directly. The assistant knows your country and explains everything conversationally." />
                  </p>
                </div>

                <div className="flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-2.5 sm:py-3 bg-blue-500 text-white font-bold rounded-xl sm:rounded-2xl group-hover:bg-blue-400 transition-colors text-sm sm:text-base">
                  <TranslatedText text="Start Conversation" />
                  <Mic className="w-4 sm:w-5 h-4 sm:h-5" />
                </div>
              </div>
            </button>

            {/* Guided Path */}
            <button
              onClick={startGuidedPath}
              className="group p-1 rounded-[2.5rem] bg-white/5 hover:bg-white/10 transition-all duration-500 hover:scale-[1.02]"
            >
              <div className="path-card-body p-6 sm:p-8 md:p-10 rounded-[2.25rem] bg-[#050510] border border-white/5 h-full flex flex-col items-center text-center space-y-4 sm:space-y-6">
                
                <div className="w-16 sm:w-20 h-16 sm:h-20 rounded-2xl sm:rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:-rotate-6 transition-transform">
                  <Map className="w-8 sm:w-10 h-8 sm:h-10 text-gray-300" />
                </div>

                {lastVisited && (
                  <div className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 inline-flex items-center gap-1.5 transition-all duration-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>
                      <TranslatedText text="Last visited" />: {lastVisited}
                    </span>
                  </div>
                )}

                <div className="space-y-2 sm:space-y-3">
                  <h3 className="text-2xl sm:text-3xl font-bold text-white">
                    <TranslatedText text="Guided Path" />
                  </h3>
                  <p className="text-sm sm:text-base text-gray-400 leading-relaxed">
                    <TranslatedText text="Structured lessons, personalized roadmaps, micro-quizzes, and official certification." />
                  </p>
                </div>

                <div className="flex items-center gap-2 text-blue-400 font-semibold group-hover:gap-4 transition-all text-sm sm:text-base">
                  <TranslatedText text="Start Guided Learning" />
                  <ArrowRight className="w-4 sm:w-5 h-4 sm:h-5" />
                </div>
              </div>
            </button>
          </div>

          {/* Change Country Button */}
          <div className="pt-4 sm:pt-6 pb-2">
            <button 
              onClick={() => router.push('/#country-selection')}
              className="inline-flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full bg-white/5 border border-white/10 text-sm text-gray-400 font-medium hover:text-white hover:bg-white/10 hover:border-white/20 transition-all"
            >
              <ArrowLeft className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
              <TranslatedText text="Change Country" />
            </button>
          </div>
          
        </div>
      </div>
    </div>
  );
}