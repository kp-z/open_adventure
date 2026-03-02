import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  TrendingUp,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  Activity,
} from 'lucide-react';
import { GlassCard } from '../ui-shared';
import { mockProgress, mockObjectives, Execution } from './mockData';

export default function ProgressView() {
  const [selectedKR, setSelectedKR] = useState<string | null>(null);

  // Get all KRs from objectives
  const allKRs = useMemo(() => {
    return mockObjectives.flatMap(obj =>
      obj.keyResults.map(kr => ({
        id: kr.id,
        title: kr.title,
        description: kr.description,
        target: kr.target,
        current: kr.current,
        unit: kr.unit,
        objectiveId: obj.id,
      }))
    );
  }, []);

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 size={16} className="text-green-400" />;
      case 'failed':
        return <XCircle size={16} className="text-red-400" />;
      case 'running':
        return <Clock size={16} className="text-blue-400" />;
      default:
        return <Activity size={16} className="text-gray-400" />;
    }
  };

  const getStatusColorClass = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-500/20 text-green-400';
      case 'failed':
        return 'bg-red-500/20 text-red-400';
      case 'running':
        return 'bg-blue-500/20 text-blue-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
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

      {/* Progress List */}
      <div className="space-y-4">
        {mockProgress
          .filter(progress => !selectedKR || progress.krId === selectedKR)
          .map((progress, index) => {
            const kr = allKRs.find(k => k.id === progress.krId);
            if (!kr) return null;

            // Sort executions by timestamp (newest first)
            const sortedExecutions = [...progress.executions].sort(
              (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
            );

            // Calculate trend
            const latestMetric = sortedExecutions[0]?.metrics;
            const previousMetric = sortedExecutions[1]?.metrics;
            const metricKey = Object.keys(latestMetric || {})[0];
            const trend =
              latestMetric && previousMetric && metricKey
                ? ((latestMetric[metricKey]! - previousMetric[metricKey]!) / previousMetric[metricKey]!) * 100
                : 0;

            return (
              <motion.div
                key={progress.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <GlassCard className="overflow-hidden">
                  <div className="p-6">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-6">
                      <div>
                        <h3 className="text-lg font-bold mb-1">{kr.title}</h3>
                        <p className="text-sm text-white/60">{kr.description}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <div className="text-2xl font-bold">
                            {kr.current} / {kr.target}
                          </div>
                          <div className="text-sm text-white/60">{kr.unit}</div>
                        </div>
                        {trend !== 0 && (
                          <div
                            className={`flex items-center gap-1 px-2 py-1 rounded-lg ${
                              trend > 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                            }`}
                          >
                            <TrendingUp size={14} className={trend < 0 ? 'rotate-180' : ''} />
                            <span className="text-xs font-medium">{Math.abs(trend).toFixed(1)}%</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Executions Timeline */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold text-white/80 mb-3">Execution History</h4>
                      {sortedExecutions.map((execution, execIndex) => {
                        const metricKeys = Object.keys(execution.metrics);
                        const metricKey = metricKeys[0];
                        const metricValue = execution.metrics[metricKey];

                        return (
                          <motion.div
                            key={execution.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: execIndex * 0.05 }}
                            className="flex items-start gap-4 bg-white/5 rounded-lg p-4 hover:bg-white/10 transition-colors"
                          >
                            {/* Status Icon */}
                            <div className="shrink-0 mt-1">{getStatusIcon(execution.status)}</div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-4 mb-2">
                                <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <span
                                      className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusColorClass(
                                        execution.status
                                      )}`}
                                    >
                                      {execution.status}
                                    </span>
                                    <div className="flex items-center gap-1 text-xs text-white/60">
                                      <Calendar size={12} />
                                      <span>{formatDate(execution.timestamp)}</span>
                                    </div>
                                  </div>
                                  {execution.logs && (
                                    <p className="text-sm text-white/60">{execution.logs}</p>
                                  )}
                                </div>
                                {metricValue !== undefined && (
                                  <div className="text-right shrink-0">
                                    <div className="text-lg font-bold">{metricValue}</div>
                                    <div className="text-xs text-white/60">{kr.unit}</div>
                                  </div>
                                )}
                              </div>

                              {/* Metrics */}
                              {metricKeys.length > 0 && (
                                <div className="flex items-center gap-4 text-xs text-white/60">
                                  {metricKeys.map(key => (
                                    <div key={key} className="flex items-center gap-1">
                                      <Activity size={12} />
                                      <span>
                                        {key}: {execution.metrics[key]}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            );
          })}
      </div>

      {mockProgress.filter(progress => !selectedKR || progress.krId === selectedKR).length === 0 && (
        <GlassCard className="p-12 text-center">
          <p className="text-white/60">No progress data found for the selected KR</p>
        </GlassCard>
      )}
    </motion.div>
  );
}
