import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  Plus,
  Calendar,
  User,
  Clock,
  CheckCircle2,
  Circle,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { GlassCard } from '../ui-shared';
import { mockPlanTasks, mockObjectives, PlanTask } from './mockData';

type TaskStatus = 'todo' | 'in-progress' | 'review' | 'done';

const statusConfig = {
  todo: { label: '待办', color: 'gray', icon: Circle, bgClass: 'bg-gray-500/10', borderClass: 'border-gray-500/30', textClass: 'text-gray-400' },
  'in-progress': { label: '进行中', color: 'blue', icon: Clock, bgClass: 'bg-blue-500/10', borderClass: 'border-blue-500/30', textClass: 'text-blue-400' },
  review: { label: '待审核', color: 'orange', icon: AlertCircle, bgClass: 'bg-orange-500/10', borderClass: 'border-orange-500/30', textClass: 'text-orange-400' },
  done: { label: '已完成', color: 'green', icon: CheckCircle2, bgClass: 'bg-green-500/10', borderClass: 'border-green-500/30', textClass: 'text-green-400' },
};

const priorityConfig = {
  low: { label: '低', bgClass: 'bg-gray-500/20', textClass: 'text-gray-400' },
  medium: { label: '中', bgClass: 'bg-yellow-500/20', textClass: 'text-yellow-400' },
  high: { label: '高', bgClass: 'bg-red-500/20', textClass: 'text-red-400' },
};

export default function PlanView() {
  const [tasks] = useState<PlanTask[]>(mockPlanTasks);

  // Get all KRs from objectives
  const allKRs = useMemo(() => {
    return mockObjectives.flatMap(obj =>
      obj.keyResults.map(kr => ({
        id: kr.id,
        title: kr.title,
        description: kr.description,
        objectiveId: obj.id,
      }))
    );
  }, []);

  // Group tasks by KR
  const tasksByKR = useMemo(() => {
    const grouped: Record<string, { title: string; tasks: PlanTask[] }> = {};
    tasks.forEach(task => {
      if (!grouped[task.krId]) {
        grouped[task.krId] = {
          title: task.krTitle,
          tasks: [],
        };
      }
      grouped[task.krId].tasks.push(task);
    });
    return grouped;
  }, [tasks]);

  const krIds = Object.keys(tasksByKR);

  const getTasksByStatus = (krId: string, status: TaskStatus) => {
    return tasksByKR[krId]?.tasks.filter(task => task.status === status) || [];
  };

  const handleAIGenerate = () => {
    console.log('AI Generate tasks from OKR plans');
  };

  const handleTaskClick = (task: PlanTask) => {
    console.log('Task clicked:', task);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold">Plan Kanban</h2>
          <p className="text-white/60 text-xs sm:text-sm mt-1">
            Organize tasks by OKR and status
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <button
            onClick={handleAIGenerate}
            className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 rounded-xl font-medium sm:font-bold transition-all text-sm flex-1 sm:flex-initial"
          >
            <Sparkles size={16} />
            <span className="hidden sm:inline">AI Generate Tasks</span>
            <span className="sm:hidden">AI Generate</span>
          </button>
          <button className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-green-600 hover:bg-green-500 rounded-xl font-medium sm:font-bold transition-all text-sm">
            <Plus size={16} />
            <span className="hidden sm:inline">New Task</span>
            <span className="sm:hidden">New</span>
          </button>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
        <div className="min-w-[1000px]">
          {/* Column Headers (Status) */}
          <div className="grid grid-cols-[180px_repeat(4,1fr)] gap-3 sm:gap-4 mb-4">
            <div className="font-bold text-xs sm:text-sm text-white/60 uppercase tracking-wider">
              Key Results
            </div>
            {(['todo', 'in-progress', 'review', 'done'] as TaskStatus[]).map(status => {
              const config = statusConfig[status];
              const Icon = config.icon;
              const totalTasks = tasks.filter(t => t.status === status).length;

              return (
                <div
                  key={status}
                  className={`flex items-center justify-between p-2 sm:p-3 rounded-xl ${config.bgClass} border-2 ${config.borderClass}`}
                >
                  <div className="flex items-center gap-2">
                    <Icon size={16} className={config.textClass} />
                    <span className="font-bold text-sm">{config.label}</span>
                  </div>
                  <span className="text-xs font-bold text-white/60">{totalTasks}</span>
                </div>
              );
            })}
          </div>

          {/* Task Rows (按 KR 横向分组) */}
          <div className="space-y-4">
            {krIds.length === 0 ? (
              <GlassCard className="p-12 text-center">
                <p className="text-white/60">No tasks yet. Create your first task!</p>
              </GlassCard>
            ) : (
              krIds.map((krId) => (
                <div key={krId} className="grid grid-cols-[180px_repeat(4,1fr)] gap-3 sm:gap-4">
                  {/* KR Title */}
                  <div className="flex items-start">
                    <GlassCard className="p-3 sm:p-4 h-full w-full">
                      <h3 className="font-bold text-xs sm:text-sm mb-1">{tasksByKR[krId].title}</h3>
                      <p className="text-xs text-white/60">
                        {tasksByKR[krId].tasks.length} tasks
                      </p>
                    </GlassCard>
                  </div>

                  {/* Task Cards by Status */}
                  {(['todo', 'in-progress', 'review', 'done'] as TaskStatus[]).map(status => (
                    <div key={status} className="space-y-2 sm:space-y-3">
                      {getTasksByStatus(krId, status).map(task => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          onClick={handleTaskClick}
                          formatDate={formatDate}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

interface TaskCardProps {
  task: PlanTask;
  onClick: (task: PlanTask) => void;
  formatDate: (date: string) => string;
}

function TaskCard({ task, onClick, formatDate }: TaskCardProps) {
  const priorityStyle = priorityConfig[task.priority];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
    >
      <GlassCard
        className="p-3 group hover:shadow-lg hover:shadow-purple-500/20 transition-all cursor-pointer"
        onClick={() => onClick(task)}
      >
        <div className="space-y-2">
          {/* Title */}
          <h4 className="font-semibold text-sm line-clamp-2">{task.title}</h4>

          {/* Description */}
          {task.description && (
            <p className="text-xs text-white/60 line-clamp-2">{task.description}</p>
          )}

          {/* Meta Info */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Priority */}
            <div className={`px-2 py-0.5 rounded text-xs font-medium ${priorityStyle.bgClass} ${priorityStyle.textClass}`}>
              {priorityStyle.label}
            </div>

            {/* Due Date */}
            {task.dueDate && (
              <div className="flex items-center gap-1 text-xs text-white/60">
                <Calendar size={12} />
                <span>{formatDate(task.dueDate)}</span>
              </div>
            )}
          </div>

          {/* Assigned Agent */}
          {task.assignedAgent && (
            <div className="flex items-center gap-1.5 text-xs text-white/60">
              <User size={12} />
              <span>{task.assignedAgent}</span>
            </div>
          )}
        </div>
      </GlassCard>
    </motion.div>
  );
}
