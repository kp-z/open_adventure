import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  Calendar,
  User,
  Clock,
  CheckCircle2,
  Circle,
  AlertCircle,
} from 'lucide-react';
import { GlassCard } from '../ui-shared';
import { mockPlans, mockObjectives, Task as MockTask } from './mockData';

type TaskStatus = 'pending' | 'in-progress' | 'completed' | 'blocked';

const statusConfig = {
  pending: { label: '待办', color: 'gray', icon: Circle },
  'in-progress': { label: '进行中', color: 'blue', icon: Clock },
  blocked: { label: '阻塞', color: 'orange', icon: AlertCircle },
  completed: { label: '已完成', color: 'green', icon: CheckCircle2 },
};

export default function PlanView() {
  const [selectedKR, setSelectedKR] = useState<string | null>(null);

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

  // Group plans by KR
  const plansByKR = useMemo(() => {
    const grouped: Record<string, typeof mockPlans> = {};
    mockPlans.forEach(plan => {
      if (!grouped[plan.krId]) {
        grouped[plan.krId] = [];
      }
      grouped[plan.krId].push(plan);
    });
    return grouped;
  }, []);

  const getTasksByStatus = (tasks: MockTask[], status: TaskStatus) => {
    return tasks.filter(task => task.status === status);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getStatusColorClass = (color: string) => {
    const colorMap: Record<string, string> = {
      gray: 'bg-gray-500/20 text-gray-400',
      blue: 'bg-blue-500/20 text-blue-400',
      orange: 'bg-orange-500/20 text-orange-400',
      green: 'bg-green-500/20 text-green-400',
    };
    return colorMap[color] || colorMap.gray;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* KR Filter */}
      <GlassCard className="p-4">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setSelectedKR(null)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedKR === null
                ? 'bg-purple-500/30 text-purple-400'
                : 'bg-white/5 text-white/60 hover:bg-white/10'
            }`}
          >
            All KRs
          </button>
          {allKRs.map(kr => (
            <button
              key={kr.id}
              onClick={() => setSelectedKR(kr.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedKR === kr.id
                  ? 'bg-purple-500/30 text-purple-400'
                  : 'bg-white/5 text-white/60 hover:bg-white/10'
              }`}
            >
              {kr.title}
            </button>
          ))}
        </div>
      </GlassCard>

      {/* Plans List */}
      <div className="space-y-4">
        {mockPlans
          .filter(plan => !selectedKR || plan.krId === selectedKR)
          .map((plan, index) => {
            const kr = allKRs.find(k => k.id === plan.krId);
            const statuses: TaskStatus[] = ['pending', 'in-progress', 'blocked', 'completed'];

            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <GlassCard className="overflow-hidden">
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-bold mb-1">{plan.title}</h3>
                        {kr && (
                          <p className="text-sm text-white/60">
                            {kr.title} - {kr.description}
                          </p>
                        )}
                      </div>
                      <div className="text-sm text-white/60">
                        Updated: {formatDate(plan.updatedAt)}
                      </div>
                    </div>

                    {/* Kanban Board */}
                    <div className="grid grid-cols-4 gap-4">
                      {statuses.map(status => {
                        const config = statusConfig[status];
                        const StatusIcon = config.icon;
                        const tasks = getTasksByStatus(plan.tasks, status);

                        return (
                          <div key={status} className="space-y-3">
                            {/* Column Header */}
                            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${getStatusColorClass(config.color)}`}>
                              <StatusIcon size={16} />
                              <span className="text-sm font-medium">{config.label}</span>
                              <span className="ml-auto text-xs">{tasks.length}</span>
                            </div>

                            {/* Tasks */}
                            <div className="space-y-2">
                              {tasks.map(task => (
                                <motion.div
                                  key={task.id}
                                  layout
                                  className="bg-white/5 hover:bg-white/10 rounded-lg p-3 cursor-pointer transition-colors"
                                >
                                  <h4 className="text-sm font-medium mb-2">{task.title}</h4>
                                  <div className="space-y-1.5">
                                    {task.assignedTo && (
                                      <div className="flex items-center gap-1.5 text-xs text-white/60">
                                        <User size={12} />
                                        <span>{task.assignedTo}</span>
                                      </div>
                                    )}
                                    {task.dueDate && (
                                      <div className="flex items-center gap-1.5 text-xs text-white/60">
                                        <Calendar size={12} />
                                        <span>{formatDate(task.dueDate)}</span>
                                      </div>
                                    )}
                                    {/* Progress Bar */}
                                    <div className="mt-2">
                                      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                                        <div
                                          className="h-full bg-gradient-to-r from-blue-500 to-blue-600"
                                          style={{ width: `${task.progress}%` }}
                                        />
                                      </div>
                                      <div className="text-xs text-white/60 mt-1">
                                        {task.progress}%
                                      </div>
                                    </div>
                                  </div>
                                </motion.div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            );
          })}
      </div>

      {mockPlans.filter(plan => !selectedKR || plan.krId === selectedKR).length === 0 && (
        <GlassCard className="p-12 text-center">
          <p className="text-white/60">No plans found for the selected KR</p>
        </GlassCard>
      )}
    </motion.div>
  );
}
