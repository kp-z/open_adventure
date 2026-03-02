import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Target,
  ChevronRight,
  Calendar,
  Users,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  BarChart3,
} from 'lucide-react';
import { GlassCard } from '../ui-shared';
import { mockObjectives, Objective, KeyResult } from './mockData';

export default function OKRView() {
  const [expandedObjectives, setExpandedObjectives] = useState<Set<string>>(
    new Set(['obj-1', 'obj-2', 'obj-3'])
  );

  const toggleObjective = (objId: string) => {
    setExpandedObjectives(prev => {
      const next = new Set(prev);
      if (next.has(objId)) {
        next.delete(objId);
      } else {
        next.add(objId);
      }
      return next;
    });
  };

  const handleGeneratePlan = (krId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const event = new CustomEvent('navigate-to-plan', { detail: { krId } });
    window.dispatchEvent(event);
  };

  const handleViewProgress = (krId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const event = new CustomEvent('navigate-to-progress', { detail: { krId } });
    window.dispatchEvent(event);
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'completed':
        return { bg: 'bg-green-500/20', text: 'text-green-400', icon: CheckCircle2 };
      case 'at-risk':
        return { bg: 'bg-red-500/20', text: 'text-red-400', icon: AlertCircle };
      case 'in-progress':
        return { bg: 'bg-blue-500/20', text: 'text-blue-400', icon: TrendingUp };
      case 'not-started':
        return { bg: 'bg-gray-500/20', text: 'text-gray-400', icon: Clock };
      default:
        return { bg: 'bg-gray-500/20', text: 'text-gray-400', icon: Clock };
    }
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 90) return 'from-green-500 to-green-600';
    if (progress >= 70) return 'from-blue-500 to-blue-600';
    if (progress >= 40) return 'from-orange-500 to-orange-600';
    return 'from-red-500 to-red-600';
  };

  const formatDate = (date: Date | string | undefined) => {
    if (!date) return 'Not set';
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return 'Invalid date';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const calculateKRProgress = (kr: KeyResult) => {
    if (!kr.target || kr.target === 0) return 0;
    return Math.round((kr.current / kr.target) * 100);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <div className="space-y-4">
        {mockObjectives.map((objective, objIndex) => {
          const isExpanded = expandedObjectives.has(objective.id);
          const statusConfig = getStatusConfig(objective.status);
          const StatusIcon = statusConfig.icon;

          return (
            <motion.div
              key={objective.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: objIndex * 0.1 }}
              className="group/card relative"
            >
              <GlassCard className="overflow-hidden">
                <div className="p-6">
                  <div className="flex items-start gap-4">
                    {/* O Badge */}
                    <div className="relative flex flex-col items-center">
                      <button
                        onClick={() => toggleObjective(objective.id)}
                        className="group/badge relative w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shrink-0 shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 transition-all hover:scale-105"
                      >
                        <span className="text-white font-bold text-lg group-hover/badge:opacity-0 transition-opacity">
                          O{objIndex + 1}
                        </span>
                        <motion.div
                          className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/badge:opacity-100 transition-opacity"
                          animate={{ rotate: isExpanded ? 90 : 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <ChevronRight size={24} className="text-white" />
                        </motion.div>
                      </button>

                      {/* Vertical Line */}
                      <AnimatePresence>
                        {isExpanded && objective.keyResults.length > 0 && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'calc(100% - 28px)', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="absolute top-[70px] left-1/2 w-0.5 bg-gradient-to-b from-purple-500/50 to-transparent"
                            style={{ transform: 'translateX(-50%)', minHeight: '40px' }}
                          />
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex-1">
                          <h3 className="text-lg font-bold">{objective.title}</h3>
                          <p className="text-sm text-white/60 mt-1">{objective.description}</p>
                        </div>
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${statusConfig.bg}`}>
                          <StatusIcon size={16} className={statusConfig.text} />
                          <span className={`text-sm font-medium ${statusConfig.text} capitalize`}>
                            {objective.status.replace('-', ' ')}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-white/60">
                        <div className="flex items-center gap-1.5">
                          <Target size={14} />
                          <span>{objective.quarter}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <BarChart3 size={14} />
                          <span>{objective.keyResults.length} Key Results</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Key Results */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="px-6 pb-6 space-y-3">
                        {objective.keyResults.map((kr, krIndex) => {
                          const progress = calculateKRProgress(kr);
                          const krStatusConfig = getStatusConfig(kr.status);
                          const KRStatusIcon = krStatusConfig.icon;

                          return (
                            <motion.div
                              key={kr.id}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: krIndex * 0.05 }}
                              className="relative"
                            >
                              <div className="flex items-start gap-4">
                                {/* KR Badge */}
                                <div className="relative flex flex-col items-center">
                                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shrink-0 shadow-md shadow-blue-500/30">
                                    <span className="text-white font-bold text-sm">
                                      KR{krIndex + 1}
                                    </span>
                                  </div>
                                </div>

                                {/* KR Content */}
                                <div className="flex-1 min-w-0 bg-white/5 rounded-lg p-4 hover:bg-white/10 transition-colors cursor-pointer">
                                  <div className="flex items-start justify-between gap-4 mb-3">
                                    <div className="flex-1">
                                      <h4 className="font-semibold text-base mb-1">{kr.title}</h4>
                                      <p className="text-sm text-white/60">{kr.description}</p>
                                    </div>
                                    <div className={`flex items-center gap-2 px-2.5 py-1 rounded-lg ${krStatusConfig.bg} shrink-0`}>
                                      <KRStatusIcon size={14} className={krStatusConfig.text} />
                                      <span className={`text-xs font-medium ${krStatusConfig.text} capitalize`}>
                                        {kr.status.replace('-', ' ')}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Progress Bar */}
                                  <div className="mb-3">
                                    <div className="flex items-center justify-between text-sm mb-2">
                                      <span className="text-white/60">Progress</span>
                                      <span className="font-semibold">
                                        {kr.current} / {kr.target} {kr.unit}
                                      </span>
                                    </div>
                                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                      <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${progress}%` }}
                                        transition={{ duration: 0.5, delay: krIndex * 0.1 }}
                                        className={`h-full bg-gradient-to-r ${getProgressColor(progress)}`}
                                      />
                                    </div>
                                  </div>

                                  {/* Meta Info */}
                                  <div className="flex items-center gap-4 text-sm text-white/60 mb-3">
                                    <div className="flex items-center gap-1.5">
                                      <Users size={14} />
                                      <span>{kr.assignedName}</span>
                                    </div>
                                    {kr.startDate && kr.endDate && (
                                      <div className="flex items-center gap-1.5">
                                        <Calendar size={14} />
                                        <span>
                                          {formatDate(kr.startDate)} - {formatDate(kr.endDate)}
                                        </span>
                                      </div>
                                    )}
                                  </div>

                                  {/* Actions */}
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={(e) => handleGeneratePlan(kr.id, e)}
                                      className="px-3 py-1.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-lg text-sm font-medium transition-colors"
                                    >
                                      Generate Plan
                                    </button>
                                    <button
                                      onClick={(e) => handleViewProgress(kr.id, e)}
                                      className="px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg text-sm font-medium transition-colors"
                                    >
                                      View Progress
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </GlassCard>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

