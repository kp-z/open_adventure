import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  Users,
  User,
  Calendar,
  TrendingUp,
  Clock,
  CheckCircle2,
  Target,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { GlassCard } from '../ui-shared';

type TaskStatus = 'todo' | 'in-progress' | 'review' | 'done' | 'terminated';

interface ProgressPlan {
  id: string;
  name: string;
  assignedAgent: string;
  agentType: 'agent' | 'team';
  status: TaskStatus;
  krTitle: string;
  startDate: Date;
  endDate: Date;
  progress: number;
}

// Mock data - Plans with agent assignments
const mockProgressPlans: ProgressPlan[] = [
  {
    id: 'p1',
    name: '设计用户界面原型',
    assignedAgent: 'Performance Agent',
    agentType: 'agent',
    status: 'done',
    krTitle: 'API 响应时间优化',
    startDate: new Date('2026-02-01'),
    endDate: new Date('2026-02-15'),
    progress: 100,
  },
  {
    id: 'p2',
    name: '实现缓存策略',
    assignedAgent: 'Performance Agent',
    agentType: 'agent',
    status: 'in-progress',
    krTitle: 'API 响应时间优化',
    startDate: new Date('2026-02-15'),
    endDate: new Date('2026-03-01'),
    progress: 65,
  },
  {
    id: 'p3',
    name: '数据库性能优化',
    assignedAgent: 'Backend Team',
    agentType: 'team',
    status: 'review',
    krTitle: '数据库查询优化',
    startDate: new Date('2026-02-10'),
    endDate: new Date('2026-02-28'),
    progress: 90,
  },
  {
    id: 'p4',
    name: 'CI/CD流水线配置',
    assignedAgent: 'Backend Team',
    agentType: 'team',
    status: 'in-progress',
    krTitle: '数据库查询优化',
    startDate: new Date('2026-02-20'),
    endDate: new Date('2026-03-05'),
    progress: 55,
  },
  {
    id: 'p5',
    name: '代码分割实现',
    assignedAgent: 'Frontend Agent',
    agentType: 'agent',
    status: 'in-progress',
    krTitle: '前端加载速度优化',
    startDate: new Date('2026-02-20'),
    endDate: new Date('2026-03-05'),
    progress: 40,
  },
  {
    id: 'p6',
    name: '资源压缩',
    assignedAgent: 'Frontend Agent',
    agentType: 'agent',
    status: 'todo',
    krTitle: '前端加载速度优化',
    startDate: new Date('2026-03-01'),
    endDate: new Date('2026-03-15'),
    progress: 0,
  },
];

const statusConfig = {
  todo: {
    label: 'Todo',
    gradient: 'from-gray-400 to-gray-500',
    shadow: 'shadow-gray-500/30',
  },
  'in-progress': {
    label: 'In Progress',
    gradient: 'from-blue-400 to-blue-600',
    shadow: 'shadow-blue-500/30',
  },
  review: {
    label: 'Review',
    gradient: 'from-orange-400 to-orange-600',
    shadow: 'shadow-orange-500/30',
  },
  done: {
    label: 'Done',
    gradient: 'from-green-400 to-green-600',
    shadow: 'shadow-green-500/30',
  },
  terminated: {
    label: 'Terminated',
    gradient: 'from-red-400 to-red-600',
    shadow: 'shadow-red-500/30',
  },
};

export default function ProgressView() {
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  const [currentDate] = useState(new Date('2026-02-15'));

  const overallStats = useMemo(() => {
    const total = mockProgressPlans.length;
    const completed = mockProgressPlans.filter(p => p.status === 'done').length;
    const inProgress = mockProgressPlans.filter(p => p.status === 'in-progress').length;
    const avgProgress = Math.round(
      mockProgressPlans.reduce((sum, p) => sum + p.progress, 0) / total
    );

    return { total, completed, inProgress, avgProgress };
  }, []);

  // Calculate timeline boundaries
  const allDates = mockProgressPlans.flatMap(p => [p.startDate, p.endDate]);
  const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
  const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));

  // Generate time columns based on view mode
  const timeColumns = useMemo(() => {
    const columns = [];
    const start = new Date(minDate);
    const end = new Date(maxDate);

    if (viewMode === 'month') {
      let current = new Date(start.getFullYear(), start.getMonth(), 1);
      while (current <= end) {
        columns.push({
          date: new Date(current),
          label: current.toLocaleDateString('en-US', { month: 'short' }),
          fullLabel: current.toLocaleDateString('en-US', { year: 'numeric', month: 'long' }),
        });
        current.setMonth(current.getMonth() + 1);
      }
    } else {
      let current = new Date(start);
      current.setDate(current.getDate() - current.getDay());
      while (current <= end) {
        const weekEnd = new Date(current);
        weekEnd.setDate(weekEnd.getDate() + 6);
        columns.push({
          date: new Date(current),
          label: `${current.getDate()}`,
          fullLabel: `${current.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
        });
        current.setDate(current.getDate() + 7);
      }
    }

    return columns;
  }, [minDate, maxDate, viewMode]);

  // Calculate task bar position
  const getBarPosition = (plan: ProgressPlan) => {
    const totalDays = (maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24);
    const startOffset = (plan.startDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24);
    const duration = (plan.endDate.getTime() - plan.startDate.getTime()) / (1000 * 60 * 60 * 24);

    return {
      left: `${(startOffset / totalDays) * 100}%`,
      width: `${(duration / totalDays) * 100}%`,
    };
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
          <h2 className="text-xl sm:text-2xl font-bold">Progress Tracking</h2>
          <p className="text-white/60 text-xs sm:text-sm mt-1">
            Monitor plan execution timeline
          </p>
        </div>
      </div>

      {/* Overall Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <GlassCard className="p-3 sm:p-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-purple-500/20 flex items-center justify-center shrink-0">
              <Target size={20} className="text-purple-400" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-white/60">Total Plans</p>
              <p className="text-xl sm:text-2xl font-bold">{overallStats.total}</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-3 sm:p-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-green-500/20 flex items-center justify-center shrink-0">
              <CheckCircle2 size={20} className="text-green-400" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-white/60">Completed</p>
              <p className="text-xl sm:text-2xl font-bold">{overallStats.completed}</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-3 sm:p-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-blue-500/20 flex items-center justify-center shrink-0">
              <Clock size={20} className="text-blue-400" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-white/60">In Progress</p>
              <p className="text-xl sm:text-2xl font-bold">{overallStats.inProgress}</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-3 sm:p-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center shrink-0">
              <TrendingUp size={20} className="text-yellow-400" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-white/60">Avg Progress</p>
              <p className="text-xl sm:text-2xl font-bold">{overallStats.avgProgress}%</p>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Gantt Chart */}
      <GlassCard className="p-4 sm:p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 sm:mb-8">
          <h3 className="text-base sm:text-lg font-bold">Timeline View</h3>
          <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all flex-1 sm:flex-initial ${
                viewMode === 'month'
                  ? 'bg-purple-500/30 text-purple-400'
                  : 'bg-white/5 text-white/60 hover:bg-white/10'
              }`}
            >
              Month
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all flex-1 sm:flex-initial ${
                viewMode === 'week'
                  ? 'bg-purple-500/30 text-purple-400'
                  : 'bg-white/5 text-white/60 hover:bg-white/10'
              }`}
            >
              Week
            </button>
          </div>
        </div>

        {/* Timeline */}
        <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
          <div className="min-w-[800px]">
            {/* Time Header */}
            <div className="grid gap-0 mb-4" style={{ gridTemplateColumns: '200px 1fr' }}>
              <div className="font-bold text-xs sm:text-sm text-white/60 uppercase tracking-wider">
                Plans
              </div>
              <div className="grid" style={{ gridTemplateColumns: `repeat(${timeColumns.length}, 1fr)` }}>
                {timeColumns.map((col, idx) => (
                  <div
                    key={idx}
                    className="text-center text-xs sm:text-sm font-medium text-white/60 border-l border-white/10 px-2 py-2"
                  >
                    {col.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Plan Rows */}
            <div className="space-y-2">
              {mockProgressPlans.map((plan) => {
                const barPos = getBarPosition(plan);
                const config = statusConfig[plan.status];

                return (
                  <div
                    key={plan.id}
                    className="grid gap-0 items-center"
                    style={{ gridTemplateColumns: '200px 1fr' }}
                  >
                    {/* Plan Info */}
                    <div className="pr-4">
                      <div className="text-xs sm:text-sm font-medium mb-1 truncate">{plan.name}</div>
                      <div className="flex items-center gap-1.5 text-xs text-white/60">
                        {plan.agentType === 'agent' ? (
                          <User size={12} />
                        ) : (
                          <Users size={12} />
                        )}
                        <span className="truncate">{plan.assignedAgent}</span>
                      </div>
                    </div>

                    {/* Timeline Bar */}
                    <div className="relative h-12 border-l border-white/10">
                      {timeColumns.map((_, idx) => (
                        <div
                          key={idx}
                          className="absolute top-0 bottom-0 border-l border-white/5"
                          style={{ left: `${(idx / timeColumns.length) * 100}%` }}
                        />
                      ))}
                      <div
                        className="absolute top-2 bottom-2 rounded-lg overflow-hidden"
                        style={barPos}
                      >
                        <div className={`h-full bg-gradient-to-r ${config.gradient} ${config.shadow} relative`}>
                          <div
                            className="absolute inset-0 bg-white/20"
                            style={{ width: `${plan.progress}%` }}
                          />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-xs font-bold text-white drop-shadow-lg">
                              {plan.progress}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
}
