/**
 * TasksCard Component
 * 显示 Agent 相关的任务列表，支持实时更新
 */
import React from 'react';
import { motion } from 'motion/react';
import { Clock, CheckCircle2, AlertCircle, Loader, FileText } from 'lucide-react';
import { GlassCard } from '../ui-shared';
import type { AgentTask } from '../../hooks/useAgentTasks';

interface TasksCardProps {
  tasks: AgentTask[];
  loading: boolean;
}

const statusConfig = {
  draft: { label: '草稿', color: 'gray', icon: FileText },
  planning: { label: '计划中', color: 'purple', icon: Loader },
  plan_ready: { label: '计划就绪', color: 'blue', icon: CheckCircle2 },
  pending: { label: '待执行', color: 'yellow', icon: Clock },
  running: { label: '执行中', color: 'blue', icon: Loader },
  waiting_user: { label: '等待输入', color: 'orange', icon: Clock },
  succeeded: { label: '已完成', color: 'green', icon: CheckCircle2 },
  failed: { label: '失败', color: 'red', icon: AlertCircle },
  cancelled: { label: '已取消', color: 'gray', icon: AlertCircle },
};

export function TasksCard({ tasks, loading }: TasksCardProps) {
  if (loading) {
    return (
      <GlassCard className="p-4">
        <div className="flex items-center justify-center h-32">
          <Loader className="w-6 h-6 animate-spin text-blue-400" />
        </div>
      </GlassCard>
    );
  }

  const runningTasks = tasks.filter(t => t.status === 'running');
  const pendingTasks = tasks.filter(t => t.status === 'pending');

  return (
    <GlassCard className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold">Running Tasks</h3>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-blue-400">{runningTasks.length} active</span>
          <span className="text-white/40">·</span>
          <span className="text-yellow-400">{pendingTasks.length} pending</span>
        </div>
      </div>

      {tasks.length === 0 ? (
        <div className="text-center py-8 text-white/60 text-sm">
          <p>No tasks yet</p>
          <p className="mt-1">Create a task to get started</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          {tasks.map(task => (
            <TaskItem key={task.id} task={task} />
          ))}
        </div>
      )}
    </GlassCard>
  );
}

interface TaskItemProps {
  task: AgentTask;
}

function TaskItem({ task }: TaskItemProps) {
  const config = statusConfig[task.status as keyof typeof statusConfig] || statusConfig.draft;
  const Icon = config.icon;

  // 计算进度（基于依赖关系）
  const totalDeps = task.depends_on.length + task.blocks.length;
  const progress = task.status === 'running' ? 50 : 0; // 简化计算

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-all cursor-pointer"
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm truncate">{task.title}</h4>
          {task.description && (
            <p className="text-xs text-white/60 line-clamp-2 mt-1">{task.description}</p>
          )}
        </div>
        <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded shrink-0 ml-2 bg-${config.color}-500/20 text-${config.color}-400`}>
          <Icon size={12} className={task.status === 'running' || task.status === 'planning' ? 'animate-spin' : ''} />
          <span>{config.label}</span>
        </div>
      </div>

      {/* 依赖关系提示 */}
      {(task.depends_on.length > 0 || task.blocks.length > 0) && (
        <div className="flex items-center gap-3 text-xs text-white/60 mb-2">
          {task.depends_on.length > 0 && (
            <span>⬅️ {task.depends_on.length} dependencies</span>
          )}
          {task.blocks.length > 0 && (
            <span>➡️ blocks {task.blocks.length} tasks</span>
          )}
        </div>
      )}

      {/* 关联的 Plan 和 Progress */}
      {(task.related_plan_ids.length > 0 || task.related_progress_ids.length > 0) && (
        <div className="flex items-center gap-2 text-xs text-white/60 mb-2">
          {task.related_plan_ids.length > 0 && (
            <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded">
              📋 {task.related_plan_ids.length} plans
            </span>
          )}
          {task.related_progress_ids.length > 0 && (
            <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded">
              📊 {task.related_progress_ids.length} progress
            </span>
          )}
        </div>
      )}

      {/* 进度条 */}
      {task.status === 'running' && (
        <div className="mt-2">
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-blue-500"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>
      )}

      {/* 优先级 */}
      {task.priority > 5 && (
        <div className="mt-2 flex items-center gap-1 text-xs text-orange-400">
          <span>🔥</span>
          <span>High Priority</span>
        </div>
      )}
    </motion.div>
  );
}
