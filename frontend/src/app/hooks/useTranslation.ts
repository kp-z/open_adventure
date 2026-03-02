import { useMode } from '../contexts/ModeContext';
import { translations, TranslationKey } from '../lib/translations';

export function useTranslation() {
  const { mode, lang } = useMode();
  
  const t = (key: TranslationKey): string => {
    return (translations[lang] as any)[mode][key] || (translations['en'] as any)['professional'][key] || key;
  };

  return { t };
}
