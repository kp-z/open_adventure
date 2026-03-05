/**
 * Terminal Tab - displays terminal execution history
 * Reuses the execution display logic from Executions page
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  Terminal,
  AlertCircle,
} from 'lucide-react';
import { GlassCard, ActionButton } from './ui-shared';
import { LoadingSpinner } from './LoadingSpinner';
import { executionsApi } from '@/lib/api';
import type { Execution } from '@/lib/api';

export const TerminalTab: React.FC = () => {
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchExecutions();
  }, []);

  const fetchExecutions = async () => {
    try {
      setLoading(true);
      setError(null);
      // 只获取 terminal 类型的执行记录
      const response = await executionsApi.list({
        execution_type: 'terminal',
        limit: 50,
      });
      setExecutions(response.items);
    } catch (err) {
      console.error('Failed to fetch terminal executions:', err);
      setError(err instanceof Error ? err.message : 'Failed to load executions');
    } finally {
      setLoading(false);
    }
  };

  // 过滤执行记录
  const filteredExecutions =
    searchQuery.trim() === ''
      ? executions
      : executions.filter(
          (execution) =>
            execution.task?.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            execution.task?.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            execution.terminal_command?.toLowerCase().includes(searchQuery.toLowerCase())
        );

  // 状态图标
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'succeeded':
        return <CheckCircle2 size={16} className="text-green-500" />;
      case 'failed':
        return <XCircle size={16} className="text-red-500" />;
      case 'running':
        return <Clock size={16} className="text-blue-500 animate-pulse" />;
      case 'waiting_user':
        return <Clock size={16} className="text-yellow-500" />;
      default:
        return <Clock size={16} className="text-gray-500" />;
    }
  };

  // 状态颜色
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'succeeded':
        return 'text-green-500';
      case 'failed':
        return 'text-red-500';
      case 'running':
        return 'text-blue-500';
      case 'waiting_user':
        return 'text-yellow-500';
      default:
        return 'text-gray-500';
    }
  };

  // 格式化时长
  const formatDuration = (startTime: string, endTime?: string) => {
    if (!endTime) return 'N/A';
    const start = new Date(startTime).getTime();
    const end = new Date(endTime).getTime();
    const duration = Math.floor((end - start) / 1000);
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    return `${minutes}m ${seconds}s`;
  };

  // 格式化时间
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 172800) return 'Yesterday';
    return date.toLocaleDateString();
  };

  if (loading) {
    return <LoadingSpinner text="加载终端执行历史..." />;
  }

  return (
    <div className="space-y-6">
      {/* 搜索框 */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative flex-1 w-full sm:w-auto">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="搜索终端执行记录..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-white/20 transition-colors"
          />
        </div>

        <ActionButton
          variant="secondary"
          onClick={fetchExecutions}
          disabled={loading}
          className="w-full sm:w-auto px-4 py-3"
        >
          <Terminal size={16} />
          <span className="ml-2">刷新</span>
        </ActionButton>
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

      {/* 桌面端表格 */}
      <div className="hidden md:block bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/5 bg-white/5 text-[10px] font-black uppercase tracking-widest text-gray-400">
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Command</th>
              <th className="px-6 py-4">Description</th>
              <th className="px-6 py-4">Duration</th>
              <th className="px-6 py-4">Finished</th>
              <th className="px-6 py-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filteredExecutions.length > 0 ? (
              filteredExecutions.map((execution) => (
                <tr
                  key={execution.id}
                  className="hover:bg-white/5 transition-colors group"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(execution.status)}
                      <span
                        className={`text-xs font-bold capitalize ${getStatusColor(
                          execution.status
                        )}`}
                      >
                        {execution.status}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Terminal size={14} className="text-orange-400 shrink-0" />
                      <code className="text-xs font-mono text-gray-300 truncate max-w-[300px]">
                        {execution.terminal_command || 'N/A'}
                      </code>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-sm font-bold">
                        {execution.task?.title || `Execution #${execution.id}`}
                      </p>
                      <p className="text-[10px] text-gray-500 line-clamp-1">
                        {execution.task?.description || 'No description'}
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-400">
                    {formatDuration(execution.created_at, execution.updated_at)}
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-400">
                    {formatTime(execution.created_at)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="p-2 text-gray-500 hover:text-blue-400 transition-colors">
                      <ArrowRight size={18} />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                  没有找到终端执行记录
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 移动端卡片展示 */}
      <div className="md:hidden space-y-3">
        {filteredExecutions.length > 0 ? (
          filteredExecutions.map((execution) => (
            <motion.div
              key={execution.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <GlassCard className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(execution.status)}
                    <span
                      className={`text-xs font-bold capitalize ${getStatusColor(
                        execution.status
                      )}`}
                    >
                      {execution.status}
                    </span>
                  </div>
                  <button className="p-1 text-gray-500 hover:text-blue-400 transition-colors">
                    <ArrowRight size={16} />
                  </button>
                </div>

                {/* 命令 */}
                <div className="mb-3 p-2 bg-white/5 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Terminal size={12} className="text-orange-400" />
                    <span className="text-[10px] text-gray-500 uppercase font-black">
                      Command
                    </span>
                  </div>
                  <code className="text-xs font-mono text-gray-300 break-all">
                    {execution.terminal_command || 'N/A'}
                  </code>
                </div>

                {/* 描述 */}
                <div className="mb-3">
                  <p className="text-sm font-bold mb-1">
                    {execution.task?.title || `Execution #${execution.id}`}
                  </p>
                  <p className="text-xs text-gray-500 line-clamp-2">
                    {execution.task?.description || 'No description'}
                  </p>
                </div>

                {/* 时间信息 */}
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>{formatDuration(execution.created_at, execution.updated_at)}</span>
                  <span>{formatTime(execution.created_at)}</span>
                </div>
              </GlassCard>
            </motion.div>
          ))
        ) : (
          <div className="text-center py-12 text-gray-500">没有找到终端执行记录</div>
        )}
      </div>
    </div>
  );
};
