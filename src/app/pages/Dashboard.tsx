import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
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
import { dashboardApi, executionsApi, claudeApi } from '@/lib/api';
import type { DashboardStats, Execution, ClaudeHealthResponse } from '@/lib/api';

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
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [claudeHealth, setClaudeHealth] = useState<ClaudeHealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    // 获取仪表板统计数据
    const statsData = await dashboardApi.getStats();
    setStats(statsData);

    // 获取最近的执行历史
    const executionsData = await executionsApi.list({ limit: 4 });
    setExecutions(executionsData.items || []);
  };

  const fetchClaudeHealth = async () => {
    // 获取 Claude 健康状态
    const healthData = await claudeApi.health();
    setClaudeHealth(healthData);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        fetchDashboardData(),
        fetchClaudeHealth()
      ]);
    } catch (err) {
      console.error('Failed to refresh data:', err);
      setError(err instanceof Error ? err.message : 'Failed to refresh data');
    } finally {
      setRefreshing(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      await claudeApi.sync();
      // 同步完成后刷新数据
      await handleRefresh();
    } catch (err) {
      console.error('Failed to sync:', err);
      setError(err instanceof Error ? err.message : 'Failed to sync');
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        await Promise.all([
          fetchDashboardData(),
          fetchClaudeHealth()
        ]);
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-red-500 mb-4">Error: {error}</p>
          <ActionButton onClick={() => window.location.reload()}>Retry</ActionButton>
        </div>
      </div>
    );
  }

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
              <span className="text-2xl font-black text-yellow-500">{stats?.total_workflows || 0}</span>
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
              <p className="text-2xl font-black text-white">{stats?.total_skills || 0} XP</p>
              <p className="text-xs text-gray-500">Total Skills Collected</p>
            </div>
          </GameCard>
          <GameCard rarity="rare" className="flex items-center gap-6 py-6">
            <div className="w-16 h-16 rounded-full bg-blue-500/20 border-2 border-blue-500 flex items-center justify-center">
              <Trophy className="text-blue-500" size={32} />
            </div>
            <div>
              <p className="text-xs font-bold text-blue-500/80 uppercase tracking-widest">Battles Won</p>
              <p className="text-2xl font-black text-white">{stats?.total_tasks || 0}</p>
              <p className="text-xs text-gray-500">Total Tasks Completed</p>
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
          <ActionButton
            variant="secondary"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </ActionButton>
          <ActionButton
            onClick={handleSync}
            disabled={syncing}
          >
            {syncing ? 'Syncing...' : 'Sync Environments'}
          </ActionButton>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Status Card */}
        <GlassCard className="lg:col-span-2 flex flex-col justify-between">
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-xl ${
                claudeHealth?.cli_available
                  ? 'bg-green-500/20 border border-green-500/50 text-green-500'
                  : 'bg-red-500/20 border border-red-500/50 text-red-500'
              } flex items-center justify-center`}>
                <Activity size={24} />
              </div>
              <div>
                <h2 className="text-lg font-bold">Claude CLI Status</h2>
                <p className={`text-xs font-medium ${
                  claudeHealth?.cli_available
                    ? 'text-green-500'
                    : 'text-red-500'
                }`}>
                  {claudeHealth?.cli_available
                    ? 'System Online & Synchronized'
                    : 'System Offline'}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400">Version</p>
              <p className="text-sm font-mono">
                {claudeHealth?.version || 'N/A'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-auto">
            <div className="bg-white/5 rounded-xl p-3">
              <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Health Score</p>
              <p className="text-2xl font-bold text-blue-400">
                {claudeHealth ? (
                  <>
                    {Math.round(
                      ((claudeHealth.config_dir_exists ? 33 : 0) +
                       (claudeHealth.skills_dir_exists ? 33 : 0) +
                       (claudeHealth.cli_available ? 34 : 0))
                    )}
                    <span className="text-xs text-gray-500 ml-1">/100</span>
                  </>
                ) : (
                  <span className="text-xs text-gray-500">N/A</span>
                )}
              </p>
            </div>
            <div className="bg-white/5 rounded-xl p-3">
              <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Status</p>
              <p className="text-2xl font-bold text-purple-400">
                {claudeHealth ? (
                  <>
                    {claudeHealth.issues.length === 0 ? 'OK' : `${claudeHealth.issues.length} Issues`}
                  </>
                ) : (
                  <span className="text-xs text-gray-500">N/A</span>
                )}
              </p>
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
            <p className="text-3xl font-bold">{stats?.total_skills || 0}</p>
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
            <p className="text-3xl font-bold">{stats?.total_agents || 0}</p>
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
            {executions.length > 0 ? (
              executions.map((execution, index) => {
                const task = execution.task;
                const avatars = ['vanguard_1', 'vanguard_2', 'vanguard_3', 'vanguard_4'];
                const avatar = avatars[index % avatars.length];
                const avatarData = getAvatarById(avatar);
                const AvatarIcon = avatarData.icon;
                const status = task?.status === 'completed' ? 'success' :
                              task?.status === 'running' ? 'running' :
                              task?.status === 'failed' ? 'failed' : 'success';

                return (
                  <div key={execution.id} className="flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <div className="w-10 h-10 rounded-lg overflow-hidden border border-white/10 bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                          <AvatarIcon className="w-6 h-6 text-white" />
                        </div>
                        <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-[#1a1b26] ${
                          status === 'success' ? 'bg-green-500' :
                          status === 'running' ? 'bg-blue-500 animate-pulse' : 'bg-red-500'
                        }`} />
                      </div>
                      <div>
                        <p className="font-medium text-sm">Execution #{execution.id}</p>
                        <p className="text-[10px] text-gray-500 uppercase font-bold">
                          Task #{task?.id || 'N/A'} • {new Date(execution.created_at).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                    <ActionButton variant="secondary" className="py-1 px-3 text-xs">Details</ActionButton>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No execution history yet</p>
              </div>
            )}
          </div>
        </GlassCard>

        {/* Quick Actions */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold">Quick Actions</h2>
          <div className="grid grid-cols-1 gap-4">
            <button
              onClick={() => navigate('/skills?action=create')}
              className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-blue-600/20 to-indigo-600/20 border border-blue-500/30 hover:bg-white/5 transition-all text-left"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shrink-0">
                <Plus size={20} />
              </div>
              <div>
                <p className="font-bold text-sm">Create New Skill</p>
                <p className="text-xs text-gray-400">Add capability to Claude</p>
              </div>
            </button>
            <button
              onClick={() => navigate('/agents?action=create')}
              className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/30 hover:bg-white/5 transition-all text-left"
            >
              <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center text-white shrink-0">
                <BrainCircuit size={20} />
              </div>
              <div>
                <p className="font-bold text-sm">Deploy Agent</p>
                <p className="text-xs text-gray-400">Initialize a new specialist</p>
              </div>
            </button>
            <button
              onClick={() => navigate('/terminal')}
              className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-left"
            >
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
