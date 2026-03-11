// AppContext.tsx - Consolidated context to avoid HMR issues v3.4.0
import React, { createContext, useContext, useState, useEffect } from 'react';

// Version marker to force cache invalidation
export const APP_CONTEXT_VERSION = '3.4.0';
console.log(`⚙️ AppContext loaded v${APP_CONTEXT_VERSION}`);

type Language = 'en' | 'zh';

interface AppContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  toggleLang: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('open-adventure-lang') as Language) || 'en';
    }
    return 'en';
  });

  useEffect(() => {
    localStorage.setItem('open-adventure-lang', lang);
    document.documentElement.lang = lang;
  }, [lang]);

  const toggleLang = () => {
    setLang(prev => (prev === 'en' ? 'zh' : 'en'));
  };

  return (
    <AppContext.Provider value={{ lang, setLang, toggleLang }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    // Return safe defaults
    return {
      lang: 'en' as Language,
      setLang: () => {},
      toggleLang: () => {},
    };
  }
  return context;
}

// Legacy export for backward compatibility
export const useMode = useAppContext;
export const ModeProvider = AppProvider;