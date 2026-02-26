import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Shield, 
  BrainCircuit, 
  Zap, 
  Search, 
  X, 
  Check, 
  Info,
  ChevronDown,
  Sparkles,
  Sword,
  Save,
  Cpu,
  Star,
  Globe,
  Code2,
  FileText,
  Wrench,
  Bot,
  Keyboard,
  Wand2,
  Loader2,
  MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useMode } from '../contexts/ModeContext';
import { GlassCard, GameCard, ActionButton } from './ui-shared';
import { HeroInspector } from './HeroInspector';
import { cn } from '../lib/utils';
import { getRandomAvatar, getAvatarById } from '../lib/avatars';
import { getSkillIcon } from '../lib/skill-icons';

const availableModels = [
  { id: 'claude-3-5-sonnet', name: 'Claude 3.5 Sonnet', desc: 'Best balance of speed and intelligence', power: 90, speed: 85 },
  { id: 'claude-3-opus', name: 'Claude 3 Opus', desc: 'Most powerful model for complex tasks', power: 98, speed: 65 },
  { id: 'claude-3-haiku', name: 'Claude 3 Haiku', desc: 'Fastest and most cost-effective', power: 75, speed: 95 }
];

const mockSkills = [
  { id: 1, name: 'Web Search', icon: Globe, advIcon: 'swimming', desc: 'Browse the web for real-time info', source: 'Global' },
  { id: 2, name: 'Python Exec', icon: Code2, advIcon: 'chess', desc: 'Run Python scripts', source: 'Project', projectName: 'Analysis Core' },
  { id: 3, name: 'PDF Reader', icon: FileText, advIcon: 'sportsBottle', desc: 'Extract data from PDFs', source: 'Plugin', pluginNamespace: 'doc-parser' },
  { id: 4, name: 'UI Architect', icon: Wrench, advIcon: 'gymming', desc: 'Design UI components', source: 'Global' },
  { id: 5, name: 'API Generator', icon: Zap, advIcon: 'esports', desc: 'Create API boilerplates', source: 'Project', projectName: 'Backend Lab' }
];

interface AgentCreatorProps {
  onBack: () => void;
}

type CreationMode = 'manual' | 'ai' | null;

export const AgentCreator = ({ onBack }: AgentCreatorProps) => {
  const { mode, lang } = useMode();
  const [creationMode, setCreationMode] = useState<CreationMode>(null);
  const [step, setStep] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isConfiguringSkills, setIsConfiguringSkills] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    role: '',
    instructions: '',
    model: availableModels[0],
    selectedSkills: [] as number[],
    selectedWeapons: [] as number[],
    stats: { power: 80, wisdom: 85, speed: 75 },
    avatar: getRandomAvatar().id
  });

  const toggleSkill = (id: number) => {
    setFormData(prev => ({
      ...prev,
      selectedSkills: prev.selectedSkills.includes(id) 
        ? prev.selectedSkills.filter(sid => sid !== id)
        : [...prev.selectedSkills, id]
    }));
  };

  const nextStep = () => setStep(s => Math.min(s + 1, 3));
  const prevStep = () => setStep(s => Math.max(s - 1, 1));

  const handleGenerate = () => {
    if (!aiPrompt.trim()) return;
    setIsGenerating(true);
    
    // Simulate AI generation
    setTimeout(() => {
      setFormData({
        name: aiPrompt.length > 10 ? aiPrompt.substring(0, 15) + '...' : 'Generated Agent',
        role: 'AI Specialized Unit',
        instructions: `System instructions generated based on: "${aiPrompt}"\n\n1. Maintain a professional tone.\n2. Prioritize accuracy over speed.\n3. Verify all external data.`,
        model: availableModels[0],
        selectedSkills: [1, 2],
        selectedWeapons: [101],
        stats: { power: 85, wisdom: 92, speed: 78 },
        avatar: getRandomAvatar().id
      });
      setIsGenerating(false);
      setCreationMode('manual');
      setStep(1);
    }, 2000);
  };

  if (isConfiguringSkills) {
    return (
      <HeroInspector 
        agent={{ 
          ...formData, 
          name: { en: formData.name || 'New Hero', zh: formData.name || '新英雄' },
          role: { en: formData.role || 'Specialist', zh: formData.role || '专家' },
          stats: { wisdom: formData.stats.wisdom, power: formData.stats.power, speed: formData.stats.speed }
        }} 
        onBack={() => setIsConfiguringSkills(false)} 
        onSave={(skills, weapons) => {
          setFormData(prev => ({ ...prev, selectedSkills: skills, selectedWeapons: weapons }));
          setIsConfiguringSkills(false);
        }} 
      />
    );
  }

  const renderStepIndicator = () => (
    <div className="flex items-center gap-4 mb-12">
      {[1, 2, 3].map((s) => (
        <div key={s} className="flex items-center gap-2">
          <div className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-500",
            step >= s 
              ? (mode === 'adventure' ? "bg-yellow-500 text-black shadow-[0_0_15px_rgba(234,179,8,0.5)]" : "bg-blue-600 text-white shadow-lg")
              : "bg-white/5 text-gray-500 border border-white/10"
          )}>
            {step > s ? <Check size={16} /> : s}
          </div>
          <span className={cn(
            "text-[10px] font-black uppercase tracking-widest",
            step >= s ? "text-white" : "text-gray-600"
          )}>
            {s === 1 ? "Identity" : s === 2 ? "Cognition" : "Abilities"}
          </span>
          {s < 3 && <div className="w-12 h-[2px] bg-white/5" />}
        </div>
      ))}
    </div>
  );

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className={cn(
        "h-16 flex items-center justify-between px-6 border-b shrink-0",
        mode === 'adventure' ? "bg-[#121225] border-yellow-500/20" : "bg-white/[0.02] border-white/5 backdrop-blur-md"
      )}>
        <div className="flex items-center gap-4">
          <div>
            <h2 className={cn(
              "font-bold",
              mode === 'adventure' ? "text-yellow-500 uppercase tracking-widest text-sm" : "text-lg"
            )}>
              {creationMode === 'ai'
                ? (mode === 'adventure' ? 'Oracle Ritual' : 'AI Architect')
                : mode === 'adventure' ? 'Summon New Hero' : 'Create AI Agent'}
            </h2>
            <p className="text-[10px] text-gray-500 font-mono">
              {creationMode === 'ai' ? 'Neural Synthesis Engine' : 'Agent Configuration Protocol v2.4'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {creationMode === 'manual' && (
            <>
              <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/10">
                <Sparkles size={12} className="text-yellow-500" />
                <span className="text-[10px] font-bold text-gray-400 uppercase">AI Assisted Setup</span>
              </div>
              <ActionButton className="h-9 px-6 py-0 text-xs">
                <Save size={14} className="mr-2" />
                Finalize {mode === 'adventure' ? 'Summoning' : 'Agent'}
              </ActionButton>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-8 lg:p-12">
          <div className="max-w-3xl mx-auto h-full">
            <AnimatePresence mode="wait">
              {!creationMode && (
                <motion.div 
                  key="mode-selection"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="h-full flex flex-col items-center justify-center text-center space-y-12"
                >
                  <div className="space-y-4">
                    <h1 className={cn(
                      "text-5xl font-black italic tracking-tighter uppercase",
                      mode === 'adventure' ? "text-transparent bg-clip-text bg-gradient-to-r from-yellow-500 to-orange-600" : "text-white"
                    )}>
                      {mode === 'adventure' ? 'Choose Your Path' : 'Select Creation Method'}
                    </h1>
                    <p className="text-gray-400 max-w-lg mx-auto">
                      {mode === 'adventure' 
                        ? 'Will you forge your hero manually or seek the Oracle for a predestined champion?'
                        : 'Describe what you need and let our AI architect build it, or configure every detail yourself.'}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-2xl">
                    <button 
                      onClick={() => setCreationMode('ai')}
                      className={cn(
                        "group relative p-8 rounded-3xl border text-left transition-all duration-500 overflow-hidden",
                        mode === 'adventure' 
                          ? "bg-yellow-500/5 border-yellow-500/20 hover:border-yellow-500 hover:shadow-[0_0_30px_rgba(234,179,8,0.2)]" 
                          : "bg-blue-600/5 border-blue-600/20 hover:border-blue-600 hover:shadow-[0_0_30px_rgba(37,99,235,0.2)]"
                      )}
                    >
                      <div className={cn(
                        "w-16 h-16 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110 duration-500",
                        mode === 'adventure' ? "bg-yellow-500 text-black shadow-lg shadow-yellow-500/20" : "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                      )}>
                        <Sparkles size={32} />
                      </div>
                      <h3 className="text-2xl font-black italic uppercase tracking-wider mb-2">
                        {mode === 'adventure' ? 'The Oracle' : 'AI Architect'}
                      </h3>
                      <p className="text-sm text-gray-500 leading-relaxed mb-6">
                        {mode === 'adventure' 
                          ? 'Describe your hero and let the ancient magic forge their destiny.'
                          : 'Use natural language to describe your agent\'s role and goals.'}
                      </p>
                      <div className="flex items-center text-[10px] font-black uppercase tracking-widest text-gray-400 group-hover:text-white transition-colors">
                        Proceed <ArrowLeft className="ml-2 rotate-180" size={14} />
                      </div>
                      
                      {/* Decorative elements */}
                      <div className={cn(
                        "absolute -right-8 -bottom-8 w-32 h-32 opacity-10 group-hover:opacity-20 transition-opacity",
                        mode === 'adventure' ? "text-yellow-500" : "text-blue-500"
                      )}>
                        <Bot size={128} />
                      </div>
                    </button>

                    <button 
                      onClick={() => setCreationMode('manual')}
                      className={cn(
                        "group relative p-8 rounded-3xl border text-left transition-all duration-500 overflow-hidden",
                        "bg-white/5 border-white/10 hover:border-white/30 hover:bg-white/[0.07]"
                      )}
                    >
                      <div className="w-16 h-16 rounded-2xl bg-white/10 text-white flex items-center justify-center mb-6 transition-transform group-hover:scale-110 duration-500">
                        <Keyboard size={32} />
                      </div>
                      <h3 className="text-2xl font-black italic uppercase tracking-wider mb-2">
                        {mode === 'adventure' ? 'Manual Forge' : 'Manual Editor'}
                      </h3>
                      <p className="text-sm text-gray-500 leading-relaxed mb-6">
                        {mode === 'adventure' 
                          ? 'Take full control of every stat, skill, and instruction yourself.'
                          : 'Configure identity, models, and skills from scratch.'}
                      </p>
                      <div className="flex items-center text-[10px] font-black uppercase tracking-widest text-gray-400 group-hover:text-white transition-colors">
                        Proceed <ArrowLeft className="ml-2 rotate-180" size={14} />
                      </div>
                    </button>
                  </div>
                </motion.div>
              )}

              {creationMode === 'ai' && (
                <motion.div 
                  key="ai-mode"
                  initial={{ opacity: 0, scale: 1.05 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="h-full flex flex-col items-center justify-center max-w-xl mx-auto space-y-10"
                >
                  <div className="text-center space-y-4">
                    <div className={cn(
                      "w-20 h-20 rounded-3xl mx-auto flex items-center justify-center mb-6 relative",
                      mode === 'adventure' ? "bg-yellow-500 text-black" : "bg-blue-600 text-white"
                    )}>
                      <Bot size={40} />
                      <div className="absolute inset-0 rounded-3xl animate-ping opacity-20 bg-inherit" />
                    </div>
                    <h1 className={cn(
                      "text-4xl font-black italic tracking-tighter uppercase",
                      mode === 'adventure' ? "text-yellow-500" : "text-white"
                    )}>
                      {mode === 'adventure' ? 'Speak to the Oracle' : 'Describe your Agent'}
                    </h1>
                    <p className="text-gray-400">
                      {mode === 'adventure' 
                        ? 'What kind of legend are you looking to summon today?'
                        : 'Specify the role, required skills, and tone in plain English.'}
                    </p>
                  </div>

                  <div className="w-full space-y-6">
                    <div className="relative group">
                      <div className={cn(
                        "absolute inset-0 rounded-2xl blur-xl opacity-20 transition-opacity group-focus-within:opacity-40",
                        mode === 'adventure' ? "bg-yellow-500" : "bg-blue-600"
                      )} />
                      <textarea 
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        placeholder={mode === 'adventure' ? "e.g., A powerful mage who knows everything about the ancient databases..." : "e.g., A marketing specialist agent that can browse the web and write catchy copy..."}
                        className={cn(
                          "w-full h-40 bg-black/40 border border-white/10 rounded-2xl px-6 py-5 text-white focus:outline-none transition-all relative z-10 text-lg resize-none",
                          mode === 'adventure' ? "focus:border-yellow-500/50" : "focus:border-blue-600/50"
                        )}
                      />
                    </div>

                    <ActionButton 
                      onClick={handleGenerate} 
                      disabled={isGenerating || !aiPrompt.trim()}
                      className="w-full py-6 text-lg"
                    >
                      {isGenerating ? (
                        <div className="flex items-center gap-3">
                          <Loader2 size={24} className="animate-spin" />
                          <span>{mode === 'adventure' ? 'Summoning...' : 'Architecting...'}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <Wand2 size={24} />
                          <span>{mode === 'adventure' ? 'Forged by Destiny' : 'Generate Agent'}</span>
                        </div>
                      )}
                    </ActionButton>
                  </div>

                  <div className="flex flex-wrap justify-center gap-3">
                    {['Marketing Guru', 'Security Expert', 'Data Scientist'].map(tag => (
                      <button 
                        key={tag}
                        onClick={() => setAiPrompt(tag)}
                        className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-xs font-bold text-gray-400 hover:text-white hover:border-white/30 transition-all"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {creationMode === 'manual' && (
                <div className="space-y-8">
                  {renderStepIndicator()}
                  <AnimatePresence mode="wait">
                    {step === 1 && (
                      <motion.div 
                        key="step1"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-8"
                      >
                        <div className="space-y-2">
                          <h1 className={cn(
                            "text-3xl font-black italic tracking-tighter uppercase",
                            mode === 'adventure' ? "text-yellow-500" : "text-white"
                          )}>
                            Define the Essence
                          </h1>
                          <p className="text-gray-400">Every agent needs a name and a clearly defined purpose in the vanguard.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Agent Name</label>
                            <input 
                              type="text" 
                              value={formData.name}
                              onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                              placeholder="e.g., Backend Sentinel"
                              className={cn(
                                "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none transition-all",
                                mode === 'adventure' ? "focus:border-yellow-500/50" : "focus:border-blue-500/50"
                              )}
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Primary Role</label>
                            <input 
                              type="text" 
                              value={formData.role}
                              onChange={e => setFormData(p => ({ ...p, role: e.target.value }))}
                              placeholder="e.g., Infrastructure Specialist"
                              className={cn(
                                "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none transition-all",
                                mode === 'adventure' ? "focus:border-yellow-500/50" : "focus:border-blue-500/50"
                              )}
                            />
                          </div>
                        </div>

                        {mode === 'adventure' && (
                          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-6">
                            <div className="w-24 h-24 rounded-full border-4 border-yellow-500/30 shrink-0 shadow-2xl relative group bg-gradient-to-br from-yellow-500/20 to-orange-500/20 flex items-center justify-center">
                              {(() => {
                                const AvatarIcon = getAvatarById(formData.avatar).icon;
                                return <AvatarIcon className="w-12 h-12 text-yellow-500" />;
                              })()}
                              <button
                                onClick={() => setFormData(p => ({ ...p, avatar: getRandomAvatar().id }))}
                                className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full"
                              >
                                <Zap size={20} className="text-yellow-500" />
                              </button>
                            </div>
                            <div>
                              <p className="text-[10px] font-black text-yellow-500 uppercase tracking-[0.2em] mb-1">Destined Appearance</p>
                              <h3 className="text-xl font-black italic uppercase tracking-wider text-white">
                                {getAvatarById(formData.avatar).name}
                              </h3>
                              <p className="text-xs text-gray-500 mt-1">The Oracle has chosen this form for your warrior. Tap to reroll destiny.</p>
                            </div>
                          </div>
                        )}

                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Core Directives (System Instructions)</label>
                          <textarea 
                            value={formData.instructions}
                            onChange={e => setFormData(p => ({ ...p, instructions: e.target.value }))}
                            placeholder="Define how this agent should behave, its tone, and its boundaries..."
                            className={cn(
                              "w-full h-48 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none transition-all resize-none",
                              mode === 'adventure' ? "focus:border-yellow-500/50" : "focus:border-blue-500/50"
                            )}
                          />
                        </div>

                        <div className="flex justify-end">
                          <ActionButton onClick={nextStep} className="px-10">Next Strategy</ActionButton>
                        </div>
                      </motion.div>
                    )}

                    {step === 2 && (
                      <motion.div 
                        key="step2"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-8"
                      >
                        <div className="space-y-2">
                          <h1 className={cn(
                            "text-3xl font-black italic tracking-tighter uppercase",
                            mode === 'adventure' ? "text-yellow-500" : "text-white"
                          )}>
                            Choose the Intellect
                          </h1>
                          <p className="text-gray-400">Select the cognitive core that will drive your agent's decision making.</p>
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                          {availableModels.map((model) => (
                            <button 
                              key={model.id}
                              onClick={() => setFormData(p => ({ ...p, model }))}
                              className={cn(
                                "p-6 rounded-2xl border transition-all text-left flex items-center justify-between group",
                                formData.model.id === model.id 
                                  ? (mode === 'adventure' ? "bg-yellow-500/10 border-yellow-500" : "bg-blue-600/10 border-blue-600")
                                  : "bg-white/5 border-white/5 hover:border-white/20"
                              )}
                            >
                              <div className="flex items-center gap-6">
                                <div className={cn(
                                  "w-12 h-12 rounded-xl flex items-center justify-center transition-all",
                                  formData.model.id === model.id 
                                    ? (mode === 'adventure' ? "bg-yellow-500 text-black shadow-[0_0_20px_rgba(234,179,8,0.4)]" : "bg-blue-600 text-white")
                                    : "bg-white/10 text-gray-500"
                                )}>
                                  <Cpu size={24} />
                                </div>
                                <div>
                                  <h3 className="text-lg font-bold text-white mb-1">{model.name}</h3>
                                  <p className="text-xs text-gray-400">{model.desc}</p>
                                </div>
                              </div>
                              <div className="flex gap-4">
                                <div className="text-right">
                                  <p className="text-[10px] font-black text-gray-500 uppercase">Power</p>
                                  <p className="text-sm font-bold text-white">{model.power}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-[10px] font-black text-gray-500 uppercase">Speed</p>
                                  <p className="text-sm font-bold text-white">{model.speed}</p>
                                </div>
                                <div className={cn(
                                  "w-6 h-6 rounded-full border-2 flex items-center justify-center ml-4",
                                  formData.model.id === model.id 
                                    ? (mode === 'adventure' ? "border-yellow-500 bg-yellow-500 text-black" : "border-blue-600 bg-blue-600 text-white")
                                    : "border-white/10"
                                )}>
                                  {formData.model.id === model.id && <Check size={14} />}
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>

                        <div className="flex justify-between">
                          <ActionButton variant="secondary" onClick={prevStep} className="px-10">Retreat</ActionButton>
                          <ActionButton onClick={nextStep} className="px-10">Arm Agent</ActionButton>
                        </div>
                      </motion.div>
                    )}

                    {step === 3 && (
                      <motion.div 
                        key="step3"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-8"
                      >
                        <div className="space-y-2">
                          <h1 className={cn(
                            "text-3xl font-black italic tracking-tighter uppercase",
                            mode === 'adventure' ? "text-yellow-500" : "text-white"
                          )}>
                            Equip Ancient Skills
                          </h1>
                          <p className="text-gray-400">Grant your agent specialized abilities by connecting created skills.</p>
                        </div>

                        <div className="relative mb-6">
                          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                          <input 
                            type="text" 
                            placeholder="Search available skills..."
                            className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white focus:outline-none focus:border-white/20 transition-all"
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {mode === 'adventure' && (
                            <button 
                              onClick={() => setIsConfiguringSkills(true)}
                              className="col-span-1 sm:col-span-2 p-8 rounded-2xl border-2 border-dashed border-yellow-500/30 bg-yellow-500/5 hover:bg-yellow-500/10 hover:border-yellow-500 transition-all flex flex-col items-center justify-center gap-4 group mb-4"
                            >
                               <div className="w-16 h-16 rounded-2xl bg-yellow-500 text-black flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                  <Wand2 size={32} />
                                </div>
                                <div className="text-center">
                                   <h3 className="text-xl font-black italic uppercase tracking-wider text-white">打开背包</h3>
                                   <p className="text-sm text-gray-500 mt-1">进入英雄背包，配置强力技能与神兵利器</p>
                                </div>
                            </button>
                          )}
                          {mockSkills.map((skill) => (
                            <button 
                              key={skill.id}
                              onClick={() => toggleSkill(skill.id)}
                              className={cn(
                                "p-4 rounded-xl border transition-all text-left group flex items-start gap-4",
                                formData.selectedSkills.includes(skill.id) 
                                  ? (mode === 'adventure' ? "bg-yellow-500/10 border-yellow-500" : "bg-blue-600/10 border-blue-600")
                                  : "bg-white/5 border-white/5 hover:border-white/20"
                              )}
                            >
                              <div className={cn(
                                "w-10 h-10 rounded-lg flex items-center justify-center transition-all shrink-0 overflow-hidden",
                                formData.selectedSkills.includes(skill.id)
                                  ? (mode === 'adventure' ? "bg-yellow-500 text-black shadow-lg" : "bg-blue-600 text-white")
                                  : "bg-white/10 text-gray-500"
                              )}>
                                {mode === 'adventure' ? (
                                  (() => {
                                    const IconComponent = getSkillIcon(skill.advIcon);
                                    return <IconComponent className="w-6 h-6" />;
                                  })()
                                ) : (
                                  <skill.icon size={20} />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-white mb-0.5 truncate">{skill.name}</h3>
                                { (skill as any).projectName && (
                                  <p className="text-[9px] text-green-500 font-bold uppercase truncate opacity-70 mb-0.5">
                                    Project: {(skill as any).projectName}
                                  </p>
                                )}
                                { (skill as any).pluginNamespace && (
                                  <p className="text-[9px] text-orange-500 font-bold uppercase truncate opacity-70 mb-0.5">
                                    Plugin: {(skill as any).pluginNamespace}
                                  </p>
                                )}
                                <p className="text-[10px] text-gray-500 line-clamp-1">{skill.desc}</p>
                              </div>
                              <div className={cn(
                                "w-5 h-5 rounded-md border flex items-center justify-center shrink-0",
                                formData.selectedSkills.includes(skill.id) 
                                  ? (mode === 'adventure' ? "border-yellow-500 bg-yellow-500 text-black" : "border-blue-600 bg-blue-600 text-white")
                                  : "border-white/10"
                              )}>
                                {formData.selectedSkills.includes(skill.id) && <Check size={12} />}
                              </div>
                            </button>
                          ))}
                        </div>

                        <div className="flex justify-between">
                          <ActionButton variant="secondary" onClick={prevStep} className="px-10">Retreat</ActionButton>
                          <ActionButton onClick={() => {}} className="px-10">Summon Agent</ActionButton>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Preview Sidebar - Only show if not in selection mode */}
        {creationMode && (
          <div className={cn(
            "w-96 border-l hidden xl:flex flex-col p-8 overflow-y-auto",
            mode === 'adventure' ? "bg-[#0c0c1a] border-yellow-500/10" : "bg-black/20 border-white/5"
          )}>
            <div className="space-y-8">
              <h2 className="text-[10px] font-black uppercase tracking-widest text-gray-500">Real-time Preview</h2>
              
              {mode === 'adventure' ? (
                <GameCard rarity="legendary" className="p-0 overflow-hidden">
                  <div className="h-40 bg-black/40 flex items-center justify-center relative">
                     <div className="absolute inset-0 bg-gradient-to-t from-[#1a1a2e] to-transparent opacity-60" />
                     <Shield size={80} className="text-yellow-500 relative z-10 drop-shadow-[0_0_20px_rgba(234,179,8,0.5)]" />
                     <div className="absolute top-4 right-4 bg-black/60 px-2 py-1 rounded text-[10px] font-black italic tracking-tighter uppercase border border-yellow-500/20">LVL 1</div>
                  </div>
                  <div className="p-6">
                     <div className="text-center mb-6">
                        <h3 className="text-xl font-black italic uppercase tracking-wider text-white truncate">{formData.name || 'Unnamed Hero'}</h3>
                        <p className="text-[9px] font-bold text-yellow-500 uppercase tracking-widest">{formData.role || 'New Recruit'}</p>
                     </div>
                     <div className="space-y-3 mb-6">
                        {[
                          { label: 'Wisdom', value: formData.model.power, icon: BrainCircuit, color: 'text-purple-400' },
                          { label: 'Strength', value: 70, icon: Sword, color: 'text-red-400' },
                          { label: 'Agility', value: formData.model.speed, icon: Zap, color: 'text-yellow-400' },
                        ].map(stat => (
                          <div key={stat.label} className="space-y-1">
                            <div className="flex justify-between items-center text-[8px] font-black uppercase">
                              <span className="text-gray-500">{stat.label}</span>
                              <span className="text-white">{stat.value}</span>
                            </div>
                            <div className="w-full h-1 bg-black/60 rounded-full overflow-hidden">
                               <div className={cn("h-full bg-gradient-to-r", stat.color.replace('text', 'from'), "to-transparent")} style={{ width: `${stat.value}%` }} />
                            </div>
                          </div>
                        ))}
                     </div>
                     <div className="flex flex-wrap gap-2 mb-6">
                        {formData.selectedWeapons?.length > 0 && (
                           <div className="flex gap-1">
                              {formData.selectedWeapons.map(id => (
                                <div key={`weapon-preview-${id}`} className="w-6 h-6 rounded bg-black/40 border border-red-500/20 flex items-center justify-center text-red-500">
                                   <Sword size={12} />
                                </div>
                              ))}
                           </div>
                        )}
                        <div className="flex flex-wrap gap-1">
                           {formData.selectedSkills.map(id => {
                             const skill = mockSkills.find(s => s.id === id);
                             return skill ? (
                               <div key={`skill-preview-${id}`} className="w-6 h-6 rounded bg-black/40 border border-yellow-500/20 flex items-center justify-center text-yellow-500">
                                  <skill.icon size={12} />
                               </div>
                             ) : null;
                           })}
                        </div>
                     </div>
                  </div>
                </GameCard>
              ) : (
                <GlassCard className="p-0 overflow-hidden">
                  <div className="p-6 border-b border-white/5 bg-white/[0.02]">
                     <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-600/30 flex items-center justify-center text-blue-400">
                           <Cpu size={24} />
                        </div>
                        <div>
                           <h3 className="font-bold text-white text-lg truncate">{formData.name || 'Untitled Agent'}</h3>
                           <p className="text-xs text-gray-500">{formData.role || 'System Agent'}</p>
                        </div>
                     </div>
                  </div>
                  <div className="p-6 space-y-6">
                     <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                          <p className="text-[8px] font-black text-gray-500 uppercase mb-1">Model</p>
                          <p className="text-[11px] font-bold text-white">{formData.model.name.split(' ').pop()}</p>
                        </div>
                        <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                          <p className="text-[8px] font-black text-gray-500 uppercase mb-1">Capabilities</p>
                          <p className="text-[11px] font-bold text-white">{(formData.selectedSkills?.length || 0) + (formData.selectedWeapons?.length || 0)} Items</p>
                        </div>
                     </div>
                     <div className="space-y-3">
                        <p className="text-[8px] font-black text-gray-500 uppercase">Skill Inventory</p>
                        <div className="flex flex-wrap gap-2">
                           {formData.selectedSkills.length === 0 ? (
                             <p className="text-[10px] text-gray-600 italic">No skills equipped yet...</p>
                           ) : (
                             formData.selectedSkills.map(id => {
                               const skill = mockSkills.find(s => s.id === id);
                               return skill ? (
                                 <div key={id} className="flex items-center gap-2 bg-white/5 px-2 py-1 rounded border border-white/5">
                                    <skill.icon size={10} className="text-blue-400" />
                                    <span className="text-[9px] text-gray-300 font-medium">{skill.name}</span>
                                 </div>
                               ) : null;
                             })
                           )}
                        </div>
                     </div>
                     <div className="p-3 rounded-lg bg-blue-600/5 border border-blue-600/20">
                        <div className="flex items-start gap-2">
                          <Info size={12} className="text-blue-400 mt-0.5" />
                          <p className="text-[10px] text-gray-400 leading-relaxed">Agent is ready for deployment once mandatory directives are finalized.</p>
                        </div>
                     </div>
                  </div>
                </GlassCard>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
