"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";
import type { SupportedLanguage } from "@/types";
import {
  clearTranslationCache,
  translateText,
  translateBatch,
} from "@/lib/translate/client";

import hiLocales from '@/locales/hi.json';
import taLocales from '@/locales/ta.json';
import deLocales from '@/locales/de.json';
import arLocales from '@/locales/ar.json';
import frLocales from '@/locales/fr.json';
import teLocales from '@/locales/te.json';
import esLocales from '@/locales/es.json';
import ptLocales from '@/locales/pt.json';

const DICTIONARIES: Record<string, Record<string, string>> = {
  hi: hiLocales,
  ta: taLocales,
  de: deLocales,
  ar: arLocales,
  fr: frLocales,
  te: teLocales,
  es: esLocales,
  pt: ptLocales,
};

interface TranslationContextType {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  translate: (text: string, isStatic?: boolean) => Promise<string>;
  translateMany: (texts: string[], isStatic?: boolean) => Promise<string[]>;
  isTranslating: boolean;
}

const TranslationContext = createContext<TranslationContextType | undefined>(
  undefined,
);

// Strongly typed array ensures TypeScript will error if type and list diverge again
const VALID_LANGUAGES: SupportedLanguage[] = [
  "en",
  "hi",
  "te",
  "ta",
  "fr",
  "es",
  "de",
  "ar",
  "pt",
];

export function TranslationProvider({ children }: { children: ReactNode }) {
  const [language, setLang] = useState<SupportedLanguage>(() => {
    if (typeof window === 'undefined') return 'en';
    const saved = localStorage.getItem('ballotiq_lang') as SupportedLanguage;
    return (saved && VALID_LANGUAGES.includes(saved)) ? saved : 'en';
  });
  const [isTranslating, setIsTranslating] = useState(false);

  const setLanguage = useCallback((lang: SupportedLanguage) => {
    localStorage.setItem("ballotiq_lang", lang);
    clearTranslationCache();
    setLang(lang);
    console.info(`[Translation] Language changed to: ${lang}. Cache cleared.`);
  }, []);

  const translate = useCallback(async (text: string, isStatic?: boolean): Promise<string> => {
    if (language === 'en' || !text) return text;

    const useStatic = isStatic !== false;
    if (useStatic) {
      const dictionary = DICTIONARIES[language];
      if (dictionary) {
        if (text in dictionary) {
          return dictionary[text];
        }
        if (process.env.NODE_ENV === 'development') {
          console.warn(`[Translation] Missing static translation key in '${language}': "${text}"`);
        }
      }
    }

    setIsTranslating(true);
    try {
      let sessionId: string | undefined;
      if (typeof window !== 'undefined') {
        const stored = sessionStorage.getItem('ballotiq_context');
        if (stored) sessionId = JSON.parse(stored).sessionId;
      }
      return await translateText(text, language, sessionId);
    } finally {
      setIsTranslating(false);
    }
  }, [language]);

  const translateMany = useCallback(async (texts: string[], isStatic?: boolean): Promise<string[]> => {
    if (language === 'en' || texts.length === 0) return texts;

    const useStatic = isStatic !== false;
    const dictionary = useStatic ? DICTIONARIES[language] : null;

    if (dictionary) {
      const results: string[] = new Array(texts.length);
      const missingIndices: number[] = [];
      const missingTexts: string[] = [];

      texts.forEach((text, index) => {
        if (!text) {
          results[index] = text;
        } else if (text in dictionary) {
          results[index] = dictionary[text];
        } else {
          missingIndices.push(index);
          missingTexts.push(text);
          if (process.env.NODE_ENV === 'development') {
            console.warn(`[Translation] Missing static translation key in '${language}': "${text}"`);
          }
        }
      });

      if (missingTexts.length === 0) {
        return results;
      }

      setIsTranslating(true);
      try {
        let sessionId: string | undefined;
        if (typeof window !== 'undefined') {
          const stored = sessionStorage.getItem('ballotiq_context');
          if (stored) sessionId = JSON.parse(stored).sessionId;
        }
        const translatedMissing = await translateBatch(missingTexts, language, sessionId);
        translatedMissing.forEach((translated, index) => {
          const originalIndex = missingIndices[index];
          results[originalIndex] = translated;
        });
        return results;
      } finally {
        setIsTranslating(false);
      }
    }

    setIsTranslating(true);
    try {
      let sessionId: string | undefined;
      if (typeof window !== 'undefined') {
        const stored = sessionStorage.getItem('ballotiq_context');
        if (stored) sessionId = JSON.parse(stored).sessionId;
      }
      return await translateBatch(texts, language, sessionId);
    } finally {
      setIsTranslating(false);
    }
  }, [language]);

  return (
    <TranslationContext.Provider
      value={{ language, setLanguage, translate, translateMany, isTranslating }}
    >
      {children}
    </TranslationContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(TranslationContext);
  if (context === undefined) {
    throw new Error("useTranslation must be used within a TranslationProvider");
  }
  return context;
}
