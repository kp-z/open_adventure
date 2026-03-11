import { useState, useEffect, useMemo, useRef } from 'react';
import {
  History as HistoryIcon,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  Sword
} from 'lucide-react';
import { useMode } from '../contexts/ModeContext';
import { GlassCard, GameCard, ActionButton } from '../components/ui-shared';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { WebSocketMonitor } from '../components/WebSocketMonitor';
import { motion } from 'motion/react';
import { getAvatarById } from '../lib/avatars';
import type { Execution, ExecutionType } from '@/lib/api';
import { useExecutionContext } from '../contexts/ExecutionContext';
import { useNotifications } from '../contexts/NotificationContext';

const History = () => {
  const { mode } = useMode();
  const { executions: contextExecutions, isConnected } = useExecutionContext();
  const { addNotification } = useNotifications();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<ExecutionType | 'all'>('all');
  const lastHistoryErrorRef = useRef<string | null>(null);

  const allExecutions = useMemo(() => {
    const list = Array.from(contextExecutions.values()) as Execution[];
    return list.sort((a, b) => {
      const timeDiff = new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime();
      if (timeDiff !== 0) {
        return timeDiff;
      }
      const createdDiff = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (createdDiff !== 0) {
        return createdDiff;
      }
      return b.id - a.id;
    });
  }, [contextExecutions]);

  useEffect(() => {
    if (allExecutions.length > 0) {
      setLoading(false);
      setError(null);
      return;
    }

    if (!isConnected) {
      setLoading(false);
      return;
    }

    const timer = setTimeout(() => {
      if (allExecutions.length === 0) {
        setLoading(false);
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [allExecutions.length, isConnected]);

  useEffect(() => {
    if (isConnected && lastHistoryErrorRef.current === 'ws_disconnected') {
      lastHistoryErrorRef.current = null;
      setError(null);
    }

    if (!isConnected) {
      const message = 'Execution 实时连接中断，History 可能不会自动更新。';
      setError(message);
      if (lastHistoryErrorRef.current !== 'ws_disconnected') {
        addNotification({
          type: 'error',
          title: 'History 实时连接中断',
          message,
        });
        lastHistoryErrorRef.current = 'ws_disconnected';
      }
    }
  }, [isConnected, addNotification]);

  const filteredExecutions = (searchQuery.trim() === ''
    ? allExecutions
    : allExecutions.filter(execution =>
      execution.task?.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      execution.task?.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      execution.task?.project_path?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      execution.session_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      execution.terminal_command?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      execution.terminal_cwd?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      execution.terminal_pid?.toString().includes(searchQuery)
    )).filter((execution) => selectedType === 'all' || execution.execution_type === selectedType);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'succeeded':
        return <CheckCircle2 size={16} className="text-green-500" />;
      case 'failed':
        return <XCircle size={16} className="text-red-500" />;
      case 'running':
        return <Clock size={16} className="text-blue-500 animate-pulse" />;
      case 'waiting_user':
        return <Clock size={16} className="text-yellow-500" />;
      default:
        return <Clock size={16} className="text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'succeeded':
        return 'text-green-500';
      case 'failed':
        return 'text-red-500';
      case 'running':
        return 'text-blue-500';
      case 'waiting_user':
        return 'text-yellow-500';
      default:
        return 'text-gray-500';
    }
  };

  const getRating = (task: any) => {
    if (task.status === 'succeeded') {
      return 'S';
    } else if (task.status === 'failed') {
      return 'F';
    } else if (task.status === 'running') {
      return 'A';
    }
    return 'B';
  };

  const formatDuration = (startTime: string, endTime?: string) => {
    if (!endTime) return 'N/A';
    const start = new Date(startTime).getTime();
    const end = new Date(endTime).getTime();
    const duration = Math.floor((end - start) / 1000);
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    return `${minutes}m ${seconds}s`;
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 172800) return 'Yesterday';
    return date.toLocaleDateString();
  };

  if (loading) {
    return <LoadingSpinner text="Loading execution history..." />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-red-500 mb-4">Error: {error}</p>
          <ActionButton onClick={fetchExecutions}>Retry</ActionButton>
        </div>
      </div>
    );
  }

  if (false) {
    const avatars = ['blackpanther', 'harleyquinn', 'captainamerica', 'wonderwoman', 'spiderman', 'blackwidow'];

    return (
      <div className="space-y-8 pt-6">
        <header>
          <div className="flex items-center gap-3">
            <h1 className="text-4xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-600 uppercase">
              Battle Logs: Victory Hall
            </h1>
            <span className="px-2 py-1 bg-yellow-500/20 border border-yellow-500/40 rounded-lg text-xs font-bold text-yellow-400 whitespace-nowrap">
              敬请期待
            </span>
          </div>
          <p className="text-gray-400 font-medium">Behold the records of past conquests and learn from every encounter.</p>
        </header>

        <div className="space-y-4">
          {filteredExecutions.slice(0, 10).map((execution, idx) => {
            const avatar = avatars[idx % avatars.length];
            const rating = getRating(execution.task || execution);

            return (
              <motion.div
                key={execution.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
              >
                <GameCard rarity={execution.status === 'succeeded' ? 'rare' : execution.status === 'running' ? 'epic' : 'common'} className="p-0 flex flex-col sm:flex-row items-stretch gap-0 overflow-hidden group">
                  <div className="w-full sm:w-28 bg-black/40 relative overflow-hidden flex items-center justify-center shrink-0 min-h-[100px] sm:min-h-0">
                    <div className="absolute inset-0 bg-gradient-to-r from-black/20 to-transparent z-10" />
                    <img
                      src={getAvatarById(avatar).img}
                      alt="Hero"
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 opacity-80"
                    />
                    <div className={`relative z-20 w-12 h-12 rounded-full flex items-center justify-center font-black text-xl italic shadow-xl ${rating === 'S' ? 'bg-yellow-500 text-black shadow-yellow-500/30' :
                      rating === 'A' ? 'bg-blue-500 text-white' :
                        rating === 'B' ? 'bg-purple-500 text-white' : 'bg-red-500 text-white'
                      }`}>
                      {rating}
                    </div>
                  </div>

                  <div className="flex-1 p-4 flex flex-col sm:flex-row items-center gap-6">
                    <div className="flex-1 text-center sm:text-left">
                      <div className="flex items-center gap-2 justify-center sm:justify-start">
                        <p className="text-[10px] font-black uppercase text-gray-500 tracking-widest">E-{execution.id}</p>
                        <span className={`
                          text-[8px] font-black uppercase px-1.5 py-0.5 rounded
                          ${execution.execution_type === 'workflow' ? 'bg-blue-500' :
                            execution.execution_type === 'agent_test' ? 'bg-green-500' :
                              execution.execution_type === 'terminal' ? 'bg-orange-500' :
                                'bg-purple-500'}
                        `}>
                          {execution.execution_type === 'workflow' ? 'WORKFLOW' :
                            execution.execution_type === 'agent_test' ? 'AGENT' :
                              execution.execution_type === 'terminal' ? 'TERMINAL' :
                                'TEAM'}
                        </span>
                      </div>
                      <h3 className="text-xl font-black uppercase italic tracking-wider text-white mt-1">{execution.task?.title || `Execution #${execution.id}`}</h3>
                      <p className="text-xs text-gray-400 mt-1 line-clamp-1">{execution.task?.description || 'No description'}</p>
                      <div className="flex flex-wrap justify-center sm:justify-start gap-4 mt-2">
                        <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1">
                          <Clock size={12} /> {formatDuration(execution.created_at, execution.updated_at)}
                        </span>
                        <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1">
                          <HistoryIcon size={12} /> {formatTime(execution.created_at)}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <ActionButton variant="secondary" className="text-[10px] py-1">Watch Replay</ActionButton>
                      <ActionButton className="text-[10px] py-1 flex items-center gap-2">
                        <Sword size={12} />
                        Rematch
                      </ActionButton>
                    </div>
                  </div>
                </GameCard>
              </motion.div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-8 pt-6">
      <header className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight uppercase">HISTORY</h1>
          </div>
          <p className="text-sm md:text-base text-gray-400 line-clamp-1 md:line-clamp-none">实时监控和回放所有 AI 任务的执行过程</p>
        </div>
      </header>

      {/* WebSocket 监控卡片 */}
      <WebSocketMonitor />

      <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search execution logs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm md:text-base focus:outline-none focus:border-blue-500/50 transition-all"
          />
        </div>
      </div>

      {/* 类型筛选器 */}
      <div className="flex gap-2 flex-wrap">
        {(['all', 'workflow', 'agent_test', 'agent_team', 'terminal'] as const).map((type) => (
          <button
            key={type}
            onClick={() => setSelectedType(type)}
            className={`
              px-4 py-2 rounded-xl text-sm font-bold transition-all
              ${selectedType === type
                ? 'bg-blue-500/20 border-2 border-blue-500/50 text-blue-400'
                : 'bg-white/5 border border-white/10 text-gray-400 hover:text-white'
              }
            `}
          >
            {type === 'all' ? 'All' :
              type === 'workflow' ? 'Workflow' :
                type === 'agent_test' ? 'Agent' :
                  type === 'agent_team' ? 'AgentTeam' :
                    'Terminal'}
          </button>
        ))}
      </div>

      {/* 桌面端表格 - 仅在 ≥md 显示 */}
      <div className="hidden md:block bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/5 bg-white/5 text-[10px] font-black uppercase tracking-widest text-gray-400">
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Task Name</th>
              <th className="px-6 py-4">Execution Info</th>
              <th className="px-6 py-4">Duration</th>
              <th className="px-6 py-4">Finished</th>
              <th className="px-6 py-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filteredExecutions.length > 0 ? (
              filteredExecutions.map((execution) => (
                <tr key={execution.id} className="hover:bg-white/5 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(execution.status)}
                      <span className={`text-xs font-bold capitalize ${getStatusColor(execution.status)}`}>
                        {execution.status}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-sm font-bold">{execution.task?.title || `Execution #${execution.id}`}</p>
                      <p className="text-[10px] text-gray-500 line-clamp-1">{execution.task?.description || 'No description'}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1.5">
                      <span className={`
                        px-2 py-1 rounded text-xs font-bold w-fit
                        ${execution.execution_type === 'workflow' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                          execution.execution_type === 'agent_test' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                            execution.execution_type === 'terminal' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                              'bg-purple-500/20 text-purple-400 border border-purple-500/30'}
                      `}>
                        {execution.execution_type === 'workflow' ? 'Workflow' :
                          execution.execution_type === 'agent_test' ? 'Agent' :
                            execution.execution_type === 'terminal' ? 'Terminal' :
                              'AgentTeam'}
                      </span>

                      {execution.execution_type === 'terminal' ? (
                        <div className="space-y-1">
                          {execution.terminal_command && (
                            <div className="text-[10px] text-gray-400">
                              <span className="text-gray-500">Command:</span>{' '}
                              <span className="font-mono text-gray-300" title={execution.terminal_command}>
                                {execution.terminal_command}
                              </span>
                            </div>
                          )}
                          {execution.session_id && (
                            <div className="text-[10px] text-gray-400">
                              <span className="text-gray-500">Session:</span>{' '}
                              <span className="font-mono text-gray-300" title={execution.session_id}>
                                {execution.session_id}
                              </span>
                            </div>
                          )}
                          {execution.terminal_pid && (
                            <div className="text-[10px] text-gray-400">
                              <span className="text-gray-500">PID:</span>{' '}
                              <span className="font-mono text-gray-300">{execution.terminal_pid}</span>
                            </div>
                          )}
                          {execution.terminal_cwd && (
                            <div className="text-[10px] text-gray-400 truncate max-w-[280px]" title={execution.terminal_cwd}>
                              <span className="text-gray-500">CWD:</span>{' '}
                              <span className="font-mono text-gray-300">{execution.terminal_cwd}</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        execution.workflow_id && execution.workflow_id > 0 && (
                          <span className="text-[10px] text-gray-500">Workflow #{execution.workflow_id}</span>
                        )
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-400">{formatDuration(execution.created_at, execution.updated_at)}</td>
                  <td className="px-6 py-4 text-xs text-gray-400">{formatTime(execution.created_at)}</td>
                  <td className="px-6 py-4 text-right">
                    <button className="p-2 text-gray-500 hover:text-blue-400 transition-colors">
                      <ArrowRight size={18} />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                  No executions found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 移动端卡片展示 - 仅在 <md 显示 */}
      <div className="md:hidden space-y-3">
        {filteredExecutions.length > 0 ? (
          filteredExecutions.map((execution) => (
            <GlassCard key={execution.id} className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  {getStatusIcon(execution.status)}
                  <span className={`text-xs font-bold capitalize ${getStatusColor(execution.status)}`}>
                    {execution.status}
                  </span>
                </div>
                <button className="p-1 text-gray-500 hover:text-blue-400 transition-colors">
                  <ArrowRight size={16} />
                </button>
              </div>
              <div className="mb-3">
                <p className="text-sm font-bold mb-1">{execution.task?.title || `Execution #${execution.id}`}</p>
                <p className="text-xs text-gray-500 line-clamp-2">{execution.task?.description || 'No description'}</p>
                <div className="mt-2 space-y-1 text-[10px] text-gray-400">
                  <div>
                    <span className="text-gray-500">Type:</span>{' '}
                    <span className="font-medium text-gray-300">{execution.execution_type}</span>
                  </div>
                  {execution.execution_type === 'terminal' && execution.session_id && (
                    <div className="truncate" title={execution.session_id}>
                      <span className="text-gray-500">Session:</span>{' '}
                      <span className="font-mono text-gray-300">{execution.session_id}</span>
                    </div>
                  )}
                  {execution.execution_type === 'terminal' && execution.terminal_pid && (
                    <div>
                      <span className="text-gray-500">PID:</span>{' '}
                      <span className="font-mono text-gray-300">{execution.terminal_pid}</span>
                    </div>
                  )}
                  {execution.execution_type === 'terminal' && execution.terminal_command && (
                    <div className="truncate" title={execution.terminal_command}>
                      <span className="text-gray-500">Command:</span>{' '}
                      <span className="font-mono text-gray-300">{execution.terminal_command}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>{formatDuration(execution.created_at, execution.updated_at)}</span>
                <span>{formatTime(execution.created_at)}</span>
              </div>
            </GlassCard>
          ))
        ) : (
          <div className="text-center py-12 text-gray-500">
            No executions found
          </div>
        )}
      </div>
    </div>
  );
};

export default History;
