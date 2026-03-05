/**
 * Process Kanban View - displays processes organized by status columns
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ClaudeProcessInfo } from '@/lib/api/services/processes';
import { ProcessCard } from './ProcessCard';

interface ProcessKanbanViewProps {
  processes: ClaudeProcessInfo[];
  onStop: (pid: number) => void;
  onViewDetails: (pid: number) => void;
}

// 状态列定义
const statusColumns = [
  {
    id: 'running',
    title: 'Running',
    description: 'Actively executing tasks',
    color: 'green',
  },
  {
    id: 'idle',
    title: 'Idle',
    description: 'Started but not active',
    color: 'gray',
  },
  {
    id: 'high_load',
    title: 'High Load',
    description: 'High CPU/memory usage',
    color: 'orange',
  },
] as const;

export const ProcessKanbanView: React.FC<ProcessKanbanViewProps> = ({
  processes,
  onStop,
  onViewDetails,
}) => {
  // 按状态分组进程
  const groupedProcesses = statusColumns.reduce((acc, column) => {
    acc[column.id] = processes.filter((p) => p.status === column.id);
    return acc;
  }, {} as Record<string, ClaudeProcessInfo[]>);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {statusColumns.map((column) => {
        const columnProcesses = groupedProcesses[column.id] || [];
        const colorClasses = {
          green: 'border-green-500/30 bg-green-500/5',
          gray: 'border-gray-500/30 bg-gray-500/5',
          orange: 'border-orange-500/30 bg-orange-500/5',
        };

        return (
          <div key={column.id} className="flex flex-col">
            {/* 列头 */}
            <div
              className={`p-4 rounded-t-xl border ${colorClasses[column.color]} backdrop-blur-sm`}
            >
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-lg font-black uppercase">{column.title}</h3>
                <span
                  className={`px-2 py-1 rounded-lg text-xs font-bold ${
                    column.color === 'green'
                      ? 'bg-green-500/20 text-green-400'
                      : column.color === 'orange'
                      ? 'bg-orange-500/20 text-orange-400'
                      : 'bg-gray-500/20 text-gray-400'
                  }`}
                >
                  {columnProcesses.length}
                </span>
              </div>
              <p className="text-xs text-gray-400">{column.description}</p>
            </div>

            {/* 进程列表 */}
            <div className="flex-1 p-4 border-x border-b border-white/10 rounded-b-xl bg-white/5 backdrop-blur-sm min-h-[400px]">
              <AnimatePresence mode="popLayout">
                {columnProcesses.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center justify-center h-full text-gray-500 text-sm"
                  >
                    No processes
                  </motion.div>
                ) : (
                  <div className="space-y-4">
                    {columnProcesses.map((process) => (
                      <ProcessCard
                        key={process.pid}
                        process={process}
                        onStop={onStop}
                        onViewDetails={onViewDetails}
                      />
                    ))}
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>
        );
      })}
    </div>
  );
};
