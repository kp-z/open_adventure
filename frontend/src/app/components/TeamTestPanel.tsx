/**
 * TeamTestPanel - 团队测试面板
 *
 * 模拟团队协作场景测试
 * - 显示团队信息和成员列表
 * - 运行测试场景
 * - 显示执行日志
 */
import React, { useState } from 'react';
import {
  Play,
  Square,
  Clock,
  CheckCircle2,
  AlertCircle,
  Users,
  MessageSquare,
  ArrowRight,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GlassCard } from './ui-shared';
import type { Team, Agent } from '@/lib/api';

interface TeamTestPanelProps {
  team: Team;
  availableAgents: Agent[];
}

interface TestLog {
  timestamp: string;
  agent: string;
  message: string;
  type: 'info' | 'success' | 'error';
}

export const TeamTestPanel: React.FC<TeamTestPanelProps> = ({
  team,
  availableAgents
}) => {
  const [testInput, setTestInput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<TestLog[]>([]);
  const [duration, setDuration] = useState<number | null>(null);

  // 获取 Agent 名称
  const getAgentName = (agentId: number): string => {
    const agent = availableAgents.find(a => a.id === agentId);
    return agent?.name || `Agent #${agentId}`;
  };

  // 模拟测试执行
  const handleRunTest = async () => {
    if (!testInput.trim()) return;

    setIsRunning(true);
    setLogs([]);
    setDuration(null);

    const startTime = Date.now();

    try {
      // 模拟团队协作流程
      const simulatedLogs: TestLog[] = [];

      // 1. 任务分配
      simulatedLogs.push({
        timestamp: new Date().toISOString(),
        agent: 'System',
        message: `开始执行任务: ${testInput}`,
        type: 'info'
      });

      await delay(500);
      setLogs([...simulatedLogs]);

      // 2. 各成员处理
      for (const member of team.members) {
        const agentName = getAgentName(member.agent_id);

        simulatedLogs.push({
          timestamp: new Date().toISOString(),
          agent: agentName,
          message: `[${member.role}] 开始处理任务...`,
          type: 'info'
        });
        setLogs([...simulatedLogs]);

        await delay(1000);

        simulatedLogs.push({
          timestamp: new Date().toISOString(),
          agent: agentName,
          message: `[${member.role}] 任务处理完成`,
          type: 'success'
        });
        setLogs([...simulatedLogs]);

        await delay(500);
      }

      // 3. 完成
      simulatedLogs.push({
        timestamp: new Date().toISOString(),
        agent: 'System',
        message: '所有成员任务完成，团队协作成功！',
        type: 'success'
      });
      setLogs([...simulatedLogs]);

      const endTime = Date.now();
      setDuration((endTime - startTime) / 1000);
    } catch (err) {
      setLogs(prev => [
        ...prev,
        {
          timestamp: new Date().toISOString(),
          agent: 'System',
          message: `执行失败: ${err instanceof Error ? err.message : '未知错误'}`,
          type: 'error'
        }
      ]);
    } finally {
      setIsRunning(false);
    }
  };

  // 停止测试
  const handleStopTest = () => {
    setIsRunning(false);
    setLogs(prev => [
      ...prev,
      {
        timestamp: new Date().toISOString(),
        agent: 'System',
        message: '测试已手动停止',
        type: 'info'
      }
    ]);
  };

  // 延迟函数
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  // 获取日志图标
  const getLogIcon = (type: TestLog['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 size={14} className="text-green-400" />;
      case 'error':
        return <AlertCircle size={14} className="text-red-400" />;
      default:
        return <MessageSquare size={14} className="text-blue-400" />;
    }
  };

  // 获取日志颜色
  const getLogColor = (type: TestLog['type']) => {
    switch (type) {
      case 'success':
        return 'text-green-400';
      case 'error':
        return 'text-red-400';
      default:
        return 'text-gray-300';
    }
  };

  return (
    <div className="space-y-6">
      {/* 团队概览 */}
      <GlassCard className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Users size={20} className="text-purple-400" />
          <h3 className="font-bold text-lg">{team.name}</h3>
        </div>

        <p className="text-sm text-gray-400 mb-4">{team.description}</p>

        <div className="flex items-center gap-4">
          <div className="flex -space-x-3">
            {team.members.slice(0, 5).map((member, i) => (
              <div
                key={member.agent_id}
                className="w-10 h-10 rounded-full border-2 border-[#0f111a] bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center"
                title={getAgentName(member.agent_id)}
              >
                <span className="text-xs font-bold">{i + 1}</span>
              </div>
            ))}
          </div>
          <span className="text-sm text-gray-400">
            {team.members.length} 成员
          </span>
        </div>
      </GlassCard>

      {/* 测试输入 */}
      <GlassCard className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Play size={18} className="text-green-400" />
          <h3 className="font-bold">测试场景</h3>
        </div>

        <div className="space-y-4">
          <textarea
            value={testInput}
            onChange={(e) => setTestInput(e.target.value)}
            placeholder="输入测试场景，例如：'开发一个用户登录功能'"
            rows={3}
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-green-500/50 resize-none transition-all"
            disabled={isRunning}
          />

          <div className="flex gap-3">
            {!isRunning ? (
              <button
                onClick={handleRunTest}
                disabled={!testInput.trim()}
                className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-500 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-xl font-bold transition-all"
              >
                <Play size={18} />
                运行测试
              </button>
            ) : (
              <button
                onClick={handleStopTest}
                className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-500 rounded-xl font-bold transition-all"
              >
                <Square size={18} />
                停止测试
              </button>
            )}

            {duration !== null && (
              <div className="flex items-center gap-2 px-4 py-3 bg-white/5 rounded-xl">
                <Clock size={18} className="text-blue-400" />
                <span className="text-sm font-bold">{duration.toFixed(2)}s</span>
              </div>
            )}
          </div>
        </div>
      </GlassCard>

      {/* 执行日志 */}
      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <MessageSquare size={18} className="text-cyan-400" />
            <h3 className="font-bold">执行日志</h3>
          </div>
          {isRunning && (
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Loader2 size={14} className="animate-spin" />
              运行中...
            </div>
          )}
        </div>

        <div className="space-y-2 max-h-96 overflow-y-auto">
          <AnimatePresence>
            {logs.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">
                暂无日志，运行测试后查看
              </p>
            ) : (
              logs.map((log, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="flex items-start gap-3 p-3 bg-white/5 rounded-xl border border-white/10"
                >
                  {getLogIcon(log.type)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-purple-400">
                        {log.agent}
                      </span>
                      <ArrowRight size={12} className="text-gray-500" />
                      <span className="text-xs text-gray-500">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className={`text-sm ${getLogColor(log.type)}`}>
                      {log.message}
                    </p>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </GlassCard>

      {/* 成员列表 */}
      <GlassCard className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Users size={18} className="text-blue-400" />
          <h3 className="font-bold">团队成员</h3>
        </div>

        <div className="space-y-2">
          {team.members.map((member, index) => (
            <div
              key={member.agent_id}
              className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/10"
            >
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <span className="text-sm font-bold">{index + 1}</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold">{getAgentName(member.agent_id)}</p>
                <p className="text-xs text-gray-400">{member.role}</p>
              </div>
              <div className="px-2 py-1 bg-white/5 rounded-lg">
                <p className="text-xs text-gray-400">P{member.priority}</p>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
};
