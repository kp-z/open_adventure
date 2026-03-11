import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'en' | 'zh';

interface ModeContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  toggleLang: () => void;
}

const ModeContext = createContext<ModeContextType | undefined>(undefined);

export function ModeProvider({ children }: { children: React.ReactNode }) {
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
    <ModeContext.Provider value={{ lang, setLang, toggleLang }}>
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
