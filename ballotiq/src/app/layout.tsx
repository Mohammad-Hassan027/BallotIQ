import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Sora, Inter } from 'next/font/google';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';
import { TranslationProvider } from '@/context/TranslationContext';
import { ThemeProvider } from '@/context/ThemeContext';
import StartupDiagnostics from '@/components/ui/StartupDiagnostics';
import OfflineBanner from '@/components/ui/OfflineBanner';
import ServiceWorkerRegistration from '@/components/ServiceWorkerRegistration';
import './globals.css';
import BackToTop from '@/components/BackToTop';
import KeyboardShortcutsContainer from '@/components/ui/KeyboardShortcutsContainer';
import PostHogProvider from '@/components/PostHogProvider';

const sora = Sora({
  subsets: ['latin'],
  variable: '--font-sora',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'BallotIQ — Personalized Election Education',
  description: 'Understand your vote. Shape your future. BallotIQ is an adaptive AI tutor that personalizes election education based on your knowledge level, country, and language.',
  keywords: ['election', 'voting', 'civic education', 'democracy', 'BallotIQ'],
  authors: [{ name: 'BallotIQ Team' }],
  icons: {
    icon: '/favicon/favicon.ico',
    shortcut: '/favicon/favicon-32x32.png',
    apple: '/favicon/apple-touch-icon.png',
    other: [
      {
        rel: 'icon',
        url: '/favicon/favicon-16x16.png',
        sizes: '16x16',
      },
      {
        rel: 'icon',
        url: '/favicon/favicon-32x32.png',
        sizes: '32x32',
      },
      {
        rel: 'icon',
        url: '/favicon/android-chrome-192x192.png',
        sizes: '192x192',
      },
      {
        rel: 'icon',
        url: '/favicon/android-chrome-512x512.png',
        sizes: '512x512',
      },
    ],
  },
  manifest: '/favicon/site.webmanifest',
  openGraph: {
    title: 'BallotIQ — Personalized Election Education',
    description: 'AI-powered adaptive learning for election processes worldwide.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`dark ${sora.variable} ${inter.variable}`} data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <script
          id="theme-init"
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('ballotiq_theme');var d=window.matchMedia('(prefers-color-scheme: dark)').matches;var theme=t||(d?'dark':'light');if(theme==='light'){document.documentElement.classList.remove('dark');document.documentElement.classList.add('light');document.documentElement.setAttribute('data-theme','light');}else{document.documentElement.classList.remove('light');document.documentElement.classList.add('dark');document.documentElement.setAttribute('data-theme','dark');}}catch(e){}})();`
          }}
        />
      </head>
      <body className={`font-sans min-h-screen bg-background text-foreground antialiased bg-grain`}>
        <a 
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 
                     focus:left-4 focus:z-[60] focus:px-4 focus:py-2 
                     focus:bg-blue-600 focus:text-white focus:rounded-lg
                     focus:outline-none focus:ring-2 focus:ring-white"
        >
          Skip to main content
        </a>
        <PostHogProvider>
        <ThemeProvider>
          <TranslationProvider>
            <ServiceWorkerRegistration />
            <OfflineBanner />
            <StartupDiagnostics />
            <main id="main-content">
              <Suspense fallback={<div className="min-h-screen bg-gray-950 flex items-center justify-center"><LoadingSkeleton lines={10} /></div>}>
                {children}
              </Suspense>
            </main>
            <div
              id="a11y-announcer"
              role="status"
              aria-live="polite"
              aria-atomic="true"
              className="sr-only"
            />
            <BackToTop />
            <KeyboardShortcutsContainer />
          </TranslationProvider>
        </ThemeProvider>
        </PostHogProvider>
      </body>
    </html>
  );
}