'use client';
import { useState, useEffect } from 'react';

export default function BackToTop(): JSX.Element | null {
  const [visible, setVisible] = useState<boolean>(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 300);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!visible) return null;

  return (
    <button
      onClick={scrollToTop}
      className="fixed bottom-6 right-6 z-50 p-3 
                 rounded-full bg-blue-600 text-white 
                 shadow-lg hover:bg-blue-700 transition-all"
      aria-label="Back to top"
    >
      ↑
    </button>
  );
}
