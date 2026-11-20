import React, { useEffect, useState, useCallback } from 'react';
import { translations, type Locale } from '../i18n/translations';
import { LanguageContext } from './useLanguage';

const STORAGE_KEY = 'pta_marketing_lang';

function getInitialLanguage(): Locale {
  if (typeof window !== 'undefined') {
    const urlLang = new URLSearchParams(window.location.search).get('lang');
    if (urlLang === 'ar' || urlLang === 'en') {
      return urlLang;
    }
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'ar' || stored === 'en') {
      return stored;
    }
  }
  return 'en';
}

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Locale>(getInitialLanguage);

  const setLang = useCallback((next: Locale) => {
    setLangState(next);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, next);
    }
  }, []);

  const toggleLang = useCallback(() => {
    setLangState((prev) => {
      const next: Locale = prev === 'en' ? 'ar' : 'en';
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(STORAGE_KEY, next);
      }
      return next;
    });
  }, []);

  useEffect(() => {
    const dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
    document.title = translations[lang].meta.pageTitle;
  }, [lang]);

  const value = {
    lang,
    isAr: lang === 'ar',
    dir: (lang === 'ar' ? 'rtl' : 'ltr') as 'ltr' | 'rtl',
    setLang,
    toggleLang,
    t: translations[lang],
  };

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};
