import React, { createContext, useContext, useState, useEffect } from 'react';

type Mode = 'professional' | 'adventure';
type Language = 'en' | 'zh';

interface ModeContextType {
  mode: Mode;
  setMode: (mode: Mode) => void;
  toggleMode: () => void;
  lang: Language;
  setLang: (lang: Language) => void;
  toggleLang: () => void;
}

const ModeContext = createContext<ModeContextType | undefined>(undefined);

export function ModeProvider({ children }: { children: React.ReactNode }) {
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
    <ModeContext.Provider value={{ mode, setMode, toggleMode, lang, setLang, toggleLang }}>
      {children}
    </ModeContext.Provider>
  );
}

export function useMode() {
  const context = useContext(ModeContext);
  if (context === undefined) {
    throw new Error('useMode must be used within a ModeProvider');
  }
  return context;
}
