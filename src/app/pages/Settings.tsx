import React from 'react';
import { 
  Settings as SettingsIcon, 
  Monitor, 
  Palette, 
  Database, 
  Zap, 
  Globe, 
  Bell, 
  Lock, 
  ShieldCheck,
  Sword,
  LayoutDashboard,
  Check,
  Languages
} from 'lucide-react';
import { useMode } from '../contexts/ModeContext';
import { useTranslation } from '../hooks/useTranslation';
import { GlassCard, ActionButton } from '../components/ui-shared';
import { motion } from 'motion/react';

const Settings = () => {
  const { mode, setMode, lang, setLang } = useMode();
  const { t } = useTranslation();

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <header>
        <h1 className="text-3xl font-bold tracking-tight uppercase">SETTINGS</h1>
        <p className="text-gray-400">{t("advDesc")}</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Sidebar Navigation */}
        <div className="space-y-1">
          {[
            { name: t("general"), icon: SettingsIcon, active: true },
            { name: t("appearance"), icon: Palette },
            { name: t("integration"), icon: Monitor },
            { name: t("dataManagement"), icon: Database },
          ].map((item) => (
            <button
              key={item.name}
              className={`w-full flex items-center gap-3 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                item.active 
                  ? (mode === 'adventure' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' : 'bg-blue-600/20 text-blue-400 border border-blue-500/30')
                  : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <item.icon size={18} />
              {item.name}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="md:col-span-3 space-y-8">
          {/* Interface Mode */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Palette size={20} className={mode === 'adventure' ? 'text-yellow-500' : 'text-blue-500'} />
              {t("interfaceMode")}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button 
                onClick={() => setMode('professional')}
                className={`relative p-6 rounded-2xl border-2 transition-all text-left group overflow-hidden ${
                  mode === 'professional' ? 'border-blue-500 bg-blue-500/5 shadow-[0_0_20px_rgba(59,130,246,0.2)]' : 'border-white/10 bg-white/5 hover:border-white/20'
                }`}
              >
                {mode === 'professional' && <div className="absolute top-4 right-4 text-blue-500"><Check size={20} /></div>}
                <LayoutDashboard className={`mb-4 ${mode === 'professional' ? 'text-blue-500' : 'text-gray-500'}`} size={32} />
                <h3 className="font-bold text-lg">{t("proTitle")}</h3>
                <p className="text-xs text-gray-400 mt-1">{t("proDesc")}</p>
              </button>

              <button 
                onClick={() => setMode('adventure')}
                className={`relative p-6 rounded-2xl border-2 transition-all text-left group overflow-hidden ${
                  mode === 'adventure' ? 'border-yellow-500 bg-yellow-500/5 shadow-[0_0_20px_rgba(234,179,8,0.2)]' : 'border-white/10 bg-white/5 hover:border-white/20'
                }`}
              >
                {mode === 'adventure' && <div className="absolute top-4 right-4 text-yellow-500"><Check size={20} /></div>}
                <Sword className={`mb-4 ${mode === 'adventure' ? 'text-yellow-500' : 'text-gray-500'}`} size={32} />
                <h3 className="font-bold text-lg">{t("advTitle")}</h3>
                <p className="text-xs text-gray-400 mt-1">{t("advDesc")}</p>
                {mode === 'adventure' && <div className="absolute inset-0 bg-yellow-500/5 animate-pulse pointer-events-none" />}
              </button>
            </div>
          </section>

          {/* Language Settings */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Languages size={20} className={mode === 'adventure' ? 'text-yellow-500' : 'text-blue-500'} />
              {t("langSettings")}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button 
                onClick={() => setLang('en')}
                className={`relative p-6 rounded-2xl border-2 transition-all text-left group overflow-hidden ${
                  lang === 'en' 
                    ? (mode === 'adventure' ? 'border-yellow-500 bg-yellow-500/5 shadow-[0_0_20px_rgba(234,179,8,0.2)]' : 'border-blue-500 bg-blue-500/5 shadow-[0_0_20px_rgba(59,130,246,0.2)]')
                    : 'border-white/10 bg-white/5 hover:border-white/20'
                }`}
              >
                {lang === 'en' && <div className={`absolute top-4 right-4 ${mode === 'adventure' ? 'text-yellow-500' : 'text-blue-500'}`}><Check size={20} /></div>}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${lang === 'en' ? (mode === 'adventure' ? 'bg-yellow-500 text-black' : 'bg-blue-600 text-white') : 'bg-white/10 text-gray-400'}`}>
                  EN
                </div>
                <h3 className="font-bold text-lg">{t("enLang")}</h3>
                <p className="text-xs text-gray-400 mt-1">English Interface (US/UK)</p>
              </button>

              <button 
                onClick={() => setLang('zh')}
                className={`relative p-6 rounded-2xl border-2 transition-all text-left group overflow-hidden ${
                  lang === 'zh' 
                    ? (mode === 'adventure' ? 'border-yellow-500 bg-yellow-500/5 shadow-[0_0_20px_rgba(234,179,8,0.2)]' : 'border-blue-500 bg-blue-500/5 shadow-[0_0_20px_rgba(59,130,246,0.2)]')
                    : 'border-white/10 bg-white/5 hover:border-white/20'
                }`}
              >
                {lang === 'zh' && <div className={`absolute top-4 right-4 ${mode === 'adventure' ? 'text-yellow-500' : 'text-blue-500'}`}><Check size={20} /></div>}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${lang === 'zh' ? (mode === 'adventure' ? 'bg-yellow-500 text-black' : 'bg-blue-600 text-white') : 'bg-white/10 text-gray-400'}`}>
                  ZH
                </div>
                <h3 className="font-bold text-lg">{t("zhLang")}</h3>
                <p className="text-xs text-gray-400 mt-1">中文简体界面</p>
              </button>
            </div>
          </section>

          {/* Integration Settings */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Monitor size={20} className={mode === 'adventure' ? 'text-yellow-500' : 'text-blue-500'} />
              {t("integration")}
            </h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-400">CLI Binary Path</label>
                <input 
                  type="text" 
                  defaultValue="/usr/local/bin/claude"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-all font-mono"
                />
              </div>
              <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10">
                <div className="flex items-center gap-3">
                  <Globe size={20} className={mode === 'adventure' ? 'text-yellow-500' : 'text-blue-400'} />
                  <div>
                    <p className="font-bold text-sm">Auto-Sync Skills</p>
                    <p className="text-xs text-gray-500">Automatically update local skills from cloud.</p>
                  </div>
                </div>
                <div className={`w-12 h-6 rounded-full ${mode === 'adventure' ? 'bg-yellow-600' : 'bg-blue-600'} p-1 flex justify-end cursor-pointer`}>
                  <div className="w-4 h-4 rounded-full bg-white" />
                </div>
              </div>
            </div>
          </section>

          <div className="flex justify-end gap-4 pt-8">
            <ActionButton variant="secondary">{t("discard")}</ActionButton>
            <ActionButton>{t("save")}</ActionButton>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
