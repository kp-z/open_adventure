import React, { useState, useEffect, useRef, useMemo } from 'react';

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
  Zap,
  FolderGit2,
  AlertTriangle
} from 'lucide-react';
import { useMode } from '../contexts/ModeContext';
import { GlassCard, GameCard, ActionButton } from '../components/ui-shared';
import { ClaudeConfigEditor } from '../components/ClaudeConfigEditor';
import { LoadingSpinner, SkeletonCard } from '../components/LoadingSpinner';
import { WaterLevel } from '../components/WaterLevel';
import { MarketplaceCard } from '../components/MarketplaceCard';
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
import { dashboardApi, claudeApi, projectPathsApi } from '@/lib/api';
import { useExecutionContext } from '../contexts/ExecutionContext';
import { useNotifications } from '../contexts/NotificationContext';
import type { DashboardStats, ClaudeHealthResponse, ProjectPath, Execution } from '@/lib/api';

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
  const { addNotification, removeNotification } = useNotifications();
  const { executions: contextExecutions } = useExecutionContext();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [claudeHealth, setClaudeHealth] = useState<ClaudeHealthResponse | null>(null);
  const [tokenUsage, setTokenUsage] = useState<{ percentage: number } | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingHealth, setLoadingHealth] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfigEditor, setShowConfigEditor] = useState(false);
  const [hoveredModel, setHoveredModel] = useState<string | null>(null);
  const [projectPaths, setProjectPaths] = useState<ProjectPath[]>([]);
  const [loadingProjectPaths, setLoadingProjectPaths] = useState(true);
  const lastTokenWarningRef = useRef<string | null>(null);
  const lastUsageWarningRef = useRef<string | null>(null);
  const lastExecutionErrorRef = useRef<string | null>(null);
  const lastProjectReminderRef = useRef<string | null>(null);
  const historyExecutions = useMemo(() => {
    const items = Array.from(contextExecutions.values()) as Execution[];
    return items
      .sort((a, b) => {
        const timeDiff = new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime();
        if (timeDiff !== 0) {
          return timeDiff;
        }
        const createdDiff = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        if (createdDiff !== 0) {
          return createdDiff;
        }
        return b.id - a.id;
      })
      .slice(0, 8);
  }, [contextExecutions]);

  const formatHistoryTime = (dateString?: string) => {
    if (!dateString) {
      return '-';
    }
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) {
      return '-';
    }
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const fetchDashboardData = async () => {
    try {
      setLoadingStats(true);
      // 获取仪表板统计数据
      const statsData = await dashboardApi.getStats();
      setStats(statsData);

      const usageWarning = typeof statsData.usage_warning === 'string' ? statsData.usage_warning : null;
      if (usageWarning && usageWarning !== lastUsageWarningRef.current) {
        addNotification({
          type: 'info',
          title: 'Usage 数据告警',
          message: usageWarning,
        });
        lastUsageWarningRef.current = usageWarning;
      }

      if (!usageWarning) {
        lastUsageWarningRef.current = null;
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    } finally {
      setLoadingStats(false);
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
        const tokenData = await dashboardApi.getTokenUsage();

        setTokenUsage({ percentage: tokenData.percentage ?? 0 });

        const warningMessage = typeof tokenData.warning === 'string' ? tokenData.warning : null;
        if (warningMessage && warningMessage !== lastTokenWarningRef.current) {
          addNotification({
            type: 'info',
            title: 'Token 用量告警',
            message: warningMessage,
          });
          lastTokenWarningRef.current = warningMessage;
        }

        if (!warningMessage) {
          lastTokenWarningRef.current = null;
        }
      } catch (err) {
        console.error('Failed to fetch token usage:', err);
        if (lastExecutionErrorRef.current !== 'token_usage_failed') {
          addNotification({
            type: 'error',
            title: 'Token 用量获取失败',
            message: '无法获取 token 使用数据，请检查后端服务状态。',
          });
          lastExecutionErrorRef.current = 'token_usage_failed';
        }
      }
    } catch (err) {
      console.error('Failed to fetch health:', err);
    } finally {
      setLoadingHealth(false);
    }
  };

  const fetchProjectPaths = async () => {
    try {
      setLoadingProjectPaths(true);
      const response = await projectPathsApi.listProjectPaths({ enabled: true });
      setProjectPaths(response?.items || []);
    } catch (err) {
      console.error('Failed to fetch project paths:', err);
      if (lastExecutionErrorRef.current !== 'project_paths_fetch_failed') {
        addNotification({
          type: 'error',
          title: 'Project 配置加载失败',
          message: '无法获取已配置项目路径，请前往 Settings 页面检查。',
        });
        lastExecutionErrorRef.current = 'project_paths_fetch_failed';
      }
    } finally {
      setLoadingProjectPaths(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      // 并行刷新所有数据
      await Promise.all([
        fetchDashboardData(),
        fetchClaudeHealth(),
        fetchProjectPaths()
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
    fetchProjectPaths();
  }, []);

  useEffect(() => {
    if (loadingProjectPaths) {
      return;
    }

    if (projectPaths.length === 0) {
      if (lastProjectReminderRef.current) {
        return;
      }

      const reminderId = addNotification({
        type: 'info',
        title: '请配置 Project 地址',
        message: '当前未配置可用 Project 路径，请前往 Settings > 项目路径配置，否则扫描功能无法使用。',
      });
      lastProjectReminderRef.current = reminderId;
      return;
    }

    if (lastProjectReminderRef.current) {
      removeNotification(lastProjectReminderRef.current);
      lastProjectReminderRef.current = null;
    }
  }, [loadingProjectPaths, projectPaths, addNotification, removeNotification]);

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
            指挥中心
          </h1>
          <p className="text-sm md:text-base text-gray-400 font-medium line-clamp-1 md:line-clamp-none">统领全局，掌控资源，见证每一场胜利</p>
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
    <div className="space-y-8 lg:[--dashboard-row-h:clamp(320px,calc((100vh-220px)/3),520px)]">
      <header className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight uppercase">DASHBOARD</h1>
          <p className="text-sm md:text-base text-gray-400 line-clamp-1 md:line-clamp-none">实时监控系统状态、资源使用和执行历史</p>
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 md:items-stretch lg:h-[var(--dashboard-row-h)]">
        {/* Claude CLI Status Card - 响应式跨列：中等屏幕和桌面端占 2 列 */}
        {loadingHealth ? (
          <SkeletonCard className="md:col-span-2 lg:col-span-2" />
        ) : (
          <GlassCard className="md:col-span-2 lg:col-span-2 flex flex-col justify-between h-full">
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
                  // 移动端气泡配置 - 使用桌面端相同尺寸
                  const mobileBubbleConfigs = [
                    { name: 'Haiku', size: 28, top: '15%', left: '8%' },
                    { name: 'Sonnet', size: 48, top: '50%', left: '12%' },
                    { name: 'Opus', size: 52, top: '10%', left: '28%' },
                    { name: 'Haiku 3.5', size: 32, top: '65%', left: '35%' },
                    { name: 'Sonnet 3.5', size: 45, top: '18%', left: '50%' },
                    { name: 'Sonnet 4', size: 38, top: '58%', left: '60%' },
                    { name: 'Opus 4', size: 55, top: '8%', left: '75%' },
                    { name: 'Opus 4.5', size: 35, top: '55%', left: '85%' }
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
                          <>
                            <div
                              className={`
                                w-full h-full rounded-full relative overflow-hidden
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
                            </div>

                            {/* Active 显示 token 信息 - 移到气泡容器外部 */}
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
                          </>
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
                        <>
                          <div
                            className={`
                              w-full h-full rounded-full relative overflow-hidden
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
                          </div>

                          {/* Hover 显示 token 信息 - 移到气泡容器外部 */}
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
                        </>
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
          <GlassCard className="flex flex-col justify-between h-full">
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
          <GlassCard className="flex flex-col justify-between h-full">
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 lg:items-stretch lg:h-[var(--dashboard-row-h)]">
        {/* History - 桌面端占 2 列 */}
        <GlassCard className="lg:col-span-2 flex flex-col h-full">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">History</h2>
            <button
              onClick={() => navigate('/history')}
              className="text-sm text-blue-400 hover:underline"
            >
              View All
            </button>
          </div>
          {historyExecutions.length > 0 ? (
            <div className="max-h-[232px] overflow-y-auto space-y-2 pr-1">
              {historyExecutions.map((execution) => (
                <button
                  key={execution.id}
                  onClick={() => navigate('/history')}
                  className="w-full text-left px-3 py-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-colors min-h-[50px]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-white truncate">
                      {execution.task?.title || `Execution #${execution.id}`}
                    </span>
                    <span className={`text-[10px] font-bold uppercase shrink-0 ${
                      execution.status === 'running'
                        ? 'text-blue-400'
                        : execution.status === 'succeeded'
                          ? 'text-green-400'
                          : execution.status === 'failed'
                            ? 'text-red-400'
                            : 'text-gray-400'
                    }`}>
                      {execution.status}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[10px] text-gray-400">
                    <span className="uppercase tracking-wide">{execution.execution_type}</span>
                    <span>{formatHistoryTime(execution.updated_at || execution.created_at)}</span>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex-1 min-h-0 flex items-center justify-center text-gray-500">
              <p>暂无执行记录</p>
            </div>
          )}
        </GlassCard>

        {/* Quick Actions */}
        <div className="flex flex-col h-full">
          <h2 className="text-xl font-bold mb-6">Quick Actions</h2>
          <div className="grid grid-cols-1 gap-4 flex-1">
            <button
              onClick={() => navigate('/skills?action=create')}
              className="flex items-center gap-4 p-4 h-full rounded-2xl bg-gradient-to-r from-blue-600/20 to-indigo-600/20 border border-blue-500/30 hover:bg-white/5 transition-all text-left"
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
              className="flex items-center gap-4 p-4 h-full rounded-2xl bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/30 hover:bg-white/5 transition-all text-left"
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
              className="flex items-center gap-4 p-4 h-full rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-left"
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

      {/* Marketplace + Project Config */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 md:items-stretch lg:h-[var(--dashboard-row-h)]">
        <MarketplaceCard />

        <GlassCard className="flex flex-col h-full p-3 md:p-4">
          <div className="flex items-start justify-between gap-3 pb-2 border-b border-white/10">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-indigo-500/20 border border-indigo-500/40 text-indigo-400 flex items-center justify-center shrink-0">
                <FolderGit2 size={18} />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm md:text-base font-bold leading-tight">Project Configuration</h2>
                <p className="text-[11px] text-gray-400 mt-0.5 truncate">
                  {loadingProjectPaths
                    ? '正在加载 Project 配置...'
                    : projectPaths.length > 0
                      ? `已配置 ${projectPaths.length} 个 Project`
                      : '扫描功能依赖已配置的 Project 路径'}
                </p>
              </div>
            </div>

            <div className="shrink-0">
              <ActionButton
                variant="secondary"
                onClick={() => navigate('/settings?tab=data')}
                title="Configure project"
                className="h-8 px-2 md:px-2.5 text-[11px]"
              >
                <SettingsIcon size={12} />
                <span className="hidden md:inline ml-1">Config</span>
              </ActionButton>
            </div>
          </div>

          {loadingProjectPaths ? (
            <div className="flex items-center justify-center flex-1 min-h-0">
              <LoadingSpinner size="md" />
            </div>
          ) : projectPaths.length > 0 ? (
            <div className="space-y-1 flex-1 flex flex-col min-h-0">
              <div className="space-y-1 overflow-y-auto pr-1 min-h-0 project-scroll-area h-full lg:max-h-[calc(var(--dashboard-row-h)-88px)]">
                {projectPaths.map((project) => (
                  <div key={project.id} className="p-2 rounded-lg bg-white/5 border border-white/10">
                    <div className="flex items-center justify-between gap-1.5">
                      <p className="text-[10px] font-medium text-white truncate leading-tight">{project.alias || project.path.split('/').pop() || project.path}</p>
                      <span className="text-[8px] px-1 py-0.5 rounded bg-green-500/20 border border-green-500/30 text-green-400 font-bold shrink-0">
                        已启用
                      </span>
                    </div>
                    <p className="text-[9px] text-gray-500 truncate mt-0.5 leading-tight">{project.path}</p>
                  </div>
                ))}
              </div>

              {projectPaths.length > 5 && (
                <p className="text-[9px] text-gray-500 leading-tight">可滚动查看全部 {projectPaths.length} 个项目</p>
              )}
            </div>
          ) : (
            <div className="flex-1 min-h-0 flex items-start">
              <div className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/30 w-full">
                <div className="flex items-start gap-2">
                  <AlertTriangle size={14} className="text-yellow-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-yellow-400">尚未配置 Project 路径</p>
                    <p className="text-[11px] text-gray-400 mt-1">请先完成配置，否则 Skills / Agents / Terminal 的扫描能力将不可用。</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </GlassCard>
      </div>

      {/* Config Editor Modal */}
      <style>{`
        .project-scroll-area {
          scrollbar-width: thin;
          scrollbar-color: rgba(148, 163, 184, 0.45) rgba(255, 255, 255, 0.06);
        }

        .project-scroll-area::-webkit-scrollbar {
          width: 8px;
        }

        .project-scroll-area::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.06);
          border-radius: 9999px;
        }

        .project-scroll-area::-webkit-scrollbar-thumb {
          background: rgba(148, 163, 184, 0.45);
          border-radius: 9999px;
          border: 2px solid transparent;
          background-clip: padding-box;
        }

        .project-scroll-area::-webkit-scrollbar-thumb:hover {
          background: rgba(148, 163, 184, 0.7);
          background-clip: padding-box;
        }
      `}</style>

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
