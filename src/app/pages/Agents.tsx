import React, { useState, useEffect } from 'react';
import {
  Users,
  Shield,
  Sword,
  BrainCircuit,
  MessageSquare,
  Settings2,
  Cpu,
  Star,
  Zap,
  MoreVertical,
  Terminal,
  Code2
} from 'lucide-react';
import { useMode } from '../contexts/ModeContext';
import { useTranslation } from '../hooks/useTranslation';
import { GlassCard, GameCard, ActionButton } from '../components/ui-shared';
import { motion } from 'motion/react';
import { AgentCreator } from '../components/AgentCreator';
import { HeroInspector } from '../components/HeroInspector';
import { heroAvatars, getAvatarById } from '../lib/avatars';
import { agentsApi } from '@/lib/api';
import type { Agent } from '@/lib/api';

const Agents = () => {
  const { mode, lang } = useMode();
  const { t } = useTranslation();
  const [isCreating, setIsCreating] = useState(false);
  const [isInspecting, setIsInspecting] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<any>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await agentsApi.list();
      setAgents(response.items);
    } catch (err) {
      console.error('Failed to fetch agents:', err);
      setError(err instanceof Error ? err.message : 'Failed to load agents');
    } finally {
      setLoading(false);
    }
  };

  const handleInspect = (agent: any) => {
    setSelectedAgent(agent);
    setIsInspecting(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading agents...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-red-500 mb-4">Error: {error}</p>
          <ActionButton onClick={fetchAgents}>Retry</ActionButton>
        </div>
      </div>
    );
  }

  if (isCreating) {
    return <AgentCreator onBack={() => { setIsCreating(false); fetchAgents(); }} />;
  }

  if (isInspecting && selectedAgent) {
    return (
      <HeroInspector
        agent={selectedAgent}
        onBack={() => setIsInspecting(false)}
        onSave={(skills) => {
          setIsInspecting(false);
          fetchAgents();
        }}
      />
    );
  }

  if (mode === 'adventure') {
    return (
      <div className="space-y-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-4xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600 uppercase">
              {t('heroTitle' as any)}
            </h1>
            <p className="text-gray-400 font-medium">{t('heroDesc' as any)}</p>
          </div>
          <ActionButton onClick={() => setIsCreating(true)}>{t('summonHero' as any)}</ActionButton>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {agents.map((agent, idx) => {
            const avatars = ['vanguard_10', 'vanguard_7', 'vanguard_1', 'vanguard_12'];
            const avatar = avatars[idx % avatars.length];
            const rarity = agent.avg_rating && agent.avg_rating >= 4.5 ? 'legendary' :
                          agent.avg_rating && agent.avg_rating >= 4 ? 'epic' : 'rare';
            const level = Math.min(32, Math.floor(agent.usage_count / 50));
            const stats = {
              wisdom: Math.min(100, 60 + (agent.skill_ids?.length || 0) * 5),
              power: Math.min(100, 50 + agent.usage_count / 10),
              speed: Math.min(100, 70 + Math.random() * 30)
            };

            return (
              <motion.div
                key={agent.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
              >
                <GameCard rarity={rarity as any} className="p-0 overflow-visible h-full flex flex-col md:flex-row group min-h-[280px]">
                  <div className="relative w-full md:w-[45%] bg-[#1a1b26] rounded-t-2xl md:rounded-l-2xl md:rounded-tr-none overflow-hidden flex items-center justify-center pt-8 md:pt-0">
                    <div className="absolute top-10 -left-10 w-32 h-32 bg-orange-500/20 rounded-full blur-3xl" />
                    <div className="absolute bottom-10 -right-10 w-40 h-40 bg-purple-500/20 rounded-full blur-3xl" />

                    <div className="absolute inset-0 opacity-20">
                      {[...Array(8)].map((_, i) => (
                        <div
                          key={i}
                          className="absolute w-1 h-1 bg-white rounded-full animate-pulse"
                          style={{
                            top: `${Math.random() * 100}%`,
                            left: `${Math.random() * 100}%`,
                            animationDelay: `${Math.random() * 2}s`
                          }}
                        />
                      ))}
                    </div>

                    <div className="relative z-10 w-full h-full group-hover:scale-110 transition-transform duration-700 flex items-end justify-center overflow-visible">
                      <img
                        src={getAvatarById(avatar).img}
                        alt={agent.name}
                        className="w-full h-[135%] object-contain object-bottom drop-shadow-[0_20px_40px_rgba(0,0,0,0.8)] translate-y-[2px]"
                      />
                    </div>

                    <div className="absolute top-4 left-4 bg-black/60 px-3 py-1 rounded-full border border-white/10 text-[10px] font-black italic tracking-tighter uppercase z-20 text-yellow-500">
                      {t('lvl' as any)} {level}
                    </div>

                    <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-[#1a1a2e] to-transparent z-10 hidden md:block" />
                  </div>

                  <div className="p-8 flex-1 flex flex-col relative z-20">
                    <div className="mb-6">
                      <h3 className="text-2xl font-black italic tracking-wider uppercase mb-0.5 text-white">{agent.name}</h3>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-yellow-500 tracking-[0.2em] uppercase">{agent.type}</span>
                        <div className="h-px flex-1 bg-white/10" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 mb-6">
                      {[
                        { label: t('intel' as any), value: stats.wisdom, icon: BrainCircuit, color: 'text-purple-400' },
                        { label: t('strength' as any), value: stats.power, icon: Sword, color: 'text-red-400' },
                        { label: t('agility' as any), value: stats.speed, icon: Zap, color: 'text-yellow-400' },
                      ].map(stat => (
                        <div key={stat.label} className="space-y-1">
                          <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest">
                            <div className="flex items-center gap-1">
                              <stat.icon size={10} className={stat.color} />
                              <span className="text-gray-400">{stat.label}</span>
                            </div>
                            <span className="text-white">{Math.round(stat.value)}</span>
                          </div>
                          <div className="w-full h-1 bg-black/40 rounded-full overflow-hidden">
                            <div className={`h-full bg-gradient-to-r ${stat.color === 'text-purple-400' ? 'from-purple-600 to-purple-400' : stat.color === 'text-red-400' ? 'from-red-600 to-red-400' : 'from-yellow-600 to-yellow-400'}`} style={{ width: `${stat.value}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-auto pt-4 border-t border-white/5 flex justify-between items-center">
                      <div className="flex -space-x-1">
                        {[...Array(Math.min(agent.skill_ids?.length || 0, 5))].map((_, i) => (
                          <div key={i} className="w-7 h-7 rounded-lg bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-[9px] text-yellow-500 font-bold shadow-xl">
                            {i === 4 ? `+${(agent.skill_ids?.length || 0) - 4}` : <Star size={10} fill="currentColor" />}
                          </div>
                        ))}
                      </div>
                      <ActionButton
                        variant="secondary"
                        className="py-1 px-5 text-[10px] uppercase font-black tracking-widest"
                        onClick={() => handleInspect(agent)}
                      >
                        {t('inspectHero' as any)}
                      </ActionButton>
                    </div>
                  </div>
                </GameCard>
              </motion.div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('heroTitle' as any)}</h1>
          <p className="text-gray-400">{t('heroDesc' as any)}</p>
        </div>
        <div className="flex gap-3">
          <ActionButton variant="secondary">{t('importAgent' as any)}</ActionButton>
          <ActionButton onClick={() => setIsCreating(true)}>{t('createAgent' as any)}</ActionButton>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {agents.map((agent) => {
          const colors = ['blue', 'purple', 'green', 'orange'];
          const color = colors[agent.id % colors.length];

          return (
            <GlassCard key={agent.id} className="flex flex-col">
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-2xl bg-${color}-500/20 border border-${color}-500/30 flex items-center justify-center text-${color}-500`}>
                    <Cpu size={28} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">{agent.name}</h3>
                    <p className="text-xs text-gray-500">{agent.type}</p>
                  </div>
                </div>
                <button className="text-gray-500 hover:text-white transition-colors">
                  <MoreVertical size={20} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                  <p className="text-[10px] text-gray-500 uppercase font-black mb-1">{t('model' as any)}</p>
                  <p className="text-sm font-bold">Claude</p>
                </div>
                <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                  <p className="text-[10px] text-gray-500 uppercase font-black mb-1">{t('status' as any)}</p>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <p className="text-sm font-bold capitalize">{t('active' as any)}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3 mb-8">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-400">{t('assocSkills' as any)}</span>
                  <span className="font-bold">{agent.skill_ids?.length || 0}</span>
                </div>
                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600" style={{ width: `${((agent.skill_ids?.length || 0) / 20) * 100}%` }} />
                </div>
              </div>

              <div className="mt-auto flex gap-3">
                <button className="flex-1 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-sm font-bold transition-all border border-white/10 flex items-center justify-center gap-2">
                  <Terminal size={16} />
                  {t('test' as any)}
                </button>
                <button
                  onClick={() => handleInspect(agent)}
                  className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-sm font-bold transition-all flex items-center justify-center gap-2"
                >
                  <Settings2 size={16} />
                  {t('configure' as any)}
                </button>
              </div>
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
};

export default Agents;
