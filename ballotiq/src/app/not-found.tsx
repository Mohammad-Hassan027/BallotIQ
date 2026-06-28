import Link from 'next/link';
import { Home, ArrowLeft, Map, MessageSquare } from 'lucide-react';

/**
 * Custom 404 Not Found page for BallotIQ.
 * Renders a branded error page matching the app's dark-mode aesthetic,
 * with helpful navigation links back into the app.
 *
 * Note: This is a Server Component (no 'use client') so it can be statically
 * rendered by Next.js when it catches an unmatched route.
 */
export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-blue-950 to-gray-950 text-gray-200 selection:bg-blue-500/30 flex flex-col items-center justify-center px-4 relative overflow-hidden">

      {/* Ambient background glow orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Card container */}
      <div className="relative z-10 w-full max-w-lg text-center animate-in fade-in slide-in-from-bottom-8 duration-700">

        {/* Logo / Brand mark */}
        <div className="flex items-center justify-center gap-3 mb-10">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-500/30">
            <span className="text-2xl" role="img" aria-label="BallotIQ logo">🗳️</span>
          </div>
          <span className="text-xl font-black tracking-tight text-white">
            Ballot<span className="text-blue-400">IQ</span>
          </span>
        </div>

        {/* 404 display */}
        <div className="mb-6">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-blue-400 mb-3">
            Error 404
          </p>
          <h1 className="text-7xl sm:text-8xl font-black text-white leading-none mb-1 tabular-nums"
              style={{ textShadow: '0 0 80px rgba(99,102,241,0.4)' }}>
            404
          </h1>
        </div>

        {/* Message */}
        <div className="mb-10 space-y-3">
          <h2 className="text-2xl sm:text-3xl font-bold text-white">
            Page not found
          </h2>
          <p className="text-gray-400 text-sm sm:text-base leading-relaxed max-w-sm mx-auto">
            The page you&apos;re looking for doesn&apos;t exist or may have been moved.
            Let&apos;s get you back on track.
          </p>
        </div>

        {/* Primary CTA */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8">
          <Link
            href="/"
            id="not-found-home-link"
            className="group inline-flex items-center gap-2.5 px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-all duration-300 hover:scale-[1.03] shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 w-full sm:w-auto justify-center"
          >
            <Home className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" />
            Back to Home
          </Link>

          <Link
            href="/"
            id="not-found-back-link"
            className="group inline-flex items-center gap-2.5 px-6 py-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 text-gray-300 hover:text-white font-semibold text-sm transition-all duration-300 w-full sm:w-auto justify-center"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Go Back
          </Link>
        </div>

        {/* Quick links */}
        <div className="pt-8 border-t border-white/5">
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-4">
            Or explore
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link
              href="/#country-selection"
              id="not-found-learn-link"
              className="group flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 text-gray-400 hover:text-white text-xs font-medium transition-all duration-200"
            >
              <Map className="w-3.5 h-3.5 text-blue-400" />
              Start Learning
            </Link>
            <Link
              href="/#country-selection"
              id="not-found-chat-link"
              className="group flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 text-gray-400 hover:text-white text-xs font-medium transition-all duration-200"
            >
              <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
              Talk with AI
            </Link>
          </div>
        </div>

      </div>

      {/* Footer note */}
      <p className="absolute bottom-6 text-xs text-gray-600 text-center">
        © 2026 BallotIQ. All rights reserved.
      </p>

    </div>
  );
}
