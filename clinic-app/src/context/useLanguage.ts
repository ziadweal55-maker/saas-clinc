import { createContext, useContext } from 'react';
import type { Locale, TranslationContent } from '../i18n/translations';

export interface LanguageContextValue {
  lang: Locale;
  isAr: boolean;
  dir: 'ltr' | 'rtl';
  setLang: (next: Locale) => void;
  toggleLang: () => void;
  t: TranslationContent;
}

export const LanguageContext = createContext<LanguageContextValue | null>(null);

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return ctx;
}
