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
  MoreVertical,
  Edit3,
  Trash2,
  Share2,
  Sparkles,
} from 'lucide-react';
import { GlassCard } from '../ui-shared';
import { mockObjectives, Objective, KeyResult } from './mockData';

export default function OKRView() {
  const [expandedObjectives, setExpandedObjectives] = useState<Set<string>>(
    new Set(['obj-1', 'obj-2', 'obj-3'])
  );
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<'title' | 'description' | null>(null);
  const [editValue, setEditValue] = useState('');

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

  const toggleMenu = (objId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenMenuId(openMenuId === objId ? null : objId);
  };

  const handleMenuAction = (action: string, objId: string) => {
    console.log(`${action} for objective:`, objId);
    setOpenMenuId(null);
  };

  const startEditing = (id: string, field: 'title' | 'description', currentValue: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(id);
    setEditingField(field);
    setEditValue(currentValue);
  };

  const saveEdit = () => {
    console.log('Saving edit:', editingId, editingField, editValue);
    setEditingId(null);
    setEditingField(null);
    setEditValue('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingField(null);
    setEditValue('');
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

  const getPriorityConfig = (priority: string) => {
    switch (priority) {
      case 'high':
        return { bg: 'bg-red-500/20', text: 'text-red-400' };
      case 'medium':
        return { bg: 'bg-orange-500/20', text: 'text-orange-400' };
      case 'low':
        return { bg: 'bg-gray-500/20', text: 'text-gray-400' };
      default:
        return { bg: 'bg-gray-500/20', text: 'text-gray-400' };
    }
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
          const isMenuOpen = openMenuId === objective.id;
          const priorityConfig = getPriorityConfig(objective.priority);

          return (
            <motion.div
              key={objective.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: objIndex * 0.1 }}
              className="group/card relative"
            >
              <GlassCard className="overflow-hidden">
                <div className="p-4 sm:p-6">
                  <div className="flex items-start gap-3 sm:gap-4">
                    {/* O Badge */}
                    <div className="relative flex flex-col items-center">
                      <button
                        onClick={() => toggleObjective(objective.id)}
                        className="group/badge relative w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shrink-0 shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 transition-all hover:scale-105"
                      >
                        <span className="text-white font-bold text-base sm:text-lg group-hover/badge:opacity-0 transition-opacity">
                          O{objIndex + 1}
                        </span>
                        <motion.div
                          className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/badge:opacity-100 transition-opacity"
                          animate={{ rotate: isExpanded ? 90 : 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <ChevronRight size={20} className="text-white" />
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
                            className="absolute top-[60px] sm:top-[70px] left-1/2 w-0.5 bg-gradient-to-b from-purple-500/50 to-transparent"
                            style={{ transform: 'translateX(-50%)', minHeight: '40px' }}
                          />
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col lg:flex-row items-start justify-between gap-3 lg:gap-4 mb-3">
                        <div className="flex-1 min-w-0">
                          {/* Editable Title */}
                          {editingId === objective.id && editingField === 'title' ? (
                            <input
                              type="text"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={saveEdit}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveEdit();
                                if (e.key === 'Escape') cancelEdit();
                              }}
                              autoFocus
                              className="w-full text-base sm:text-lg font-bold bg-white/10 border border-purple-500/50 rounded-lg px-3 py-1 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                            />
                          ) : (
                            <h3
                              className="text-base sm:text-lg font-bold cursor-text hover:bg-white/5 rounded px-1 -mx-1 transition-colors"
                              onDoubleClick={(e) => startEditing(objective.id, 'title', objective.title, e)}
                            >
                              {objective.title}
                            </h3>
                          )}

                          {/* Editable Description */}
                          {editingId === objective.id && editingField === 'description' ? (
                            <textarea
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={saveEdit}
                              onKeyDown={(e) => {
                                if (e.key === 'Escape') cancelEdit();
                              }}
                              autoFocus
                              rows={2}
                              className="w-full text-xs sm:text-sm text-white/60 bg-white/10 border border-purple-500/50 rounded-lg px-3 py-1 mt-1 focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none"
                            />
                          ) : (
                            <p
                              className="text-xs sm:text-sm text-white/60 mt-1 cursor-text hover:bg-white/5 rounded px-1 -mx-1 transition-colors"
                              onDoubleClick={(e) => startEditing(objective.id, 'description', objective.description, e)}
                            >
                              {objective.description}
                            </p>
                          )}

                          {objective.alignment && (
                            <div className="flex items-center gap-2 mt-2 text-xs sm:text-sm text-purple-400">
                              <Target size={14} />
                              <span>Aligned to: {objective.alignment}</span>
                            </div>
                          )}
                        </div>

                        {/* Progress & Metadata */}
                        <div className="flex items-center gap-3 sm:gap-4 shrink-0 flex-wrap lg:flex-nowrap">
                          <div className="text-center">
                            <p className="text-xs text-white/60 mb-1">Progress</p>
                            <div className="px-2.5 sm:px-3 py-1 rounded-lg bg-purple-500/20 text-purple-400 font-bold text-xs sm:text-sm">
                              {objective.progress}%
                            </div>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-white/60 mb-1">Priority</p>
                            <div className={`px-2.5 sm:px-3 py-1 rounded-lg font-bold text-xs sm:text-sm capitalize ${priorityConfig.bg} ${priorityConfig.text}`}>
                              {objective.priority}
                            </div>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-white/60 mb-1">Deadline</p>
                            <div className="flex items-center gap-1 text-xs sm:text-sm text-white/80">
                              <Calendar size={14} />
                              <span>{formatDate(objective.deadline)}</span>
                            </div>
                          </div>

                          {/* Menu Button */}
                          <div className="relative">
                            <button
                              onClick={(e) => toggleMenu(objective.id, e)}
                              className="p-2 hover:bg-white/10 rounded-lg transition-all"
                            >
                              <MoreVertical size={18} className="text-white/60" />
                            </button>

                            {/* Dropdown Menu */}
                            <AnimatePresence>
                              {isMenuOpen && (
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                  animate={{ opacity: 1, scale: 1, y: 0 }}
                                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                  transition={{ duration: 0.15 }}
                                  className="absolute right-0 top-full mt-2 w-48 bg-gray-900 border border-white/10 rounded-xl shadow-xl overflow-hidden z-50"
                                >
                                  <button
                                    onClick={() => handleMenuAction('AI Generate', objective.id)}
                                    className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/10 transition-all text-left group"
                                  >
                                    <Sparkles size={16} className="text-purple-400 group-hover:scale-110 transition-transform" />
                                    <span className="text-sm font-medium">AI Generate</span>
                                  </button>
                                  <button
                                    onClick={() => handleMenuAction('Edit', objective.id)}
                                    className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/10 transition-all text-left group"
                                  >
                                    <Edit3 size={16} className="text-blue-400 group-hover:scale-110 transition-transform" />
                                    <span className="text-sm font-medium">Edit</span>
                                  </button>
                                  <button
                                    onClick={() => handleMenuAction('Publish', objective.id)}
                                    className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/10 transition-all text-left group"
                                  >
                                    <Share2 size={16} className="text-green-400 group-hover:scale-110 transition-transform" />
                                    <span className="text-sm font-medium">Publish</span>
                                  </button>
                                  <div className="border-t border-white/10" />
                                  <button
                                    onClick={() => handleMenuAction('Delete', objective.id)}
                                    className="w-full px-4 py-3 flex items-center gap-3 hover:bg-red-500/20 transition-all text-left group"
                                  >
                                    <Trash2 size={16} className="text-red-400 group-hover:scale-110 transition-transform" />
                                    <span className="text-sm font-medium text-red-400">Delete</span>
                                  </button>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-3">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${objective.progress}%` }}
                          transition={{ duration: 0.5, delay: objIndex * 0.1 }}
                          className={`h-full bg-gradient-to-r ${getProgressColor(objective.progress)}`}
                        />
                      </div>

                      <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm text-white/60 flex-wrap">
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
                      className="overflow-hidden border-t border-white/10"
                    >
                      <div className="px-4 sm:px-6 pb-4 sm:pb-6 pt-4">
                        <div className="space-y-0">
                          {objective.keyResults.map((kr, krIndex) => {
                            const progress = calculateKRProgress(kr);
                            const krStatusConfig = getStatusConfig(kr.status);
                            const KRStatusIcon = krStatusConfig.icon;

                            return (
                              <div
                                key={kr.id}
                                className="grid grid-cols-[40px_1fr] sm:grid-cols-[56px_1fr] gap-0 group/kr"
                              >
                                {/* Tree Line Column */}
                                <div className="relative flex items-center">
                                  {/* Vertical line segment - Top half */}
                                  <div
                                    className="absolute left-5 sm:left-6 top-0 bottom-1/2 w-0.5 bg-gradient-to-b from-purple-500/30 to-purple-500/50"
                                    style={{ transform: 'translateX(-50%)' }}
                                  />

                                  {/* Vertical line segment - Bottom half */}
                                  {krIndex < objective.keyResults.length - 1 && (
                                    <div
                                      className="absolute left-5 sm:left-6 top-1/2 bottom-0 w-0.5 bg-gradient-to-b from-purple-500/50 to-purple-500/30"
                                      style={{ transform: 'translateX(-50%)' }}
                                    />
                                  )}

                                  {/* Horizontal line to KR card */}
                                  <div
                                    className="absolute left-5 sm:left-6 top-1/2 h-0.5 bg-gradient-to-r from-purple-500/50 to-transparent"
                                    style={{ width: '24px', transform: 'translateY(-50%)' }}
                                  />

                                  {/* Connection dot */}
                                  <div
                                    className="absolute left-5 sm:left-6 top-1/2 w-2 h-2 rounded-full bg-purple-500/70 border-2 border-purple-400/50"
                                    style={{ transform: 'translate(-50%, -50%)' }}
                                  />
                                </div>

                                {/* KR Card Column */}
                                <div className="py-2">
                                  <GlassCard className="p-3 hover:border-purple-500/50 transition-all duration-300">
                                    {/* KR Header */}
                                    <div className="flex items-start gap-2 mb-2">
                                      <Target size={14} className="text-purple-400 shrink-0 mt-0.5" />
                                      <div className="flex-1 min-w-0">
                                        <h4 className="font-semibold text-sm sm:text-base mb-1">{kr.title}</h4>
                                        <p className="text-xs sm:text-sm text-white/60">{kr.description}</p>
                                      </div>
                                      <div className={`flex items-center gap-2 px-2 sm:px-2.5 py-1 rounded-lg ${krStatusConfig.bg} shrink-0`}>
                                        <KRStatusIcon size={14} className={krStatusConfig.text} />
                                        <span className={`text-xs font-medium ${krStatusConfig.text} capitalize`}>
                                          {kr.status.replace('-', ' ')}
                                        </span>
                                      </div>
                                    </div>

                                    {/* Progress Bar */}
                                    <div className="mb-3">
                                      <div className="flex items-center justify-between text-xs sm:text-sm mb-2">
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
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm text-white/60 mb-3">
                                      <div className="flex items-center gap-1.5">
                                        <Users size={14} />
                                        <span>{kr.assignedName}</span>
                                      </div>
                                      {kr.startDate && kr.endDate && (
                                        <div className="flex items-center gap-1.5">
                                          <Calendar size={14} />
                                          <span className="truncate">
                                            {formatDate(kr.startDate)} - {formatDate(kr.endDate)}
                                          </span>
                                        </div>
                                      )}
                                    </div>

                                    {/* Actions */}
                                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                                      <button
                                        onClick={(e) => handleGeneratePlan(kr.id, e)}
                                        className="px-3 py-1.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-lg text-xs sm:text-sm font-medium transition-colors"
                                      >
                                        Generate Plan
                                      </button>
                                      <button
                                        onClick={(e) => handleViewProgress(kr.id, e)}
                                        className="px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg text-xs sm:text-sm font-medium transition-colors"
                                      >
                                        View Progress
                                      </button>
                                    </div>
                                  </GlassCard>
                                </div>
                              </div>
                            );
                          })}
                        </div>
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

