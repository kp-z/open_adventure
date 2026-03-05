/**
 * Process Detail Panel - displays detailed information about a Claude Code process
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  X,
  Terminal,
  Cpu,
  MemoryStick,
  Clock,
  FolderOpen,
  StopCircle,
  AlertCircle,
  CheckCircle2,
  Activity,
} from 'lucide-react';
import { GlassCard, ActionButton } from './ui-shared';
import { ClaudeProcessInfo } from '@/lib/api/services/processes';
import { stopProcess } from '@/lib/api/services/processes';

interface ProcessDetailPanelProps {
  process: ClaudeProcessInfo;
  onClose: () => void;
  onProcessStopped: () => void;
}

// 状态颜色映射
const statusColors: Record<string, string> = {
  running: 'text-green-400 bg-green-500/20 border-green-500/30',
  idle: 'text-gray-400 bg-gray-500/20 border-gray-500/30',
  high_load: 'text-orange-400 bg-orange-500/20 border-orange-500/30',
  stopped: 'text-red-400 bg-red-500/20 border-red-500/30',
};

// 格式化时间
const formatDateTime = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

// 格式化运行时长
const formatUptime = (startTime: string): string => {
  const start = new Date(startTime);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  const parts = [];
  if (diffDays > 0) parts.push(`${diffDays}天`);
  if (diffHours % 24 > 0) parts.push(`${diffHours % 24}小时`);
  if (diffMins % 60 > 0) parts.push(`${diffMins % 60}分钟`);
  if (parts.length === 0) parts.push(`${diffSecs}秒`);

  return parts.join(' ');
};

export const ProcessDetailPanel: React.FC<ProcessDetailPanelProps> = ({
  process,
  onClose,
  onProcessStopped,
}) => {
  const [isStopping, setIsStopping] = useState(false);
  const [stopError, setStopError] = useState<string | null>(null);
  const [stopSuccess, setStopSuccess] = useState(false);

  const handleStop = async (force: boolean = false) => {
    try {
      setIsStopping(true);
      setStopError(null);
      const result = await stopProcess(process.pid, force);
      if (result.success) {
        setStopSuccess(true);
        setTimeout(() => {
          onProcessStopped();
          onClose();
        }, 1500);
      } else {
        setStopError(result.message);
      }
    } catch (err) {
      setStopError(err instanceof Error ? err.message : 'Failed to stop process');
    } finally {
      setIsStopping(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-4xl max-h-[90vh] overflow-y-auto"
      >
        <GlassCard className="p-6">
          {/* 头部 */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/30 flex items-center justify-center">
                <Terminal size={32} className="text-blue-400" />
              </div>
              <div>
                <h2 className="text-2xl font-black mb-1">进程详情</h2>
                <p className="text-gray-400">PID: {process.pid}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X size={24} className="text-gray-400" />
            </button>
          </div>

          {/* 成功/错误提示 */}
          {stopSuccess && (
            <div className="mb-4 p-4 bg-green-500/10 border border-green-500/30 rounded-xl flex items-center gap-3">
              <CheckCircle2 size={20} className="text-green-400" />
              <span className="text-green-400">进程已成功停止</span>
            </div>
          )}

          {stopError && (
            <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3">
              <AlertCircle size={20} className="text-red-400" />
              <span className="text-red-400">{stopError}</span>
            </div>
          )}

          {/* 基本信息 */}
          <div className="mb-6">
            <h3 className="text-lg font-black mb-4 uppercase">基本信息</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-white/5 rounded-xl">
                <p className="text-xs text-gray-500 uppercase font-black mb-2">进程名称</p>
                <p className="text-sm font-bold">{process.name}</p>
              </div>

              {process.agent_name && (
                <div className="p-4 bg-white/5 rounded-xl">
                  <p className="text-xs text-gray-500 uppercase font-black mb-2">Agent 名称</p>
                  <p className="text-sm font-bold">{process.agent_name}</p>
                </div>
              )}

              <div className="p-4 bg-white/5 rounded-xl">
                <p className="text-xs text-gray-500 uppercase font-black mb-2">状态</p>
                <span
                  className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-bold border ${
                    statusColors[process.status]
                  }`}
                >
                  <Activity size={14} />
                  {process.status.toUpperCase()}
                </span>
              </div>

              <div className="p-4 bg-white/5 rounded-xl">
                <p className="text-xs text-gray-500 uppercase font-black mb-2">管理状态</p>
                <span
                  className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-bold border ${
                    process.is_managed
                      ? 'text-blue-400 bg-blue-500/20 border-blue-500/30'
                      : 'text-gray-400 bg-gray-500/20 border-gray-500/30'
                  }`}
                >
                  {process.is_managed ? 'MANAGED' : 'UNMANAGED'}
                </span>
              </div>
            </div>
          </div>

          {/* 资源使用 */}
          <div className="mb-6">
            <h3 className="text-lg font-black mb-4 uppercase">资源使用</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-white/5 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Cpu size={16} className="text-blue-400" />
                  <p className="text-xs text-gray-500 uppercase font-black">CPU 使用率</p>
                </div>
                <p className="text-2xl font-black text-blue-400">
                  {process.cpu_percent.toFixed(1)}%
                </p>
              </div>

              <div className="p-4 bg-white/5 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <MemoryStick size={16} className="text-purple-400" />
                  <p className="text-xs text-gray-500 uppercase font-black">内存使用</p>
                </div>
                <p className="text-2xl font-black text-purple-400">
                  {process.memory_mb.toFixed(0)} MB
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  ({process.memory_percent.toFixed(1)}%)
                </p>
              </div>

              <div className="p-4 bg-white/5 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Clock size={16} className="text-green-400" />
                  <p className="text-xs text-gray-500 uppercase font-black">运行时长</p>
                </div>
                <p className="text-lg font-black text-green-400">
                  {formatUptime(process.start_time)}
                </p>
              </div>
            </div>
          </div>

          {/* 时间信息 */}
          <div className="mb-6">
            <h3 className="text-lg font-black mb-4 uppercase">时间信息</h3>
            <div className="p-4 bg-white/5 rounded-xl">
              <p className="text-xs text-gray-500 uppercase font-black mb-2">启动时间</p>
              <p className="text-sm font-bold">{formatDateTime(process.start_time)}</p>
            </div>
          </div>

          {/* 工作目录 */}
          {process.working_directory && (
            <div className="mb-6">
              <h3 className="text-lg font-black mb-4 uppercase">工作目录</h3>
              <div className="p-4 bg-white/5 rounded-xl flex items-center gap-3">
                <FolderOpen size={20} className="text-gray-400 shrink-0" />
                <p className="text-sm font-mono break-all">{process.working_directory}</p>
              </div>
            </div>
          )}

          {/* 命令行 */}
          <div className="mb-6">
            <h3 className="text-lg font-black mb-4 uppercase">命令行</h3>
            <div className="p-4 bg-white/5 rounded-xl">
              <p className="text-sm font-mono break-all text-gray-300">
                {process.command_line}
              </p>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex gap-3">
            <button
              onClick={() => handleStop(false)}
              disabled={isStopping || stopSuccess}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-xl transition-all text-red-400 font-bold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <StopCircle size={20} />
              <span>{isStopping ? '停止中...' : '停止进程'}</span>
            </button>

            <button
              onClick={() => handleStop(true)}
              disabled={isStopping || stopSuccess}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 rounded-xl transition-all text-red-400 font-bold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <AlertCircle size={20} />
              <span>{isStopping ? '强制停止中...' : '强制停止'}</span>
            </button>
          </div>
        </GlassCard>
      </motion.div>
    </motion.div>
  );
};
