/**
 * Process Tab - displays running Claude Code processes with card and kanban views
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Grid, Columns, Search, RefreshCw, AlertCircle } from 'lucide-react';
import { useRunningProcesses } from '../hooks/useRunningProcesses';
import { ProcessCard } from './ProcessCard';
import { ProcessKanbanView } from './ProcessKanbanView';
import { ProcessDetailPanel } from './ProcessDetailPanel';
import { ActionButton } from './ui-shared';
import { LoadingSpinner } from './LoadingSpinner';
import { ClaudeProcessInfo } from '@/lib/api/services/processes';

type ViewMode = 'card' | 'kanban';

export const ProcessTab: React.FC = () => {
  const { processes, isLoading, error, isConnected, refresh } = useRunningProcesses();
  const [viewMode, setViewMode] = useState<ViewMode>('card');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProcess, setSelectedProcess] = useState<ClaudeProcessInfo | null>(null);

  // 过滤进程
  const filteredProcesses = processes.filter((process) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      process.pid.toString().includes(query) ||
      process.name.toLowerCase().includes(query) ||
      process.agent_name?.toLowerCase().includes(query) ||
      process.working_directory?.toLowerCase().includes(query) ||
      process.command_line.toLowerCase().includes(query)
    );
  });

  // 处理停止进程
  const handleStop = async (pid: number) => {
    // 停止操作会在 ProcessDetailPanel 中处理
    const process = processes.find((p) => p.pid === pid);
    if (process) {
      setSelectedProcess(process);
    }
  };

  // 处理查看详情
  const handleViewDetails = (pid: number) => {
    const process = processes.find((p) => p.pid === pid);
    if (process) {
      setSelectedProcess(process);
    }
  };

  // 处理进程停止后的刷新
  const handleProcessStopped = () => {
    refresh();
  };

  if (isLoading && processes.length === 0) {
    return <LoadingSpinner text="扫描进程中..." />;
  }

  return (
    <div className="space-y-6">
      {/* 头部：搜索和视图切换 */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        {/* 搜索框 */}
        <div className="relative flex-1 w-full sm:w-auto">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="搜索进程 (PID, 名称, Agent, 路径...)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-white/20 transition-colors"
          />
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-2 w-full sm:w-auto">
          {/* 刷新按钮 */}
          <ActionButton
            variant="secondary"
            onClick={refresh}
            disabled={isLoading}
            className="flex-1 sm:flex-none px-4 py-3"
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
            <span className="ml-2">刷新</span>
          </ActionButton>

          {/* 视图切换 */}
          <div className="flex gap-2 bg-white/5 rounded-xl p-1 flex-1 sm:flex-none">
            <button
              onClick={() => setViewMode('card')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                viewMode === 'card'
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Grid size={16} />
              <span className="hidden sm:inline">卡片</span>
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                viewMode === 'kanban'
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Columns size={16} />
              <span className="hidden sm:inline">看板</span>
            </button>
          </div>
        </div>
      </div>

      {/* 连接状态指示器 */}
      <div className="flex items-center gap-2 text-sm">
        <div
          className={`w-2 h-2 rounded-full ${
            isConnected ? 'bg-green-400' : 'bg-gray-400'
          }`}
        />
        <span className="text-gray-400">
          {isConnected ? '实时监控已连接' : '实时监控未连接'}
        </span>
        {filteredProcesses.length > 0 && (
          <>
            <span className="text-gray-600">•</span>
            <span className="text-gray-400">
              {filteredProcesses.length} 个进程
            </span>
          </>
        )}
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <AlertCircle size={20} className="text-red-400" />
            <span className="text-red-400">{error}</span>
          </div>
        </div>
      )}

      {/* 进程列表 */}
      {filteredProcesses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-500">
          <p className="text-lg mb-2">没有找到运行中的 Claude Code 进程</p>
          <p className="text-sm">启动 Claude Code 后，进程会自动显示在这里</p>
        </div>
      ) : viewMode === 'card' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredProcesses.map((process) => (
              <ProcessCard
                key={process.pid}
                process={process}
                onStop={handleStop}
                onViewDetails={handleViewDetails}
              />
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <ProcessKanbanView
          processes={filteredProcesses}
          onStop={handleStop}
          onViewDetails={handleViewDetails}
        />
      )}

      {/* 进程详情面板 */}
      <AnimatePresence>
        {selectedProcess && (
          <ProcessDetailPanel
            process={selectedProcess}
            onClose={() => setSelectedProcess(null)}
            onProcessStopped={handleProcessStopped}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
