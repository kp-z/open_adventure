import React from 'react';
import { 
  BarChart3, 
  Terminal, 
  Activity, 
  Code2, 
  BrainCircuit, 
  Cpu,
  Sword,
  Shield,
  BookOpen,
  Map as MapIcon,
  Trophy,
  Plus
} from 'lucide-react';
import { useMode } from '../contexts/ModeContext';
import { useTranslation } from '../hooks/useTranslation';
import { GlassCard, GameCard, ActionButton } from '../components/ui-shared';
import { getAvatarById } from '../lib/avatars';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area 
} from 'recharts';

const mockChartData = [
  { name: 'Mon', value: 40 },
  { name: 'Tue', value: 30 },
  { name: 'Wed', value: 65 },
  { name: 'Thu', value: 45 },
  { name: 'Fri', value: 90 },
  { name: 'Sat', value: 70 },
  { name: 'Sun', value: 85 },
];

const Dashboard = () => {
  const { mode } = useMode();
  const { t } = useTranslation();

  if (mode === 'adventure') {
    return (
      <div className="space-y-8">
        <header className="flex flex-col gap-2">
          <h1 className="text-4xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-600 uppercase">
            {t("baseTitle")}
          </h1>
          <p className="text-gray-400 font-medium">{t("baseDesc")}</p>
        </header>

        {/* Level Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <GameCard rarity="legendary" className="flex items-center gap-6 py-6">
            <div className="w-16 h-16 rounded-full bg-yellow-500/20 border-2 border-yellow-500 flex items-center justify-center shadow-[0_0_20px_rgba(234,179,8,0.4)]">
              <span className="text-2xl font-black text-yellow-500">42</span>
            </div>
            <div>
              <p className="text-xs font-bold text-yellow-500/80 uppercase tracking-widest">Architect Level</p>
              <p className="text-2xl font-black text-white">Grand Master</p>
              <div className="w-full h-2 bg-white/10 rounded-full mt-2 overflow-hidden">
                <div className="w-3/4 h-full bg-gradient-to-r from-yellow-600 to-yellow-400"></div>
              </div>
            </div>
          </GameCard>
          <GameCard rarity="epic" className="flex items-center gap-6 py-6">
            <div className="w-16 h-16 rounded-full bg-purple-500/20 border-2 border-purple-500 flex items-center justify-center">
              <BrainCircuit className="text-purple-500" size={32} />
            </div>
            <div>
              <p className="text-xs font-bold text-purple-500/80 uppercase tracking-widest">Skill Orbs</p>
              <p className="text-2xl font-black text-white">12,450 XP</p>
              <p className="text-xs text-gray-500">Next level: 15,000 XP</p>
            </div>
          </GameCard>
          <GameCard rarity="rare" className="flex items-center gap-6 py-6">
            <div className="w-16 h-16 rounded-full bg-blue-500/20 border-2 border-blue-500 flex items-center justify-center">
              <Trophy className="text-blue-500" size={32} />
            </div>
            <div>
              <p className="text-xs font-bold text-blue-500/80 uppercase tracking-widest">Battles Won</p>
              <p className="text-2xl font-black text-white">1,248</p>
              <p className="text-xs text-gray-500">98% Success Rate</p>
            </div>
          </GameCard>
        </div>

        {/* Building Entrances */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { name: "Hero Hall", icon: Shield, color: "from-blue-600 to-blue-400", desc: "Manage your Agents" },
            { name: "Spell Forge", icon: BookOpen, color: "from-purple-600 to-purple-400", desc: "Craft new Skills" },
            { name: "War Room", icon: MapIcon, color: "from-red-600 to-red-400", desc: "Plan Workflows" },
            { name: "Training Grounds", icon: Trophy, color: "from-yellow-600 to-yellow-400", desc: "Review Tasks" }
          ].map((building) => (
            <GameCard key={building.name} className="group p-0 h-64 overflow-hidden relative">
              <div className={`absolute inset-0 bg-gradient-to-br ${building.color} opacity-20 group-hover:opacity-40 transition-opacity`} />
              <div className="relative h-full flex flex-col items-center justify-center p-6 text-center">
                <building.icon size={64} className="mb-4 text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]" />
                <h3 className="text-xl font-black uppercase italic text-white tracking-wider">{building.name}</h3>
                <p className="text-sm text-gray-400 mt-2">{building.desc}</p>
                <div className="mt-6">
                  <ActionButton variant="secondary" className="text-xs py-1 px-4">Enter Building</ActionButton>
                </div>
              </div>
            </GameCard>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("overview")}</h1>
          <p className="text-gray-400">{t("overviewDesc")}</p>
        </div>
        <div className="flex gap-3">
          <ActionButton variant="secondary">Export Config</ActionButton>
          <ActionButton onClick={() => {}}>Sync Environments</ActionButton>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Status Card */}
        <GlassCard className="lg:col-span-2 flex flex-col justify-between">
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-green-500/20 border border-green-500/50 flex items-center justify-center text-green-500">
                <Activity size={24} />
              </div>
              <div>
                <h2 className="text-lg font-bold">Claude CLI Status</h2>
                <p className="text-xs text-green-500 font-medium">System Online & Synchronized</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400">Version</p>
              <p className="text-sm font-mono">v3.4.2-stable</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mt-auto">
            <div className="bg-white/5 rounded-xl p-3">
              <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Health Score</p>
              <p className="text-2xl font-bold text-blue-400">98.4<span className="text-xs text-gray-500 ml-1">/100</span></p>
            </div>
            <div className="bg-white/5 rounded-xl p-3">
              <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Active Threads</p>
              <p className="text-2xl font-bold text-purple-400">12<span className="text-xs text-gray-500 ml-1">concurrent</span></p>
            </div>
          </div>
        </GlassCard>

        {/* Stat Cards */}
        <GlassCard className="flex flex-col justify-between">
          <div className="flex justify-between">
            <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400">
              <Cpu size={20} />
            </div>
            <span className="text-xs text-green-500 font-bold">+12%</span>
          </div>
          <div>
            <p className="text-sm text-gray-400">Total Skills</p>
            <p className="text-3xl font-bold">48</p>
          </div>
          <div className="h-12 w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mockChartData}>
                <Area type="monotone" dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <GlassCard className="flex flex-col justify-between">
          <div className="flex justify-between">
            <div className="p-2 rounded-lg bg-purple-500/20 text-purple-400">
              <Code2 size={20} />
            </div>
            <span className="text-xs text-gray-500 font-bold">0%</span>
          </div>
          <div>
            <p className="text-sm text-gray-400">Agents Running</p>
            <p className="text-3xl font-bold">6</p>
          </div>
          <div className="h-12 w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mockChartData}>
                <Bar dataKey="value" fill="#a855f7" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Tasks */}
        <GlassCard className="lg:col-span-2">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">Execution History</h2>
            <button className="text-sm text-blue-400 hover:underline">View All</button>
          </div>
          <div className="space-y-4">
            {[
              { id: 'T-982', task: 'Deploy API Gateway', status: 'success', time: '2m ago', avatar: 'blackpanther' },
              { id: 'T-981', task: 'Review PR #245', status: 'running', time: '5m ago', avatar: 'spiderman' },
              { id: 'T-980', task: 'Generate Documentation', status: 'success', time: '14m ago', avatar: 'blackwidow' },
              { id: 'T-979', task: 'Fix Security Vulnerabilities', status: 'failed', time: '1h ago', avatar: 'thanos' },
            ].map((task) => (
              <div key={task.id} className="flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-lg overflow-hidden border border-white/10">
                      <img src={getAvatarById(task.avatar).img} alt="" className="w-full h-full object-cover opacity-80" />
                    </div>
                    <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-[#1a1b26] ${
                      task.status === 'success' ? 'bg-green-500' : 
                      task.status === 'running' ? 'bg-blue-500 animate-pulse' : 'bg-red-500'
                    }`} />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{task.task}</p>
                    <p className="text-[10px] text-gray-500 uppercase font-bold">{task.id} • {task.time}</p>
                  </div>
                </div>
                <ActionButton variant="secondary" className="py-1 px-3 text-xs">Details</ActionButton>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Quick Actions */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold">Quick Actions</h2>
          <div className="grid grid-cols-1 gap-4">
            <button className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-blue-600/20 to-indigo-600/20 border border-blue-500/30 hover:bg-white/5 transition-all text-left">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shrink-0">
                <Plus size={20} />
              </div>
              <div>
                <p className="font-bold text-sm">Create New Skill</p>
                <p className="text-xs text-gray-400">Add capability to Claude</p>
              </div>
            </button>
            <button className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/30 hover:bg-white/5 transition-all text-left">
              <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center text-white shrink-0">
                <BrainCircuit size={20} />
              </div>
              <div>
                <p className="font-bold text-sm">Deploy Agent</p>
                <p className="text-xs text-gray-400">Initialize a new specialist</p>
              </div>
            </button>
            <button className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-left">
              <div className="w-10 h-10 rounded-xl bg-gray-700 flex items-center justify-center text-white shrink-0">
                <Terminal size={20} />
              </div>
              <div>
                <p className="font-bold text-sm">Debug Shell</p>
                <p className="text-xs text-gray-400">Open CLI environment</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
