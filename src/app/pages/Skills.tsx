import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  Plus, 
  MoreVertical, 
  Code2, 
  FileText, 
  Wrench, 
  Globe,
  Star,
  BookOpen,
  Zap,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink
} from 'lucide-react';
import { useMode } from '../contexts/ModeContext';
import { useTranslation } from '../hooks/useTranslation';
import { GlassCard, GameCard, ActionButton } from '../components/ui-shared';
import { motion, AnimatePresence } from 'motion/react';
import { SkillEditor } from '../components/SkillEditor';
import { getSkillIcon } from '../lib/skill-icons';

const mockSkills = [
  { 
    id: 1, 
    name: { en: 'Web Search', zh: '网页搜索' }, 
    icon: Globe, 
    advIcon: 'swimming', 
    desc: { en: 'Browse the web to fetch real-time information and documentation.', zh: '浏览网页以获取实时信息和文档。' }, 
    tags: { en: ['Browsing', 'Data'], zh: ['浏览', '数据'] }, 
    source: 'Global', 
    status: 'enabled', 
    rarity: 'rare', 
    level: 5, 
    xp: 85, 
    usage: 1240 
  },
  { 
    id: 2, 
    name: { en: 'Python Exec', zh: 'Python 执行' }, 
    icon: Code2, 
    advIcon: 'chess', 
    desc: { en: 'Run Python scripts in a sandboxed environment for data analysis.', zh: '在沙盒环境中运行 Python 脚本进行数据分析。' }, 
    tags: { en: ['Dev', 'Logic'], zh: ['开发', '逻辑'] }, 
    source: 'Project', 
    status: 'enabled', 
    rarity: 'epic', 
    level: 8, 
    xp: 42, 
    usage: 3450 
  },
  { 
    id: 3, 
    name: { en: 'PDF Reader', zh: 'PDF 阅读器' }, 
    icon: FileText, 
    advIcon: 'sportsBottle', 
    desc: { en: 'Parse and extract text/images from PDF files of any size.', zh: '解析并提取任何大小的 PDF 文件中的文本/图像。' }, 
    tags: { en: ['Data', 'Docs'], zh: ['数据', '文档'] }, 
    source: 'Plugin', 
    status: 'disabled', 
    rarity: 'common', 
    level: 2, 
    xp: 12, 
    usage: 450 
  },
  { 
    id: 4, 
    name: { en: 'API Generator', zh: 'API 生成器' }, 
    icon: Zap, 
    advIcon: 'esports', 
    desc: { en: 'Automatically generate REST or GraphQL API boilerplate code.', zh: '自动生成 REST 或 GraphQL API 样板代码。' }, 
    tags: { en: ['Dev', 'Gen'], zh: ['开发', '生成'] }, 
    source: 'Project', 
    status: 'enabled', 
    rarity: 'legendary', 
    level: 12, 
    xp: 95, 
    usage: 5600 
  },
  { 
    id: 5, 
    name: { en: 'UI Architect', zh: 'UI 架构师' }, 
    icon: Wrench, 
    advIcon: 'gymming', 
    desc: { en: 'Design complex React components from verbal descriptions.', zh: '根据口头描述设计复杂的 React 组件。' }, 
    tags: { en: ['UI', 'React'], zh: ['UI', 'React'] }, 
    source: 'Global', 
    status: 'enabled', 
    rarity: 'epic', 
    level: 7, 
    xp: 68, 
    usage: 1890 
  },
  { 
    id: 6, 
    name: { en: 'Log Analyzer', zh: '日志分析器' }, 
    icon: Clock, 
    advIcon: 'stopwatch', 
    desc: { en: 'Identify patterns and bugs in massive log files using AI.', zh: '使用 AI 在海量日志文件中识别模式和错误。' }, 
    tags: { en: ['DevOps', 'QA'], zh: ['运维', '质检'] }, 
    source: 'Plugin', 
    status: 'enabled', 
    rarity: 'rare', 
    level: 4, 
    xp: 33, 
    usage: 980 
  },
];

const Skills = () => {
  const { mode, lang } = useMode();
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [isCreating, setIsCreating] = useState(false);
  const [initialEditorMode, setInitialEditorMode] = useState<'ai' | 'manual'>('ai');

  const filteredSkills = mockSkills.filter(s => {
    const name = s.name[lang] || s.name.en;
    const matchesSearch = name.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'All' || s.source === filter;
    return matchesSearch && matchesFilter;
  });

  if (isCreating) {
    return <SkillEditor onBack={() => setIsCreating(false)} initialMode={initialEditorMode} />;
  }

  if (mode === 'adventure') {
    return (
      <div className="space-y-8 pb-20">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-4xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600 uppercase">
              {t('skillsTitle' as any)}
            </h1>
            <p className="text-gray-400 font-medium">{t('skillsDesc' as any)}</p>
          </div>
          <ActionButton onClick={() => { setIsCreating(true); setInitialEditorMode('ai'); }}>{t('forgeSkill' as any)}</ActionButton>
        </header>

        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row gap-4 bg-[#121225] p-4 rounded-xl border border-yellow-500/20 shadow-[0_0_20px_rgba(0,0,0,0.3)]">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-yellow-500/50" size={18} />
            <input 
              type="text" 
              placeholder={t('searchScrolls' as any)}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-black/40 border border-yellow-500/30 rounded-lg py-2 pl-10 pr-4 text-yellow-100 placeholder:text-yellow-500/30 focus:outline-none focus:border-yellow-500 transition-all"
            />
          </div>
          <div className="flex gap-2">
            {['All', 'Global', 'Plugin', 'Project'].map(f => (
              <button 
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${
                  filter === f ? 'bg-yellow-500 text-black' : 'bg-black/40 text-yellow-500/60 hover:bg-black/60'
                }`}
              >
                {t(f.toLowerCase() as any)}
              </button>
            ))}
          </div>
        </div>

        {/* Library Shelves */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          <AnimatePresence>
            {filteredSkills.map((skill, idx) => (
              <motion.div
                key={skill.id}
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <GameCard rarity={skill.rarity as any} className="group h-full flex flex-col p-0 overflow-visible">
                  {/* Card Front */}
                  <div className="p-6 flex-1 flex flex-col items-center text-center">
                    <div className="w-24 h-24 relative mb-6 group-hover:scale-110 transition-transform duration-500">
                      <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${
                        skill.rarity === 'legendary' ? 'from-yellow-400/20 to-yellow-600/20 shadow-[0_0_20px_rgba(234,179,8,0.3)]' :
                        skill.rarity === 'epic' ? 'from-purple-500/20 to-purple-700/20' :
                        skill.rarity === 'rare' ? 'from-blue-500/20 to-blue-700/20' : 'from-gray-500/20 to-gray-700/20'
                      } blur-xl`} />
                      <img 
                        src={getSkillIcon(skill.advIcon || 'trophy')} 
                        alt={skill.name[lang]}
                        className="w-full h-full object-contain relative z-10 drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)]"
                      />
                    </div>
                    
                    <h3 className="text-xl font-black uppercase italic text-white tracking-widest mb-1">{skill.name[lang]}</h3>
                    <div className="flex gap-1 mb-3">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} size={12} className={i < (skill.level / 3) ? 'fill-yellow-500 text-yellow-500' : 'text-gray-600'} />
                      ))}
                    </div>
                    
                    <p className="text-xs text-gray-400 line-clamp-2 mb-4 leading-relaxed italic">"{skill.desc[lang]}"</p>
                    
                    <div className="w-full mt-auto space-y-2">
                      <div className="flex justify-between text-[10px] font-black uppercase tracking-tighter">
                        <span className="text-yellow-500">{t('lvl' as any)} {skill.level}</span>
                        <span className="text-gray-500">{skill.xp}/100 {t('xp' as any)}</span>
                      </div>
                      <div className="w-full h-1.5 bg-black/40 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${skill.xp}%` }}
                          transition={{ duration: 1, delay: 0.5 }}
                          className={`h-full bg-gradient-to-r ${
                            skill.rarity === 'legendary' ? 'from-yellow-600 to-yellow-300' :
                            skill.rarity === 'epic' ? 'from-purple-600 to-purple-300' : 'from-blue-600 to-blue-300'
                          }`}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Card Actions */}
                  <div className="bg-black/40 p-4 border-t border-white/5 flex justify-between items-center rounded-b-xl">
                    <div className="flex gap-2">
                      {skill.tags[lang].map(t => (
                        <span key={t} className="text-[9px] font-bold text-gray-500 bg-white/5 px-2 py-0.5 rounded border border-white/5 uppercase">{t}</span>
                      ))}
                    </div>
                    <button className="text-yellow-500 hover:text-yellow-400 transition-colors">
                      <ExternalLink size={16} />
                    </button>
                  </div>
                </GameCard>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('skillsTitle' as any)}</h1>
          <p className="text-gray-400">{t('skillsDesc' as any)}</p>
        </div>
        <div className="flex gap-3">
          <ActionButton variant="secondary">{t('syncSkills' as any)}</ActionButton>
          <ActionButton onClick={() => { setIsCreating(true); setInitialEditorMode('ai'); }}>{t('genAi' as any)}</ActionButton>
        </div>
      </header>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder={t('searchScrolls' as any)}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 focus:outline-none focus:border-blue-500/50 transition-all"
          />
        </div>
        <div className="flex bg-white/5 rounded-xl p-1 border border-white/10">
          {['All', 'Global', 'Plugin', 'Project'].map(f => (
            <button 
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filter === f ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:text-white'
              }`}
            >
              {t(f.toLowerCase() as any)}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <AnimatePresence>
          {filteredSkills.map((skill, idx) => (
            <motion.div
              key={skill.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <GlassCard className="h-full flex flex-col group">
                <div className="flex justify-between items-start mb-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    skill.status === 'enabled' ? 'bg-blue-600/20 text-blue-400' : 'bg-gray-700/20 text-gray-500'
                  }`}>
                    <skill.icon size={20} />
                  </div>
                  <div className="flex gap-2">
                    <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      skill.source === 'Global' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
                      skill.source === 'Plugin' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                      'bg-green-500/20 text-green-400 border border-green-500/30'
                    }`}>
                      {t(skill.source.toLowerCase() as any)}
                    </div>
                    <button className="text-gray-500 hover:text-white transition-colors">
                      <MoreVertical size={16} />
                    </button>
                  </div>
                </div>

                <h3 className="text-lg font-bold mb-1">{skill.name[lang]}</h3>
                <p className="text-xs text-gray-400 line-clamp-2 mb-4">{skill.desc[lang]}</p>
                
                <div className="flex flex-wrap gap-2 mb-6 mt-auto">
                  {skill.tags[lang].map(t => (
                    <span key={t} className="text-[10px] text-gray-400 bg-white/5 px-2 py-0.5 rounded border border-white/5">{t}</span>
                  ))}
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-white/5">
                  <div className="items-center gap-2 flex">
                    <span className={`w-2 h-2 rounded-full ${skill.status === 'enabled' ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{t(skill.status as any)}</span>
                  </div>
                  <span className="text-[10px] text-gray-500 font-mono">{skill.usage.toLocaleString()} {t('runs' as any)}</span>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Create Card */}
        <button 
          onClick={() => { setIsCreating(true); setInitialEditorMode('manual'); }}
          className="group border-2 border-dashed border-white/10 rounded-2xl p-6 flex flex-col items-center justify-center gap-3 hover:border-blue-500/50 hover:bg-blue-500/5 transition-all cursor-pointer"
        >
          <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-gray-400 group-hover:bg-blue-500 group-hover:text-white transition-all">
            <Plus size={24} />
          </div>
          <p className="font-bold text-gray-400 group-hover:text-blue-400">{t('addSkill' as any)}</p>
        </button>
      </div>
    </div>
  );
};

export default Skills;
