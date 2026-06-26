import React from 'react';
import { render, screen } from '@testing-library/react';
import ChoosePathPage from '@/app/choose-path/page';

const mockPush = jest.fn();
const mockRouter = {
  push: mockPush,
};
jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
}));

jest.mock('@/lib/posthog/helper', () => ({
  captureEvent: jest.fn(),
}));

// Mock TranslatedText to render the text directly
jest.mock('@/components/ui/TranslatedText', () => ({
  __esModule: true,
  default: ({ text }: { text: string }) => <span>{text}</span>,
}));

// Mock ThemeToggle and LanguageSelector to avoid context provider issues
jest.mock('@/components/ui/ThemeToggle', () => ({
  __esModule: true,
  default: () => <button data-testid="theme-toggle">ThemeToggle</button>,
}));

jest.mock('@/components/ui/LanguageSelector', () => ({
  __esModule: true,
  default: () => <button data-testid="language-selector">LanguageSelector</button>,
}));

describe('ChoosePathPage - Last visited badge', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sessionStorage.clear();
    localStorage.clear();
    
    // Default country stored to prevent redirect
    sessionStorage.setItem('ballotiq_country', JSON.stringify({ code: 'IN', name: 'India' }));
  });

  it('renders nothing for a brand new user (no saved progress or context)', () => {
    render(<ChoosePathPage />);
    expect(screen.queryByText(/Last visited/i)).not.toBeInTheDocument();
  });

  it('renders "Today" badge if lastUpdated in localStorage ballotiq_progress is today', () => {
    const todayISO = new Date().toISOString();
    localStorage.setItem('ballotiq_progress', JSON.stringify({ lastUpdated: todayISO }));

    render(<ChoosePathPage />);
    expect(screen.getByText('Last visited')).toBeInTheDocument();
    expect(screen.getByText(/Today/i)).toBeInTheDocument();
  });

  it('renders "Yesterday" badge if lastUpdated in localStorage ballotiq_progress is yesterday', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    localStorage.setItem('ballotiq_progress', JSON.stringify({ lastUpdated: yesterday.toISOString() }));

    render(<ChoosePathPage />);
    expect(screen.getByText('Last visited')).toBeInTheDocument();
    expect(screen.getByText(/Yesterday/i)).toBeInTheDocument();
  });

  it('renders "3 days ago" badge if lastUpdated in localStorage ballotiq_progress is 3 days ago', () => {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    localStorage.setItem('ballotiq_progress', JSON.stringify({ lastUpdated: threeDaysAgo.toISOString() }));

    render(<ChoosePathPage />);
    expect(screen.getByText('Last visited')).toBeInTheDocument();
    expect(screen.getByText(/3 days ago/i)).toBeInTheDocument();
  });

  it('reads from sessionStorage ballotiq_context if localStorage has no progress', () => {
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    sessionStorage.setItem('ballotiq_context', JSON.stringify({ lastUpdated: twoDaysAgo.toISOString() }));

    render(<ChoosePathPage />);
    expect(screen.getByText('Last visited')).toBeInTheDocument();
    expect(screen.getByText(/2 days ago/i)).toBeInTheDocument();
  });

  it('falls back to parsing sessionId starting with chat_ in sessionStorage ballotiq_context', () => {
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    const ts = twoDaysAgo.getTime();
    sessionStorage.setItem('ballotiq_context', JSON.stringify({ sessionId: `chat_${ts}` }));

    render(<ChoosePathPage />);
    expect(screen.getByText('Last visited')).toBeInTheDocument();
    expect(screen.getByText(/2 days ago/i)).toBeInTheDocument();
  });

  it('handles malformed dates gracefully and shows no badge', () => {
    localStorage.setItem('ballotiq_progress', JSON.stringify({ lastUpdated: 'invalid-date-string' }));

    render(<ChoosePathPage />);
    expect(screen.queryByText(/Last visited/i)).not.toBeInTheDocument();
  });
});
