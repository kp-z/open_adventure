// AppContext.tsx - Consolidated context to avoid HMR issues v3.4.0
import React, { createContext, useContext, useState, useEffect } from 'react';

// Version marker to force cache invalidation
export const APP_CONTEXT_VERSION = '3.4.0';
console.log(`⚙️ AppContext loaded v${APP_CONTEXT_VERSION}`);

type Mode = 'professional' | 'adventure';
type Language = 'en' | 'zh';

interface AppContextType {
  mode: Mode;
  setMode: (mode: Mode) => void;
  toggleMode: () => void;
  lang: Language;
  setLang: (lang: Language) => void;
  toggleLang: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<Mode>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('claude-manager-mode') as Mode) || 'professional';
    }
    return 'professional';
  });

  const [lang, setLang] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('claude-manager-lang') as Language) || 'en';
    }
    return 'en';
  });

  useEffect(() => {
    localStorage.setItem('claude-manager-mode', mode);
    if (mode === 'adventure') {
      document.documentElement.classList.add('claude-adventure-mode');
    } else {
      document.documentElement.classList.remove('claude-adventure-mode');
    }
  }, [mode]);

  useEffect(() => {
    localStorage.setItem('claude-manager-lang', lang);
    document.documentElement.lang = lang;
  }, [lang]);

  const toggleMode = () => {
    setMode(prev => (prev === 'professional' ? 'adventure' : 'professional'));
  };

  const toggleLang = () => {
    setLang(prev => (prev === 'en' ? 'zh' : 'en'));
  };

  return (
    <AppContext.Provider value={{ mode, setMode, toggleMode, lang, setLang, toggleLang }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    // Return safe defaults
    return {
      mode: 'professional' as Mode,
      setMode: () => {},
      toggleMode: () => {},
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