import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router';
import {
  RefreshCw,
  Plus,
  Settings2,
  Trash2,
  Search,
  Cpu,
  Shield,
  Zap,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Layers,
  Box,
  User,
  FolderOpen,
  Package,
  Play,
  Wrench,
  MoreVertical,
  Edit,
  Copy,
  Users,
  Activity
} from 'lucide-react';
import { useMode } from '../contexts/ModeContext';
import { useTranslation } from '../hooks/useTranslation';
import { useNotifications } from '../contexts/NotificationContext';
import { GlassCard, ActionButton } from '../components/ui-shared';
import { CategoryFilter, type CategoryType } from '../components/CategoryFilter';
import { motion, AnimatePresence } from 'motion/react';
import { agentsApi } from '@/lib/api';
import type { Agent, AgentScope, AgentSyncResponse } from '@/lib/api';
import { AgentEditor } from '../components/AgentEditor';
import { AgentTestPanel } from '../components/AgentTestPanel';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';

// 作用域图标映射
const scopeIcons: Record<AgentScope, React.ReactNode> = {
  builtin: <Box size={14} />,
  user: <User size={14} />,
  project: <FolderOpen size={14} />,
  plugin: <Package size={14} />
};

// 作用域颜色映射
const scopeColors: Record<AgentScope, string> = {
  builtin: 'text-blue-400 bg-blue-500/20 border-blue-500/30',
  user: 'text-green-400 bg-green-500/20 border-green-500/30',
  project: 'text-purple-400 bg-purple-500/20 border-purple-500/30',
  plugin: 'text-orange-400 bg-orange-500/20 border-orange-500/30'
};

// 从路径中提取项目名称
const extractProjectName = (path: string): string => {
  const pathParts = path.split('/');

  // 优先从 .claude 前面的目录获取（这是最准确的项目名称）
  const claudeIndex = pathParts.findIndex(p => p === '.claude');
  if (claudeIndex > 0) {
    return pathParts[claudeIndex - 1];
  }

  // 如果没有 .claude，查找常见的项目目录标识
  const projectDirNames = ['项目', 'Proj', 'projects', 'Projects', 'workspace', 'Workspace'];
  const projectIndex = pathParts.findIndex(p => projectDirNames.includes(p));

  if (projectIndex >= 0 && projectIndex < pathParts.length - 1) {
    return pathParts[projectIndex + 1];
  }

  // 默认返回倒数第三个目录（通常是项目根目录）
  return pathParts.length >= 3 ? pathParts[pathParts.length - 3] : 'project';
};

// 模型颜色映射
const modelColors: Record<string, string> = {
  inherit: 'text-gray-400',
  sonnet: 'text-blue-400',
  opus: 'text-purple-400',
  haiku: 'text-green-400'
};

const Agents = () => {
  const { mode } = useMode();
  const { t } = useTranslation();
  const { addNotification, updateNotification } = useNotifications();
  const [searchParams, setSearchParams] = useSearchParams();

  // 状态
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<AgentSyncResponse | null>(null);

  // 分类数据
  const [categories, setCategories] = useState<{
    counts: { builtin: number; user: number; project: number; plugin: number };
    plugins: Array<{ id: string; name: string; count: number }>;
    projects: Array<{ id: string; name: string; count: number }>;
  } | null>(null);

  // 过滤和搜索
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryType>('all');
  const [selectedSubCategories, setSelectedSubCategories] = useState<string[]>([]);
  const [showOverridden, setShowOverridden] = useState(false);
  // 注意：后端已完全跳过 cache 目录，无需前端过滤

  // 编辑/测试/创建模式
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [testingAgent, setTestingAgent] = useState<Agent | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // 操作下拉菜单
  const [showDropdown, setShowDropdown] = useState<number | null>(null);

  // 删除确认对话框
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [agentToDelete, setAgentToDelete] = useState<Agent | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // 获取 agents 列表
  const fetchAgents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await agentsApi.list({
        limit: 1000,
        active_only: !showOverridden
      });

      setAgents(response.items);
    } catch (err) {
      console.error('Failed to fetch agents:', err);
      const message = err instanceof Error ? err.message : 'Failed to load agents';
      setError(message);
      addNotification({
        type: 'error',
        title: 'Failed to load agents',
        message,
      });
    } finally {
      setLoading(false);
    }
  }, [showOverridden, addNotification]);

  // 获取分类数据
  const fetchCategories = useCallback(async () => {
    try {
      const data = await agentsApi.getCategories();
      setCategories(data);
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  }, []);

  // 同步 agents
  const handleSync = async () => {
    const notificationId = addNotification({
      type: 'loading',
      title: 'Syncing agents',
      message: 'Scanning local agents...',
    });

    try {
      setSyncing(true);
      setError(null);
      setSyncResult(null);

      const result = await agentsApi.sync({
        include_builtin: true
      });

      setSyncResult(result);
      await fetchAgents();
      await fetchCategories();

      updateNotification(notificationId, {
        type: 'success',
        title: 'Sync completed',
        message: `${result.created} created, ${result.updated} updated`,
      });
    } catch (err) {
      console.error('Failed to sync agents:', err);
      const message = err instanceof Error ? err.message : 'Sync failed';
      setError(message);
      updateNotification(notificationId, {
        type: 'error',
        title: 'Sync failed',
        message,
      });
    } finally {
      setSyncing(false);
    }
  };

  // 打开删除确认对话框
  const openDeleteDialog = (agent: Agent) => {
    if (agent.is_builtin) {
      return;
    }
    setAgentToDelete(agent);
    setDeleteDialogOpen(true);
    setShowDropdown(null);
  };

  // 确认删除
  const confirmDelete = async () => {
    if (!agentToDelete) return;

    try {
      setIsDeleting(true);
      await agentsApi.delete(agentToDelete.id, true);
      await fetchAgents();
      setDeleteDialogOpen(false);
      setAgentToDelete(null);
    } catch (err) {
      console.error('Failed to delete agent:', err);
      setError(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setIsDeleting(false);
    }
  };

  // 处理卡片操作
  const handleAction = (action: string, agent: Agent) => {
    setShowDropdown(null);

    switch (action) {
      case 'configure':
      case 'edit':
        if (!agent.is_builtin) {
          setEditingAgent(agent);
        }
        break;
      case 'test':
        setTestingAgent(agent);
        break;
      case 'duplicate':
        // TODO: 实现复制功能
        break;
      case 'delete':
        openDeleteDialog(agent);
        break;
    }
  };

  // 初始加载
  useEffect(() => {
    fetchAgents();
    fetchCategories();
  }, [fetchAgents, fetchCategories]);

  // 检测 URL 参数，自动打开创建表单
  useEffect(() => {
    const action = searchParams.get('action');
    if (action === 'create') {
      setIsCreating(true);
      // 清除 URL 参数
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  // 过滤 agents
  const filteredAgents = agents.filter(agent => {
    // Category filter
    if (selectedCategory !== 'all') {
      const scope = agent.scope.toLowerCase();
      if (scope !== selectedCategory) {
        return false;
      }

      // Sub-category filter (multi-select)
      if (selectedSubCategories.length > 0) {
        if (selectedCategory === 'plugin') {
          const pluginName = agent.meta?.plugin_name;
          if (!pluginName || !selectedSubCategories.includes(pluginName)) {
            return false;
          }
        } else if (selectedCategory === 'project') {
          const path = agent.meta?.path || '';
          const parts = path.split('/');
          const claudeIndex = parts.indexOf('.claude');
          const projectName = claudeIndex > 0 ? parts[claudeIndex - 1] : '';
          if (!projectName || !selectedSubCategories.includes(projectName)) {
            return false;
          }
        }
      }
    }

    // 搜索过滤
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        agent.name.toLowerCase().includes(query) ||
        agent.description?.toLowerCase().includes(query) ||
        agent.agent_type?.toLowerCase().includes(query)
      );
    }

    return true;
  });

  // 测试模式
  if (testingAgent) {
    return (
      <AgentTestPanel
        agent={testingAgent}
        onBack={() => {
          setTestingAgent(null);
        }}
        onEdit={(agent) => {
          setTestingAgent(null);
          setEditingAgent(agent);
        }}
      />
    );
  }

  // 编辑器模式
  if (editingAgent) {
    return (
      <AgentEditor
        agent={editingAgent}
        onBack={() => {
          setEditingAgent(null);
          fetchAgents();
        }}
        onSave={() => {
          setEditingAgent(null);
          fetchAgents();
        }}
      />
    );
  }

  // 创建模式 - 使用 AgentEditor 组件（传入 null agent 表示创建模式）
  if (isCreating) {
    return (
      <AgentEditor
        agent={null}
        onBack={() => {
          setIsCreating(false);
        }}
        onSave={() => {
          setIsCreating(false);
          fetchAgents();
        }}
      />
    );
  }

  if (loading && agents.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">加载子代理...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面标题和操作 */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight uppercase">
            AGENTS MANAGEMENT
          </h1>
          <p className="text-gray-400">
            {mode === 'adventure'
              ? '召唤和管理你的 AI 英雄'
              : '管理 Claude Code 子代理（Subagents）'}
          </p>
        </div>

        <div className="flex gap-3">
          <ActionButton
            variant="secondary"
            onClick={handleSync}
            disabled={syncing}
          >
            <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
            {syncing ? '同步中...' : '同步'}
          </ActionButton>

          <ActionButton onClick={() => setIsCreating(true)}>
            <Plus size={16} />
            新建
          </ActionButton>
        </div>
      </header>

      {/* 同步结果提示 */}
      <AnimatePresence>
        {syncResult && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-green-500/10 border border-green-500/30 rounded-xl p-4"
          >
            <div className="flex items-center gap-3">
              <CheckCircle2 size={20} className="text-green-400" />
              <span className="text-green-400">
                同步完成：{syncResult.created} 新增，{syncResult.updated} 更新，{syncResult.deleted} 删除
              </span>
              <button
                onClick={() => setSyncResult(null)}
                className="ml-auto text-gray-400 hover:text-white"
              >
                ×
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 错误提示 */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <AlertCircle size={20} className="text-red-400" />
            <span className="text-red-400">{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-gray-400 hover:text-white"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* 分类过滤 */}
      {categories && (
        <CategoryFilter
          selectedCategory={selectedCategory}
          selectedSubCategories={selectedSubCategories}
          counts={categories.counts}
          projectSubCategories={categories.projects}
          pluginSubCategories={categories.plugins}
          onCategoryChange={setSelectedCategory}
          onSubCategoriesChange={setSelectedSubCategories}
        />
      )}

      {/* 搜索和过滤 */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="搜索子代理..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-blue-500/50"
          />
        </div>

        <button
          onClick={() => setShowOverridden(!showOverridden)}
          className={`
            flex items-center gap-2 px-4 py-3 rounded-xl border transition-all
            ${showOverridden
              ? 'bg-orange-500/20 border-orange-500/30 text-orange-400'
              : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
            }
          `}
        >
          {showOverridden ? <Eye size={18} /> : <EyeOff size={18} />}
          {showOverridden ? '显示已覆盖' : '隐藏已覆盖'}
        </button>
      </div>

      {/* 子代理列表 */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {filteredAgents.map((agent) => (
            <motion.div
              key={agent.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
            >
              <GlassCard
                className={`
                  flex flex-col h-full p-6
                  ${agent.is_overridden ? 'opacity-60' : ''}
                `}
              >
                {/* 头部 - 图标和操作菜单 */}
                <div className="flex justify-between items-start mb-4">
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 border-2"
                    style={{
                      backgroundColor: agent.meta?.color
                        ? `${agent.meta.color}20`
                        : agent.scope === 'builtin'
                        ? 'rgba(59, 130, 246, 0.2)'
                        : agent.scope === 'user'
                        ? 'rgba(34, 197, 94, 0.2)'
                        : agent.scope === 'project'
                        ? 'rgba(168, 85, 247, 0.2)'
                        : 'rgba(249, 115, 22, 0.2)',
                      borderColor: agent.meta?.color ||
                        (agent.scope === 'builtin' ? '#3b82f6' :
                         agent.scope === 'user' ? '#22c55e' :
                         agent.scope === 'project' ? '#a855f7' : '#f97316')
                    }}
                  >
                    {agent.is_builtin ? (
                      <Shield size={32} style={{ 
                        color: agent.meta?.color || '#3b82f6' 
                      }} />
                    ) : (
                      <Cpu size={32} style={{ 
                        color: agent.meta?.color || 
                          (agent.scope === 'user' ? '#22c55e' : 
                           agent.scope === 'project' ? '#a855f7' : '#f97316')
                      }} />
                    )}
                  </div>

                  {/* 操作下拉菜单 */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setShowDropdown(showDropdown === agent.id ? null : agent.id);
                      }}
                      className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                      <MoreVertical size={20} className="text-gray-400" />
                    </button>

                    <AnimatePresence>
                      {showDropdown === agent.id && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="absolute right-0 top-full mt-2 w-48 bg-[#1a1d2e] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-20"
                        >
                          {[
                            { icon: Settings2, label: 'Configure', action: 'configure', color: 'blue', disabled: agent.is_builtin },
                            { icon: Play, label: 'Test', action: 'test', color: 'green', disabled: false },
                            { icon: Edit, label: 'Edit', action: 'edit', color: 'gray', disabled: agent.is_builtin },
                            { icon: Copy, label: 'Duplicate', action: 'duplicate', color: 'gray', disabled: true },
                            { icon: Trash2, label: 'Delete', action: 'delete', color: 'red', disabled: agent.is_builtin },
                          ].map((item) => (
                            <button
                              key={item.action}
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                if (!item.disabled) {
                                  handleAction(item.action, agent);
                                }
                              }}
                              disabled={item.disabled}
                              className={`w-full flex items-center gap-3 px-4 py-3 transition-colors text-left ${
                                item.disabled 
                                  ? 'opacity-40 cursor-not-allowed' 
                                  : 'hover:bg-white/5'
                              }`}
                            >
                              <item.icon size={16} className={`text-${item.color}-400`} />
                              <span className="text-sm font-bold">{item.label}</span>
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Agent 名称和描述 */}
                <div className="mb-4 flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-xl font-black line-clamp-1">{agent.name}</h3>
                    {/* Plugin name 或 Project name */}
                    {agent.scope === 'plugin' && agent.meta?.plugin_name && (
                      <span className="px-2 py-0.5 text-xs font-bold bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded-md shrink-0">
                        {agent.meta.plugin_name}
                      </span>
                    )}
                    {agent.scope === 'project' && agent.meta?.path && (
                      <span className="px-2 py-0.5 text-xs font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-md shrink-0">
                        {extractProjectName(agent.meta.path)}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-400 line-clamp-2 min-h-[40px]">
                    {agent.description}
                  </p>
                </div>

                {/* Model、Status、Call、Health 网格 */}
                <div className="grid grid-cols-4 gap-2 mb-4">
                  {/* Model */}
                  <div className="p-2 bg-white/5 rounded-xl">
                    <p className="text-[10px] text-gray-500 uppercase font-black mb-1">Model</p>
                    <p className={`text-xs font-bold ${modelColors[agent.model || 'inherit']}`}>
                      {(agent.model || 'inherit').toUpperCase()}
                    </p>
                  </div>

                  {/* Status */}
                  <div className="p-2 bg-white/5 rounded-xl">
                    <p className="text-[10px] text-gray-500 uppercase font-black mb-1">Status</p>
                    <div className="flex items-center gap-1">
                      <div className={`w-2 h-2 rounded-full ${
                        !agent.enabled ? 'bg-gray-400' :
                        agent.is_overridden ? 'bg-orange-400' :
                        'bg-green-400'
                      }`} />
                      <p className={`text-xs font-bold ${
                        !agent.enabled ? 'text-gray-400' :
                        agent.is_overridden ? 'text-orange-400' :
                        'text-green-400'
                      }`}>
                        {!agent.enabled ? 'Off' : agent.is_overridden ? 'Over' : 'On'}
                      </p>
                    </div>
                  </div>

                  {/* Call */}
                  <div className="p-2 bg-white/5 rounded-xl">
                    <p className="text-[10px] text-gray-500 uppercase font-black mb-1">Call</p>
                    <p className="text-xs font-bold text-blue-400">
                      {agent.meta?.usage_count || 0}
                    </p>
                  </div>

                  {/* Health */}
                  <div className="p-2 bg-white/5 rounded-xl">
                    <p className="text-[10px] text-gray-500 uppercase font-black mb-1">Health</p>
                    <div className="flex items-center gap-1">
                      <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full"
                          style={{ width: `${Math.min(100, (agent.meta?.usage_count || 0) / 10)}%` }}
                        />
                      </div>
                      <p className="text-[10px] font-bold text-green-400">
                        {Math.min(100, Math.floor((agent.meta?.usage_count || 0) / 10))}%
                      </p>
                    </div>
                  </div>
                </div>

                {/* 工具标签 */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {agent.tools.length === 0 ? (
                    <span className="px-2 py-1 bg-white/5 rounded-lg text-xs font-bold text-gray-400">
                      继承全部工具
                    </span>
                  ) : (
                    <>
                      {agent.tools.slice(0, 2).map(tool => (
                        <span
                          key={tool}
                          className="px-2 py-1 bg-blue-500/10 border border-blue-500/20 rounded-lg text-xs font-bold text-blue-400"
                        >
                          {tool}
                        </span>
                      ))}
                      {agent.tools.length > 2 && (
                        <span className="px-2 py-1 bg-blue-500/10 border border-blue-500/20 rounded-lg text-xs font-bold text-blue-400">
                          +{agent.tools.length - 2}
                        </span>
                      )}
                    </>
                  )}
                  {agent.skills && agent.skills.length > 0 && (
                    <span className="px-2 py-1 bg-cyan-500/10 border border-cyan-500/20 rounded-lg text-xs font-bold text-cyan-400 flex items-center gap-1">
                      <Zap size={12} />
                      {agent.skills.length} skills
                    </span>
                  )}
                </div>

                {/* 额外信息 */}
                <div className="flex items-center gap-4 mb-4 text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <Shield size={12} className={
                      agent.permission_mode === 'bypassPermissions' ? 'text-red-400' :
                      agent.permission_mode === 'plan' ? 'text-purple-400' : 'text-gray-400'
                    } />
                    <span>{agent.permission_mode || 'default'}</span>
                  </div>
                  {agent.memory && (
                    <div className="flex items-center gap-1">
                      <Activity size={12} className="text-yellow-400" />
                      <span>{agent.memory}</span>
                    </div>
                  )}
                </div>

                {/* 操作按钮 */}
                <div className="grid grid-cols-2 gap-3 mt-auto">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setTestingAgent(agent);
                    }}
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 rounded-xl transition-all font-bold text-sm"
                  >
                    <Play size={16} className="text-green-400" />
                    <span className="text-green-400">Test</span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (!agent.is_builtin) {
                        setEditingAgent(agent);
                      }
                    }}
                    disabled={agent.is_builtin}
                    className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl transition-all font-bold text-sm ${
                      agent.is_builtin
                        ? 'bg-white/5 text-gray-500 cursor-not-allowed'
                        : 'bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30'
                    }`}
                  >
                    <Settings2 size={16} className={agent.is_builtin ? 'text-gray-500' : 'text-blue-400'} />
                    <span className={agent.is_builtin ? 'text-gray-500' : 'text-blue-400'}>Config</span>
                  </button>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* 空状态 */}
      {filteredAgents.length === 0 && !loading && (
        <div className="text-center py-16">
          <Layers size={48} className="mx-auto text-gray-600 mb-4" />
          <h3 className="text-xl font-bold text-gray-400 mb-2">
            {searchQuery || selectedCategory !== 'all' || selectedSubCategories.length > 0
              ? '没有找到匹配的子代理'
              : '还没有子代理'
            }
          </h3>
          <p className="text-gray-500 mb-6">
            {searchQuery || selectedCategory !== 'all' || selectedSubCategories.length > 0
              ? '尝试调整搜索条件'
              : '点击同步按钮扫描本地子代理，或创建新的子代理'
            }
          </p>
          <div className="flex justify-center gap-3">
            <ActionButton variant="secondary" onClick={handleSync}>
              <RefreshCw size={16} />
              同步本地
            </ActionButton>
            <ActionButton onClick={() => setIsCreating(true)}>
              <Plus size={16} />
              新建
            </ActionButton>
          </div>
        </div>
      )}

      {/* 删除确认对话框 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定删除子代理 "{agentToDelete?.name}"？此操作将删除对应的配置文件，不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-500 focus:ring-red-600"
            >
              {isDeleting ? '删除中...' : '删除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Agents;
