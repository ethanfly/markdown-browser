import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { locales, Language, LocaleKey } from './locales';

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: LocaleKey) => string;
}

const I18nContext = createContext<I18nContextType | null>(null);

const STORAGE_KEY = 'markdown-editor-language';

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'en' || stored === 'zh') {
      return stored;
    }
    // Detect system language
    const browserLang = navigator.language.toLowerCase();
    return browserLang.startsWith('zh') ? 'zh' : 'en';
  });

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem(STORAGE_KEY, lang);
  }, []);

  const t = useCallback((key: LocaleKey): string => {
    return locales[language][key] || key;
  }, [language]);

  useEffect(() => {
    document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en';
  }, [language]);

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return context;
}
