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
  Plus,
  Settings as SettingsIcon,
  RefreshCw,
  Zap
} from 'lucide-react';
import { useMode } from '../contexts/ModeContext';
import { useTranslation } from '../hooks/useTranslation';
import { GlassCard, GameCard, ActionButton } from '../components/ui-shared';
import { ClaudeConfigEditor } from '../components/ClaudeConfigEditor';
import { LoadingSpinner, SkeletonCard, SkeletonListItem } from '../components/LoadingSpinner';
import { WaterLevel } from '../components/WaterLevel';
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
  const [tokenUsage, setTokenUsage] = useState<{ percentage: number } | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingHealth, setLoadingHealth] = useState(true);
  const [loadingExecutions, setLoadingExecutions] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfigEditor, setShowConfigEditor] = useState(false);
  const [hoveredModel, setHoveredModel] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      setLoadingStats(true);
      // 获取仪表板统计数据
      const statsData = await dashboardApi.getStats();
      setStats(statsData);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchExecutions = async () => {
    try {
      setLoadingExecutions(true);
      // 获取最近的执行历史，最多显示3条
      const executionsData = await executionsApi.list({ limit: 3 });
      setExecutions(executionsData.items || []);
    } catch (err) {
      console.error('Failed to fetch executions:', err);
    } finally {
      setLoadingExecutions(false);
    }
  };

  const fetchClaudeHealth = async () => {
    try {
      setLoadingHealth(true);
      // 获取 Claude 健康状态
      const healthData = await claudeApi.health();
      console.log('Claude Health Data:', healthData);
      console.log('Available Models:', healthData.model_info?.available_models);
      setClaudeHealth(healthData);

      // 获取 token 使用情况
      try {
        const response = await fetch('http://localhost:8000/api/token-usage');
        const tokenData = await response.json();
        setTokenUsage({ percentage: tokenData.percentage });
      } catch (err) {
        console.error('Failed to fetch token usage:', err);
      }
    } catch (err) {
      console.error('Failed to fetch health:', err);
    } finally {
      setLoadingHealth(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      // 并行刷新所有数据
      await Promise.all([
        fetchDashboardData(),
        fetchClaudeHealth(),
        fetchExecutions()
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
    // 独立加载各个数据源，不阻塞界面渲染
    fetchDashboardData();
    fetchClaudeHealth();
    fetchExecutions();
  }, []);

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
      <div className="space-y-6 md:space-y-8">
        <header className="flex flex-col gap-2">
          <h1 className="text-3xl md:text-4xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-600 uppercase">
            {t("baseTitle")}
          </h1>
          <p className="text-sm md:text-base text-gray-400 font-medium">{t("baseDesc")}</p>
        </header>

        {/* Level Stats - 响应式网格 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
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

        {/* Building Entrances - 响应式网格 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
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
      <header className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight uppercase">SYSTEM OVERVIEW</h1>
          <p className="text-sm md:text-base text-gray-400">{t("overviewDesc")}</p>
        </div>
        <div className="flex md:flex-row flex-col gap-2 shrink-0">
          <ActionButton
            variant="secondary"
            onClick={handleRefresh}
            disabled={refreshing}
            className="md:px-4 px-2 py-2 text-sm min-w-0"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            <span className="hidden md:inline ml-2">{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </ActionButton>
          <ActionButton
            onClick={handleSync}
            disabled={syncing}
            className="md:px-4 px-2 py-2 text-sm min-w-0"
          >
            <Zap size={16} />
            <span className="hidden md:inline ml-2">{syncing ? 'Syncing...' : 'Sync'}</span>
          </ActionButton>
        </div>
      </header>

      {/* 响应式网格：移动端 1 列，中等屏幕 2 列，桌面端 4 列 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {/* Claude CLI Status Card - 响应式跨列：中等屏幕和桌面端占 2 列 */}
        {loadingHealth ? (
          <SkeletonCard className="md:col-span-2 lg:col-span-2" />
        ) : (
          <GlassCard className="md:col-span-2 lg:col-span-2 flex flex-col justify-between">
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
                <h2 className="text-base md:text-lg font-bold">Claude CLI Status</h2>
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
            <div className="flex items-center gap-2">
              <div className="text-right">
                <p className="text-xs text-gray-400">Version</p>
                <p className="text-sm font-mono">
                  {claudeHealth?.version || 'N/A'}
                </p>
              </div>
              <button
                onClick={() => setShowConfigEditor(true)}
                className="w-8 h-8 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/50 flex items-center justify-center transition-colors"
                title="Configure Settings"
              >
                <SettingsIcon size={16} className="text-blue-400" />
              </button>
            </div>
          </div>

          {/* Available Models */}
          <div className="mb-4">
            <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest mb-3">Available Models</p>

            {/* 移动端气泡展示 - 仅在 <md 显示，调整布局和大小 */}
            <div className="block md:hidden">
              <div className="relative h-32 flex items-center justify-center">
                {(() => {
                  // 移动端气泡配置 - 更紧凑的布局，更小的尺寸
                  const mobileBubbleConfigs = [
                    { name: 'Haiku', size: 24, top: '20%', left: '5%' },
                    { name: 'Sonnet', size: 36, top: '55%', left: '8%' },
                    { name: 'Opus', size: 40, top: '15%', left: '25%' },
                    { name: 'Haiku 3.5', size: 26, top: '65%', left: '32%' },
                    { name: 'Sonnet 3.5', size: 34, top: '22%', left: '50%' },
                    { name: 'Sonnet 4', size: 30, top: '60%', left: '58%' },
                    { name: 'Opus 4', size: 42, top: '12%', left: '75%' },
                    { name: 'Opus 4.5', size: 28, top: '58%', left: '85%' }
                  ];

                  return mobileBubbleConfigs.map((config, index) => {
                    const matchedModel = claudeHealth?.model_info?.available_models.find(m => {
                      const modelAlias = m.alias.toLowerCase();
                      const configName = config.name.toLowerCase();
                      const normalizedConfigName = configName.replace(/\s+/g, '-');
                      return modelAlias === configName ||
                             modelAlias === normalizedConfigName ||
                             modelAlias.includes(normalizedConfigName) ||
                             normalizedConfigName.includes(modelAlias);
                    });
                    const isAvailable = matchedModel?.available ?? false;

                    return (
                      <div
                        key={config.name}
                        className="absolute group cursor-pointer"
                        style={{
                          top: config.top,
                          left: config.left,
                          width: `${config.size}px`,
                          height: `${config.size}px`,
                          animation: `float ${3 + index * 0.5}s ease-in-out infinite`,
                          animationDelay: `${index * 0.3}s`
                        }}
                        title={config.name}
                        onClick={() => setHoveredModel(hoveredModel === config.name ? null : config.name)}
                      >
                        {/* 可用模型：显示绿色高亮边框和水位线 */}
                        {isAvailable && tokenUsage ? (
                          <div
                            className={`
                              w-full h-full rounded-full relative
                              transition-all duration-300
                              backdrop-blur-[2px]
                              border-2
                              active:scale-110
                              bg-gradient-to-br from-white/8 via-white/4 to-transparent
                              group
                            `}
                            style={{
                              borderColor: 'rgba(34, 197, 94, 0.4)',
                              boxShadow: '0 0 15px rgba(34, 197, 94, 0.4), 0 0 30px rgba(34, 197, 94, 0.2), inset 0 0 20px rgba(34, 197, 94, 0.15), inset 0 1px 0 rgba(255,255,255,0.4)'
                            }}
                          >
                            {/* 顶部高光 */}
                            <div className="absolute top-[18%] left-[28%] w-[30%] h-[30%] rounded-full bg-gradient-to-br from-white/50 via-white/20 to-transparent blur-[2px]" />

                            {/* 水位线 */}
                            <WaterLevel percentage={tokenUsage?.percentage ?? 0} size={config.size} />

                            {/* 模型名称 - 在水位线后面 */}
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: 5 }}>
                              <span className="text-[7px] font-bold text-white drop-shadow-lg text-center leading-tight px-0.5">
                                {config.name}
                              </span>
                            </div>

                            {/* Active 显示 token 信息 - 在气泡上方 - 只在当前选中的模型显示 */}
                            {hoveredModel === config.name && (
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-100 transition-opacity duration-300 pointer-events-none" style={{ zIndex: 30 }}>
                                <div className="bg-black/90 backdrop-blur-sm rounded-lg px-2 py-1.5 text-[8px] text-white whitespace-nowrap shadow-lg border border-white/10">
                                  <div className="font-bold mb-1">{config.name}</div>
                                  <div className="text-gray-300 mb-1.5 text-[7px]">{(200000 - 200000 * (tokenUsage?.percentage ?? 0) / 100).toFixed(0)} / 200,000</div>
                                  {/* 横向柱状图 */}
                                  <div className="w-24 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-gradient-to-r from-green-500 to-green-400 transition-all duration-300"
                                      style={{ width: `${tokenUsage?.percentage ?? 0}%` }}
                                    />
                                  </div>
                                  <div className="text-[6px] text-gray-400 mt-1">{tokenUsage.percentage.toFixed(1)}% Used</div>
                                </div>
                                {/* 小三角箭头 */}
                                <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
                                  <div className="w-0 h-0 border-l-3 border-r-3 border-t-3 border-transparent border-t-black/90" />
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          /* 不可用的模型显示原来的样式 */
                          <div
                            className={`
                              w-full h-full rounded-full relative
                              transition-all duration-300
                              backdrop-blur-[2px]
                              border
                              active:scale-110
                              bg-gradient-to-br from-white/8 via-white/4 to-transparent border-white/15
                            `}
                          >
                            {/* 顶部高光 */}
                            <div className="absolute top-[18%] left-[28%] w-[30%] h-[30%] rounded-full bg-gradient-to-br from-white/50 via-white/20 to-transparent blur-[2px]" />

                            {/* 模型名称 */}
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className="text-[7px] font-medium text-center leading-tight px-0.5 text-gray-400">
                                {config.name}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  });
                })()}
              </div>
            </div>

            {/* 桌面端气泡展示 - 仅在 ≥md 显示，保持原样 */}
            <div className="hidden md:block">
              <div className="relative h-24 flex items-center justify-center">
              {(() => {
                // 8个常用模型及其气泡配置 - 大小差异更大
                const bubbleConfigs = [
                  { name: 'Haiku', size: 28, top: '15%', left: '8%' },
                  { name: 'Sonnet', size: 48, top: '50%', left: '12%' },
                  { name: 'Opus', size: 52, top: '10%', left: '28%' },
                  { name: 'Haiku 3.5', size: 32, top: '65%', left: '35%' },
                  { name: 'Sonnet 3.5', size: 45, top: '18%', left: '50%' },
                  { name: 'Sonnet 4', size: 38, top: '58%', left: '60%' },
                  { name: 'Opus 4', size: 55, top: '8%', left: '75%' },
                  { name: 'Opus 4.5', size: 35, top: '55%', left: '85%' }
                ];

                return bubbleConfigs.map((config, index) => {
                  // 检查模型是否可用 - 改进匹配逻辑
                  const matchedModel = claudeHealth?.model_info?.available_models.find(m => {
                    const modelAlias = m.alias.toLowerCase();
                    const configName = config.name.toLowerCase();

                    // 将空格替换为连字符进行匹配
                    const normalizedConfigName = configName.replace(/\s+/g, '-');

                    // 精确匹配或包含匹配
                    return modelAlias === configName ||
                           modelAlias === normalizedConfigName ||
                           modelAlias.includes(normalizedConfigName) ||
                           normalizedConfigName.includes(modelAlias);
                  });

                  const isAvailable = matchedModel?.available ?? false;

                  // 调试信息 - 打印所有气泡的匹配情况
                  console.log(`Bubble ${config.name}:`, {
                    configName: config.name,
                    matchedModel,
                    isAvailable,
                    tokenUsage,
                    hasTokenUsage: !!tokenUsage,
                    willShowWaterLevel: isAvailable && !!tokenUsage
                  });

                  return (
                    <div
                      key={config.name}
                      className="absolute group cursor-pointer"
                      style={{
                        top: config.top,
                        left: config.left,
                        width: `${config.size}px`,
                        height: `${config.size}px`,
                        animation: `float ${3 + index * 0.5}s ease-in-out infinite`,
                        animationDelay: `${index * 0.3}s`
                      }}
                      title={config.name}
                      onMouseEnter={() => setHoveredModel(config.name)}
                      onMouseLeave={() => setHoveredModel(null)}
                    >
                      {/* 可用模型：显示绿色高亮边框和水位线 */}
                      {isAvailable && tokenUsage ? (
                        <div
                          className={`
                            w-full h-full rounded-full relative
                            transition-all duration-300
                            backdrop-blur-[2px]
                            border-2
                            hover:scale-110
                            bg-gradient-to-br from-white/8 via-white/4 to-transparent
                            group
                          `}
                          style={{
                            borderColor: 'rgba(34, 197, 94, 0.4)',
                            boxShadow: '0 0 20px rgba(34, 197, 94, 0.4), 0 0 40px rgba(34, 197, 94, 0.2), inset 0 0 30px rgba(34, 197, 94, 0.15), inset 0 1px 0 rgba(255,255,255,0.4)'
                          }}
                        >
                          {/* 顶部高光 */}
                          <div className="absolute top-[18%] left-[28%] w-[30%] h-[30%] rounded-full bg-gradient-to-br from-white/50 via-white/20 to-transparent blur-[3px]" />

                          {/* 次级高光 */}
                          <div className="absolute top-[12%] right-[22%] w-[18%] h-[18%] rounded-full bg-white/30 blur-[1px]" />

                          {/* 水位线 */}
                          <WaterLevel percentage={tokenUsage.percentage} size={config.size} />

                          {/* 模型名称 - 在水位线后面 */}
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: 5 }}>
                            <span className="text-[8px] font-bold text-white drop-shadow-lg text-center leading-tight px-1">
                              {config.name}
                            </span>
                          </div>

                          {/* Hover 显示 token 信息 - 在气泡上方 - 只在当前 hover 的模型显示 */}
                          {hoveredModel === config.name && (
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-100 transition-opacity duration-300 pointer-events-none" style={{ zIndex: 30 }}>
                              <div className="bg-black/90 backdrop-blur-sm rounded-lg px-3 py-2 text-[10px] text-white whitespace-nowrap shadow-lg border border-white/10">
                                <div className="font-bold mb-1">{config.name}</div>
                                <div className="text-gray-300 mb-2">{(200000 - 200000 * (tokenUsage?.percentage ?? 0) / 100).toFixed(0)} / 200,000 tokens</div>
                                {/* 横向柱状图 */}
                                <div className="w-32 h-2 bg-white/10 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-gradient-to-r from-green-500 to-green-400 transition-all duration-300"
                                    style={{ width: `${tokenUsage.percentage}%` }}
                                  />
                                </div>
                                <div className="text-[8px] text-gray-400 mt-1">{(tokenUsage?.percentage ?? 0).toFixed(1)}% Used</div>
                              </div>
                              {/* 小三角箭头 */}
                              <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
                                <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-black/90" />
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        /* 不可用的模型显示原来的样式 */
                        <div
                          className={`
                            w-full h-full rounded-full relative
                            transition-all duration-300
                            backdrop-blur-[2px]
                            border
                            hover:scale-110
                            bg-gradient-to-br from-white/8 via-white/4 to-transparent border-white/15 shadow-[0_4px_16px_rgba(0,0,0,0.05),inset_0_1px_0_rgba(255,255,255,0.4)]
                          `}
                        >
                          {/* 顶部高光 */}
                          <div className="absolute top-[18%] left-[28%] w-[30%] h-[30%] rounded-full bg-gradient-to-br from-white/50 via-white/20 to-transparent blur-[3px]" />

                          {/* 次级高光 */}
                          <div className="absolute top-[12%] right-[22%] w-[18%] h-[18%] rounded-full bg-white/30 blur-[1px]" />

                          {/* 模型名称 */}
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-[8px] font-medium text-center leading-tight px-1 text-gray-400">
                              {config.name}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                });
              })()}
            </div>
            </div>
          </div>

          <style>{`
            @keyframes float {
              0%, 100% { transform: translateY(0px) translateX(0px); }
              25% { transform: translateY(-8px) translateX(3px); }
              50% { transform: translateY(-4px) translateX(-3px); }
              75% { transform: translateY(-10px) translateX(2px); }
            }
          `}</style>

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
        )}

        {/* Total Skills Card */}
        {loadingStats ? (
          <SkeletonCard />
        ) : (
          <GlassCard className="flex flex-col justify-between">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400">
              <Cpu size={20} />
            </div>
            <span className="text-xs text-green-500 font-bold">+12%</span>
          </div>
          <div className="mb-4">
            <p className="text-sm text-gray-400">Total Skills</p>
            <p className="text-3xl font-bold">{stats?.total_skills || 0}</p>
          </div>

          {/* Popular Skills - 横向排列 */}
          <div className="mb-4">
            <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest mb-2">Popular Skills</p>
            {stats?.popular_skills && stats.popular_skills.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {stats.popular_skills.slice(0, 4).map((skill) => (
                  <div key={skill.id} className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
                    <span className="text-xs text-gray-300 truncate flex-1">{skill.name}</span>
                    <span className="text-[10px] text-blue-400 font-bold ml-2">{skill.usage_count}x</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-500">No skills yet</p>
            )}
          </div>

          <div className="h-12 w-full mt-auto">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mockChartData}>
                <Area type="monotone" dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
        )}

        {/* Agents Running Card */}
        {loadingStats ? (
          <SkeletonCard />
        ) : (
          <GlassCard className="flex flex-col justify-between">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 rounded-lg bg-purple-500/20 text-purple-400">
              <Code2 size={20} />
            </div>
            <span className="text-xs text-gray-500 font-bold">0%</span>
          </div>
          <div className="mb-4">
            <p className="text-sm text-gray-400">Agents Running</p>
            <p className="text-3xl font-bold">{stats?.total_agents || 0}</p>
          </div>

          {/* Popular Agents - 横向排列 */}
          <div className="mb-4">
            <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest mb-2">Popular Agents</p>
            {stats?.popular_agents && stats.popular_agents.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {stats.popular_agents.slice(0, 4).map((agent) => (
                  <div key={agent.id} className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
                    <span className="text-xs text-gray-300 truncate flex-1">{agent.name}</span>
                    <span className="text-[10px] text-purple-400 font-bold ml-2">{agent.usage_count}x</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-500">No agents yet</p>
            )}
          </div>

          <div className="h-12 w-full mt-auto">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mockChartData}>
                <Bar dataKey="value" fill="#a855f7" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
        )}
      </div>

      {/* 响应式网格：移动端 1 列，桌面端 3 列 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Recent Tasks - 桌面端占 2 列 */}
        <GlassCard className="lg:col-span-2">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">Execution History</h2>
            <button
              onClick={() => navigate('/executions')}
              className="text-sm text-blue-400 hover:underline"
            >
              View All
            </button>
          </div>
          <div className="space-y-4">
            {loadingExecutions ? (
              <>
                <SkeletonListItem />
                <SkeletonListItem />
                <SkeletonListItem />
              </>
            ) : executions.length > 0 ? (
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

      {/* Config Editor Modal */}
      {showConfigEditor && (
        <ClaudeConfigEditor
          onClose={() => setShowConfigEditor(false)}
          onSaved={() => {
            setShowConfigEditor(false);
            handleRefresh();
          }}
        />
      )}
    </div>
  );
};

export default Dashboard;
