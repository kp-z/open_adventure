import React, { useState, useMemo } from 'react';
import { 
  X, 
  Shield, 
  Sword, 
  BrainCircuit, 
  Zap, 
  Star, 
  Search, 
  Check,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Lock,
  Plus,
  ArrowLeft,
  Briefcase
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useMode } from '../contexts/ModeContext';
import { useTranslation } from '../hooks/useTranslation';
import { GameCard, ActionButton } from './ui-shared';
import { getAvatarById } from '../lib/avatars';
import { getSkillIcon } from '../lib/skill-icons';
import { cn } from '../lib/utils';

// Mock data for skills
const availableSkills = [
  { id: 1, name: { en: 'Web Search', zh: '网页搜索' }, advIcon: 'swimming', rarity: 'rare', level: 5, type: 'skill', source: 'Global' },
  { id: 2, name: { en: 'Python Exec', zh: 'Python 执行' }, advIcon: 'chess', rarity: 'epic', level: 8, type: 'skill', source: 'Project', projectName: 'Data Forge' },
  { id: 3, name: { en: 'PDF Reader', zh: 'PDF 阅读器' }, advIcon: 'sportsBottle', rarity: 'common', level: 2, type: 'skill', source: 'Plugin', pluginNamespace: 'adobe-helper' },
  { id: 4, name: { en: 'API Generator', zh: 'API 生成器' }, advIcon: 'esports', rarity: 'legendary', level: 12, type: 'skill', source: 'Project', projectName: 'Internal API' },
  { id: 5, name: { en: 'UI Architect', zh: 'UI 架构师' }, advIcon: 'gymming', rarity: 'epic', level: 7, type: 'skill', source: 'Global' },
  { id: 6, name: { en: 'Log Analyzer', zh: '日志分析器' }, advIcon: 'stopwatch', rarity: 'rare', level: 4, type: 'skill', source: 'Plugin', pluginNamespace: 'sys-log-monitor' },
  { id: 7, name: { en: 'Cloud Forge', zh: '云端锻造' }, advIcon: 'sword', rarity: 'legendary', level: 15, type: 'skill', source: 'Global' },
  { id: 8, name: { en: 'Neural Link', zh: '神经链接' }, advIcon: 'trophy', rarity: 'epic', level: 9, type: 'skill', source: 'Global' },
];

const availableWeapons = [
  { id: 101, name: { en: 'Logic Blade', zh: '逻辑之刃' }, advIcon: 'sword', rarity: 'rare', level: 10, type: 'weapon' },
  { id: 102, name: { en: 'Neural Staff', zh: '神经权杖' }, advIcon: 'chess', rarity: 'legendary', level: 25, type: 'weapon' },
  { id: 103, name: { en: 'Encryption Shield', zh: '加密圆盾' }, advIcon: 'trophy', rarity: 'epic', level: 18, type: 'weapon' },
  { id: 104, name: { en: 'Async Bow', zh: '异步长弓' }, advIcon: 'swimming', rarity: 'rare', level: 12, type: 'weapon' },
  { id: 105, name: { en: 'Refactor Axe', zh: '重构战斧' }, advIcon: 'gymming', rarity: 'legendary', level: 30, type: 'weapon' },
];

interface HeroInspectorProps {
  agent: any;
  onBack: () => void;
  onSave?: (skills: number[], weapons: number[]) => void;
}

export const HeroInspector = ({ agent, onBack, onSave }: HeroInspectorProps) => {
  const { mode, lang } = useMode();
  const { t } = useTranslation();
  const [selectedSkills, setSelectedSkills] = useState<number[]>(agent?.selectedSkills || [1, 2]);
  const [selectedWeapons, setSelectedWeapons] = useState<number[]>(agent?.selectedWeapons || [101]);
  const [activeTab, setActiveTab] = useState<'skills' | 'weapons'>('skills');
  const [search, setSearch] = useState('');

  const skillSlotsCount = 4;
  const weaponSlotsCount = 2;
  
  const filteredItems = useMemo(() => {
    const pool = activeTab === 'skills' ? availableSkills : availableWeapons;
    return pool.filter(s => 
      (s.name[lang] || s.name.en).toLowerCase().includes(search.toLowerCase())
    );
  }, [search, lang, activeTab]);

  const toggleItem = (id: number, type: 'skill' | 'weapon') => {
    if (type === 'skill') {
      if (selectedSkills.includes(id)) {
        setSelectedSkills(prev => prev.filter(sid => sid !== id));
      } else if (selectedSkills.length < skillSlotsCount) {
        setSelectedSkills(prev => [...prev, id]);
      }
    } else {
      if (selectedWeapons.includes(id)) {
        setSelectedWeapons(prev => prev.filter(wid => wid !== id));
      } else if (selectedWeapons.length < weaponSlotsCount) {
        setSelectedWeapons(prev => [...prev, id]);
      }
    }
  };

  const getSkillById = (id: number) => availableSkills.find(s => s.id === id);
  const getWeaponById = (id: number) => availableWeapons.find(w => w.id === id);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-[#0a0a14] overflow-hidden flex flex-col font-sans"
    >
      {/* Header - Inspired by Figma currencies */}
      <header className="h-20 px-8 flex items-center justify-between bg-[#121225] border-b border-white/5 relative z-10">
        <div className="flex items-center gap-6">
          <button 
            onClick={onBack}
            className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-all hover:bg-white/10"
          >
            <ArrowLeft size={24} />
          </button>
          <div className="flex flex-col">
            <h2 className="text-2xl font-black italic tracking-tighter text-yellow-500 uppercase">{t('appName' as any)}</h2>
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-500">
               <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
               Agent Configuration Protocol
            </div>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-8">
           <div className="flex items-center gap-3 bg-black/40 px-4 py-2 rounded-full border border-white/10">
              <Zap size={16} className="text-yellow-500" />
              <span className="text-sm font-black text-white">2485</span>
           </div>
           <div className="flex items-center gap-3 bg-black/40 px-4 py-2 rounded-full border border-white/10">
              <Star size={16} className="text-blue-500" />
              <span className="text-sm font-black text-white">1100</span>
              <Plus size={12} className="text-gray-500 ml-1 cursor-pointer" />
           </div>
           <div className="flex items-center gap-3 bg-black/40 px-4 py-2 rounded-full border border-white/10">
              <Shield size={16} className="text-green-500" />
              <span className="text-sm font-black text-white">800</span>
              <Plus size={12} className="text-gray-500 ml-1 cursor-pointer" />
           </div>
        </div>

        <div className="flex items-center gap-4">
           <ActionButton 
             onClick={() => onSave?.(selectedSkills, selectedWeapons)}
             className="px-8 h-12"
           >
              {t('save' as any)}
           </ActionButton>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Background Effects */}
        <div className="absolute inset-0 pointer-events-none">
           <div className="absolute top-1/4 -left-20 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px]" />
           <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-purple-600/10 rounded-full blur-[120px]" />
           <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
        </div>

        {/* Left: Character Preview & Stats */}
        <div className="w-full lg:w-[40%] h-full flex flex-col p-8 lg:p-12 relative z-10">
           <div className="mb-8">
              <h1 className="text-5xl font-black italic tracking-tighter text-white uppercase mb-2">
                {agent?.name[lang] || (lang === 'zh' ? '新英雄' : 'New Hero')}
              </h1>
              <div className="flex items-center gap-4">
                <span className="text-xs font-black text-yellow-500 tracking-[0.3em] uppercase">{agent?.role[lang] || 'Specialist'}</span>
                <div className="flex-1 h-px bg-gradient-to-r from-yellow-500/50 to-transparent" />
              </div>
           </div>

           <div className="flex-1 relative flex items-center justify-center">
              {/* Avatar Popping Out Effect */}
              <div className="relative w-full aspect-square max-w-[400px]">
                 <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-purple-500/5 rounded-full blur-3xl" />
                 <motion.div
                   initial={{ scale: 0.8, opacity: 0 }}
                   animate={{ scale: 1, opacity: 1 }}
                   transition={{ duration: 0.8, ease: "easeOut" }}
                   className="relative w-full h-full flex items-end justify-center"
                 >
                    {(() => {
                      const AvatarIcon = getAvatarById(agent?.avatar || 'vanguard_1').icon;
                      return <AvatarIcon className="w-32 h-32 text-yellow-500 drop-shadow-[0_40px_60px_rgba(0,0,0,0.8)]" />;
                    })()}
                 </motion.div>
                 
                 {/* Radial Decorative Rings */}
                 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[110%] h-[110%] border border-white/5 rounded-full" />
                 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[130%] h-[130%] border border-white/[0.02] rounded-full" />
              </div>
           </div>

           {/* Stats Block - Inspired by Figma stats layout */}
           <div className="mt-8 grid grid-cols-1 gap-4 max-w-sm">
              {[
                { label: t('intel' as any), value: agent?.stats?.wisdom || 80, icon: BrainCircuit, color: 'from-purple-600 to-purple-400' },
                { label: t('strength' as any), value: agent?.stats?.power || 75, icon: Sword, color: 'from-red-600 to-red-400' },
                { label: t('agility' as any), value: agent?.stats?.speed || 85, icon: Zap, color: 'from-yellow-600 to-yellow-400' },
              ].map(stat => (
                <div key={stat.label} className="space-y-1.5">
                  <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                    <div className="flex items-center gap-2">
                      <stat.icon size={12} className="text-white/50" />
                      <span className="text-gray-400">{stat.label}</span>
                    </div>
                    <span className="text-white">{stat.value}</span>
                  </div>
                  <div className="w-full h-2 bg-black/60 rounded-full overflow-hidden border border-white/5 p-[1px]">
                     <motion.div 
                       initial={{ width: 0 }}
                       animate={{ width: `${stat.value}%` }}
                       transition={{ duration: 1.2, delay: 0.2 }}
                       className={cn("h-full rounded-full bg-gradient-to-r shadow-[0_0_10px_rgba(0,0,0,0.5)]", stat.color)} 
                     />
                  </div>
                </div>
              ))}
           </div>
        </div>

        {/* Right: Backpack & Slots */}
        <div className="flex-1 h-full flex flex-col p-8 lg:p-12 lg:pl-0 relative z-10 overflow-hidden">
           <div className="flex-1 flex flex-col bg-[#121225]/60 backdrop-blur-xl rounded-[40px] border border-white/5 shadow-2xl overflow-hidden">
              
              {/* Backpack Title */}
              <div className="p-8 pb-4 flex items-center justify-between border-b border-white/5">
                 <h2 className="text-4xl font-black italic tracking-tighter text-white uppercase italic">
                    {lang === 'zh' ? '技能背包' : 'BACKPACK'}
                 </h2>
                 <div className="flex gap-4">
                    <div className="bg-black/40 px-4 py-2 rounded-xl border border-white/5 flex items-center gap-2">
                       <Briefcase size={16} className="text-yellow-500" />
                       <span className="text-xs font-black uppercase tracking-widest text-gray-400">
                          {(selectedSkills?.length || 0) + (selectedWeapons?.length || 0)} / {skillSlotsCount + weaponSlotsCount} {lang === 'zh' ? '已装备' : 'ITEMS'}
                       </span>
                    </div>
                 </div>
              </div>

              <div className="flex-1 flex flex-col overflow-hidden p-8 gap-10">
                 {/* Weapon Slots Section */}
                 <div className="space-y-4">
                    <div className="flex items-center gap-2">
                       <Sword size={16} className="text-red-500" />
                       <h3 className="text-xs font-black uppercase tracking-widest text-gray-400">{lang === 'zh' ? '武器槽' : 'WEAPON SLOTS'}</h3>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        {[...Array(weaponSlotsCount)].map((_, i) => {
                          const itemId = selectedWeapons[i];
                          const item = itemId ? getWeaponById(itemId) : null;
                          return (
                            <div key={`weapon-${i}`} className="group relative">
                                <div className={cn(
                                  "aspect-square rounded-3xl flex flex-col items-center justify-center border-2 transition-all relative overflow-hidden",
                                  item 
                                    ? "bg-red-500/10 border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.1)]" 
                                    : "bg-black/20 border-white/5 border-dashed"
                                )}>
                                  {item ? (
                                    <>
                                      <div className="w-16 h-16 mb-2 flex items-center justify-center">
                                          {(() => {
                                            const IconComponent = getSkillIcon(item.advIcon || 'sword');
                                            return <IconComponent className="w-12 h-12 drop-shadow-lg" />;
                                          })()}
                                      </div>
                                      <div className="absolute bottom-3 text-[9px] font-black uppercase tracking-widest text-white/70">
                                          {item.name[lang]}
                                      </div>
                                      <button 
                                        onClick={() => toggleItem(item.id, 'weapon')}
                                        className="absolute top-2 right-2 p-1 bg-red-500/20 text-red-400 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                      >
                                          <X size={12} />
                                      </button>
                                    </>
                                  ) : (
                                    <div className="flex flex-col items-center text-gray-700">
                                        <Lock size={20} className="mb-1" />
                                        <span className="text-[9px] font-black uppercase tracking-widest">Empty</span>
                                    </div>
                                  )}
                                </div>
                                <div className="mt-2 h-12 w-full bg-gradient-to-b from-white/[0.03] to-transparent rounded-b-3xl transform -scale-y-100 opacity-20 pointer-events-none" />
                            </div>
                          );
                        })}
                    </div>
                 </div>

                 {/* Skill Slots Section */}
                 <div className="space-y-4">
                    <div className="flex items-center gap-2">
                       <Zap size={16} className="text-yellow-500" />
                       <h3 className="text-xs font-black uppercase tracking-widest text-gray-400">{lang === 'zh' ? '技能槽' : 'SKILL SLOTS'}</h3>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        {[...Array(skillSlotsCount)].map((_, i) => {
                          const itemId = selectedSkills[i];
                          const item = itemId ? getSkillById(itemId) : null;
                          return (
                            <div key={`skill-${i}`} className="group relative">
                                <div className={cn(
                                  "aspect-square rounded-3xl flex flex-col items-center justify-center border-2 transition-all relative overflow-hidden",
                                  item 
                                    ? "bg-yellow-500/10 border-yellow-500/50 shadow-[0_0_20px_rgba(234,179,8,0.1)]" 
                                    : "bg-black/20 border-white/5 border-dashed"
                                )}>
                                  {item ? (
                                    <>
                                      <div className="w-16 h-16 mb-2 flex items-center justify-center">
                                          {(() => {
                                            const IconComponent = getSkillIcon(item.advIcon || 'trophy');
                                            return <IconComponent className="w-12 h-12 drop-shadow-lg" />;
                                          })()}
                                      </div>
                                      <div className="absolute bottom-3 text-[9px] font-black uppercase tracking-widest text-white/70">
                                          {item.name[lang]}
                                      </div>
                                      <button 
                                        onClick={() => toggleItem(item.id, 'skill')}
                                        className="absolute top-2 right-2 p-1 bg-red-500/20 text-red-400 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                      >
                                          <X size={12} />
                                      </button>
                                    </>
                                  ) : (
                                    <div className="flex flex-col items-center text-gray-700">
                                        <Lock size={20} className="mb-1" />
                                        <span className="text-[9px] font-black uppercase tracking-widest">Empty</span>
                                    </div>
                                  )}
                                </div>
                                <div className="mt-2 h-12 w-full bg-gradient-to-b from-white/[0.03] to-transparent rounded-b-3xl transform -scale-y-100 opacity-20 pointer-events-none" />
                            </div>
                          );
                        })}
                    </div>
                 </div>

                 {/* Bottom Section: Scrollable Inventory */}
                 <div className="flex-1 flex flex-col min-h-0 bg-black/40 rounded-3xl border border-white/5 overflow-hidden">
                    {/* Inventory Filter & Tabs */}
                    <div className="p-4 border-b border-white/5 flex flex-col md:flex-row gap-4 items-center">
                       <div className="flex bg-black/40 p-1 rounded-xl border border-white/5 self-stretch md:self-auto">
                          <button 
                            onClick={() => setActiveTab('skills')}
                            className={cn(
                              "px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                              activeTab === 'skills' ? "bg-yellow-500 text-black shadow-lg" : "text-gray-500 hover:text-white"
                            )}
                          >
                             {lang === 'zh' ? '技能' : 'SKILLS'}
                          </button>
                          <button 
                            onClick={() => setActiveTab('weapons')}
                            className={cn(
                              "px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                              activeTab === 'weapons' ? "bg-red-500 text-white shadow-lg" : "text-gray-500 hover:text-white"
                            )}
                          >
                             {lang === 'zh' ? '武器' : 'WEAPONS'}
                          </button>
                       </div>
                       
                       <div className="relative flex-1 self-stretch md:self-auto">
                          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                          <input 
                            type="text" 
                            placeholder={lang === 'zh' ? '搜索物品...' : 'Search items...'}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-yellow-500/50 transition-all"
                          />
                       </div>
                    </div>

                    {/* Grid of Items */}
                    <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
                       <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                          {filteredItems.map((item) => {
                             const isEquipped = item.type === 'skill' 
                                ? selectedSkills.includes(item.id)
                                : selectedWeapons.includes(item.id);
                             
                             const isFull = item.type === 'skill'
                                ? selectedSkills.length >= skillSlotsCount
                                : selectedWeapons.length >= weaponSlotsCount;

                             return (
                               <button 
                                 key={item.id}
                                 onClick={() => toggleItem(item.id, item.type as any)}
                                 disabled={!isEquipped && isFull}
                                 className={cn(
                                   "aspect-square rounded-2xl flex flex-col items-center justify-center border-2 transition-all relative group overflow-hidden",
                                   isEquipped 
                                     ? (item.type === 'skill' ? "bg-yellow-500 border-yellow-400" : "bg-red-500 border-red-400") 
                                     : "bg-white/5 border-white/5 hover:border-white/20",
                                   !isEquipped && isFull && "opacity-40 grayscale"
                                 )}
                               >
                                  {isEquipped && (
                                    <div className="absolute top-1 right-1">
                                       <Check size={12} className={item.type === 'skill' ? 'text-black' : 'text-white'} />
                                    </div>
                                  )}
                                  <div className="w-12 h-12 mb-1 group-hover:scale-110 transition-transform flex items-center justify-center">
                                     {(() => {
                                       const IconComponent = getSkillIcon(item.advIcon || (item.type === 'weapon' ? 'sword' : 'trophy'));
                                       return <IconComponent className="w-10 h-10" />;
                                     })()}
                                  </div>
                                  <span className={cn(
                                    "text-[8px] font-black uppercase tracking-tighter px-2 text-center truncate w-full",
                                    isEquipped ? (item.type === 'skill' ? 'text-black' : 'text-white') : "text-gray-400"
                                  )}>
                                     {item.name[lang]}
                                  </span>
                               </button>
                             );
                          })}
                       </div>
                    </div>
                 </div>
              </div>

           </div>
        </div>
      </div>
    </motion.div>
  );
};
