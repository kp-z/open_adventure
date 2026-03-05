/**
 * Process card component - displays Claude Code process information
 * Reuses the card style from Agents page
 */

import React from 'react';
import { motion } from 'motion/react';
import {
  Cpu,
  MemoryStick,
  Clock,
  FolderOpen,
  Terminal,
  StopCircle,
  Eye,
  Activity,
} from 'lucide-react';
import { GlassCard, ActionButton } from './ui-shared';
import { ClaudeProcessInfo } from '@/lib/api/services/processes';

interface ProcessCardProps {
  process: ClaudeProcessInfo;
  onStop: (pid: number) => void;
  onViewDetails: (pid: number) => void;
}

// 状态颜色映射
const statusColors: Record<string, string> = {
  running: 'bg-green-400',
  idle: 'bg-gray-400',
  high_load: 'bg-orange-400',
  stopped: 'bg-red-400',
};

const statusTextColors: Record<string, string> = {
  running: 'text-green-400',
  idle: 'text-gray-400',
  high_load: 'text-orange-400',
  stopped: 'text-red-400',
};

// 格式化运行时长
const formatUptime = (startTime: string): string => {
  const start = new Date(startTime);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) {
    return `${diffDays}d ${diffHours % 24}h`;
  } else if (diffHours > 0) {
    return `${diffHours}h ${diffMins % 60}m`;
  } else {
    return `${diffMins}m`;
  }
};

export const ProcessCard: React.FC<ProcessCardProps> = ({
  process,
  onStop,
  onViewDetails,
}) => {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
    >
      <GlassCard
        className="p-6 hover:border-white/20 transition-all cursor-pointer group"
        onClick={() => onViewDetails(process.pid)}
      >
        {/* 头部：PID 和状态指示器 */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            {/* 进程图标 */}
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/30 flex items-center justify-center">
              <Terminal size={24} className="text-blue-400" />
            </div>

            {/* PID 和名称 */}
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-black">PID {process.pid}</h3>
                {process.is_managed && (
                  <span className="px-2 py-0.5 text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-md">
                    MANAGED
                  </span>
                )}
              </div>
              {process.agent_name && (
                <p className="text-sm text-gray-400">{process.agent_name}</p>
              )}
            </div>
          </div>

          {/* 状态指示器 */}
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${statusColors[process.status]}`} />
            <span className={`text-xs font-bold uppercase ${statusTextColors[process.status]}`}>
              {process.status}
            </span>
          </div>
        </div>

        {/* 工作目录 */}
        {process.working_directory && (
          <div className="mb-4 flex items-center gap-2 text-sm text-gray-400">
            <FolderOpen size={14} />
            <span className="truncate">{process.working_directory}</span>
          </div>
        )}

        {/* 资源使用和运行时长网格 */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {/* CPU 使用率 */}
          <div className="p-2 bg-white/5 rounded-xl">
            <p className="text-[10px] text-gray-500 uppercase font-black mb-1">CPU</p>
            <div className="flex items-center gap-1">
              <Cpu size={12} className="text-blue-400" />
              <p className="text-xs font-bold text-blue-400">
                {process.cpu_percent.toFixed(1)}%
              </p>
            </div>
          </div>

          {/* 内存使用 */}
          <div className="p-2 bg-white/5 rounded-xl">
            <p className="text-[10px] text-gray-500 uppercase font-black mb-1">Memory</p>
            <div className="flex items-center gap-1">
              <MemoryStick size={12} className="text-purple-400" />
              <p className="text-xs font-bold text-purple-400">
                {process.memory_mb.toFixed(0)}MB
              </p>
            </div>
          </div>

          {/* 运行时长 */}
          <div className="p-2 bg-white/5 rounded-xl">
            <p className="text-[10px] text-gray-500 uppercase font-black mb-1">Uptime</p>
            <div className="flex items-center gap-1">
              <Clock size={12} className="text-green-400" />
              <p className="text-xs font-bold text-green-400">
                {formatUptime(process.start_time)}
              </p>
            </div>
          </div>
        </div>

        {/* 命令行 */}
        <div className="mb-4 p-2 bg-white/5 rounded-lg">
          <p className="text-[10px] text-gray-500 uppercase font-black mb-1">Command</p>
          <p className="text-xs text-gray-300 font-mono truncate">{process.command_line}</p>
        </div>

        {/* 操作按钮 */}
        <div className="grid grid-cols-2 gap-3 mt-auto">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onViewDetails(process.pid);
            }}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded-xl transition-all text-blue-400 font-bold text-sm"
          >
            <Eye size={16} />
            <span>Details</span>
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onStop(process.pid);
            }}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-xl transition-all text-red-400 font-bold text-sm"
          >
            <StopCircle size={16} />
            <span>Stop</span>
          </button>
        </div>
      </GlassCard>
    </motion.div>
  );
};
