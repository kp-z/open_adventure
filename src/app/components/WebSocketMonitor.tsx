'use client';

import React, { useState, useEffect } from 'react';
import { Activity, Wifi, Clock, Users, AlertCircle, TrendingUp } from 'lucide-react';
import { GlassCard } from './ui-shared';
import { motion } from 'motion/react';

interface WebSocketStats {
  total_connections: number;
  max_connections: number;
  connection_timeout: number;
  cleanup_interval: number;
  connections: Array<{
    client_id: string;
    connected_at: string;
    age_seconds: number;
    is_active: boolean;
  }>;
}

export function WebSocketMonitor() {
  const [stats, setStats] = useState<WebSocketStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
    // 每 5 秒刷新一次
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/ws/stats');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setStats(data);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch WebSocket stats:', err);
      setError(err instanceof Error ? err.message : 'Failed to load stats');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <GlassCard className="p-6">
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </GlassCard>
    );
  }

  if (error) {
    return (
      <GlassCard className="p-6">
        <div className="flex items-center gap-2 text-red-400">
          <AlertCircle className="w-5 h-5" />
          <span>Failed to load WebSocket stats: {error}</span>
        </div>
      </GlassCard>
    );
  }

  if (!stats) {
    return null;
  }

  const usagePercentage = (stats.total_connections / stats.max_connections) * 100;
  const isHighUsage = usagePercentage > 80;
  const isNearLimit = usagePercentage > 90;

  return (
    <GlassCard className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-blue-500/20 rounded-lg">
          <Wifi className="w-5 h-5 text-blue-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">WebSocket 连接监控</h3>
          <p className="text-sm text-gray-400">实时连接状态</p>
        </div>
      </div>

      {/* 连接数统计 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white/5 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-blue-400" />
            <span className="text-sm text-gray-400">活跃连接</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-bold ${isNearLimit ? 'text-red-400' : isHighUsage ? 'text-yellow-400' : 'text-white'}`}>
              {stats.total_connections}
            </span>
            <span className="text-sm text-gray-500">/ {stats.max_connections}</span>
          </div>
          <div className="mt-2 h-2 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className={`h-full ${isNearLimit ? 'bg-red-500' : isHighUsage ? 'bg-yellow-500' : 'bg-blue-500'}`}
              initial={{ width: 0 }}
              animate={{ width: `${usagePercentage}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>

        <div className="bg-white/5 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-purple-400" />
            <span className="text-sm text-gray-400">连接超时</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">
              {Math.floor(stats.connection_timeout / 60)}
            </span>
            <span className="text-sm text-gray-500">分钟</span>
          </div>
          <div className="mt-2 text-xs text-gray-500">
            清理间隔: {Math.floor(stats.cleanup_interval / 60)} 分钟
          </div>
        </div>
      </div>

      {/* 连接列表 */}
      {stats.connections.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-4 h-4 text-green-400" />
            <span className="text-sm font-medium text-gray-300">连接详情</span>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {stats.connections.map((conn) => (
              <div
                key={conn.client_id}
                className="bg-white/5 rounded-lg p-3 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${conn.is_active ? 'bg-green-500' : 'bg-gray-500'}`} />
                  <div>
                    <div className="text-sm text-white font-mono">
                      {conn.client_id.substring(0, 16)}...
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(conn.connected_at).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
                <div className="text-sm text-gray-400">
                  {Math.floor(conn.age_seconds / 60)}m {conn.age_seconds % 60}s
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 状态指示器 */}
      <div className="mt-4 pt-4 border-t border-white/10">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isNearLimit ? 'bg-red-500' : isHighUsage ? 'bg-yellow-500' : 'bg-green-500'}`} />
            <span className="text-gray-400">
              {isNearLimit ? '连接数接近上限' : isHighUsage ? '连接数较高' : '连接状态正常'}
            </span>
          </div>
          <div className="text-gray-500">
            自动刷新: 5s
          </div>
        </div>
      </div>
    </GlassCard>
  );
}
