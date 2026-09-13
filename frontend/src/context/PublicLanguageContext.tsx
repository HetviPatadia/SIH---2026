import React, { createContext, useContext, useState } from 'react';
import { publicTranslations, PublicLanguage } from '../locales/publicTranslations';

interface PublicLanguageContextType {
  language: PublicLanguage;
  setLanguage: (lang: PublicLanguage) => void;
  t: (key: string, fallback?: string) => string;
}

const PublicLanguageContext = createContext<PublicLanguageContextType | undefined>(undefined);

function getPathValue(obj: any, path: string): string | undefined {
  if (!obj) return undefined;
  if (obj[path] !== undefined && typeof obj[path] === 'string') return obj[path];
  const parts = path.split('.');
  let curr = obj;
  for (const part of parts) {
    if (curr && typeof curr === 'object' && part in curr) {
      curr = curr[part];
    } else {
      return undefined;
    }
  }
  return typeof curr === 'string' ? curr : undefined;
}

export const PublicLanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<PublicLanguage>(() => {
    const saved = localStorage.getItem('public_portal_lang') as PublicLanguage;
    if (saved && ['en', 'hi', 'gu'].includes(saved)) {
      return saved;
    }
    return 'en';
  });

  const setLanguage = (lang: PublicLanguage) => {
    setLanguageState(lang);
    localStorage.setItem('public_portal_lang', lang);
    window.dispatchEvent(new CustomEvent('PUBLIC_LANGUAGE_CHANGED', { detail: { language: lang } }));
  };

  const t = (key: string, fallback?: string): string => {
    const currentDict = publicTranslations[language] || publicTranslations.en;
    const val = getPathValue(currentDict, key);
    if (val !== undefined) return val;

    const defaultVal = getPathValue(publicTranslations.en, key);
    if (defaultVal !== undefined) return defaultVal;

    return fallback || key;
  };

  return (
    <PublicLanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </PublicLanguageContext.Provider>
  );
};

export const usePublicLanguage = (): PublicLanguageContextType => {
  const context = useContext(PublicLanguageContext);
  if (!context) {
    return {
      language: 'en',
      setLanguage: () => {},
      t: (key: string, fallback?: string) => {
        const val = getPathValue(publicTranslations.en, key);
        return val || fallback || key;
      },
    };
  }
  return context;
};
