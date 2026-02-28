import { useState, useEffect } from 'react';
import {
  History,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  Sword
} from 'lucide-react';
import { useMode } from '../contexts/ModeContext';
import { GlassCard, GameCard, ActionButton } from '../components/ui-shared';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { motion } from 'motion/react';
import { getAvatarById } from '../lib/avatars';
import { tasksApi } from '@/lib/api';
import type { Task } from '@/lib/api';

const Tasks = () => {
  const { mode } = useMode();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await tasksApi.list({ limit: 50 });
      setTasks(response.items);
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
      setError(err instanceof Error ? err.message : 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const filteredTasks = searchQuery.trim() === '' 
    ? tasks 
    : tasks.filter(task =>
        task.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.project_path?.toLowerCase().includes(searchQuery.toLowerCase())
      );

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

  const getRating = (task: Task) => {
    if (task.status === 'succeeded') {
      return 'S';
    } else if (task.status === 'failed') {
      return 'F';
    } else if (task.status === 'running') {
      return 'A';
    }
    return 'B';
  };
  
  const getPriorityTag = (task: Task) => {
    const priority = task.meta?.priority;
    if (priority === 'critical') return { text: 'CRITICAL', color: 'bg-red-500' };
    if (priority === 'high') return { text: 'HIGH', color: 'bg-orange-500' };
    if (priority === 'medium') return { text: 'MEDIUM', color: 'bg-blue-500' };
    return { text: 'LOW', color: 'bg-gray-500' };
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
    return <LoadingSpinner text="Loading tasks..." />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-red-500 mb-4">Error: {error}</p>
          <ActionButton onClick={fetchTasks}>Retry</ActionButton>
        </div>
      </div>
    );
  }

  if (mode === 'adventure') {
    const avatars = ['blackpanther', 'harleyquinn', 'captainamerica', 'wonderwoman', 'spiderman', 'blackwidow'];

    return (
      <div className="space-y-8">
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
          {filteredTasks.slice(0, 10).map((task, idx) => {
            const avatar = avatars[idx % avatars.length];
            const rating = getRating(task);

            return (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
              >
                <GameCard rarity={task.status === 'succeeded' ? 'rare' : task.status === 'running' ? 'epic' : 'common'} className="p-0 flex flex-col sm:flex-row items-stretch gap-0 overflow-hidden group">
                  {/* Hero Avatar Section */}
                  <div className="w-full sm:w-28 bg-black/40 relative overflow-hidden flex items-center justify-center shrink-0 min-h-[100px] sm:min-h-0">
                    <div className="absolute inset-0 bg-gradient-to-r from-black/20 to-transparent z-10" />
                    <img
                      src={getAvatarById(avatar).img}
                      alt="Hero"
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 opacity-80"
                    />
                    <div className={`relative z-20 w-12 h-12 rounded-full flex items-center justify-center font-black text-xl italic shadow-xl ${
                      rating === 'S' ? 'bg-yellow-500 text-black shadow-yellow-500/30' :
                      rating === 'A' ? 'bg-blue-500 text-white' :
                      rating === 'B' ? 'bg-purple-500 text-white' : 'bg-red-500 text-white'
                    }`}>
                      {rating}
                    </div>
                  </div>

                  <div className="flex-1 p-4 flex flex-col sm:flex-row items-center gap-6">
                    <div className="flex-1 text-center sm:text-left">
                      <div className="flex items-center gap-2 justify-center sm:justify-start">
                        <p className="text-[10px] font-black uppercase text-gray-500 tracking-widest">T-{task.id}</p>
                        <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${getPriorityTag(task).color}`}>
                          {getPriorityTag(task).text}
                        </span>
                      </div>
                      <h3 className="text-xl font-black uppercase italic tracking-wider text-white mt-1">{task.title}</h3>
                      <p className="text-xs text-gray-400 mt-1 line-clamp-1">{task.description}</p>
                      <div className="flex flex-wrap justify-center sm:justify-start gap-4 mt-2">
                        <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1">
                          <Clock size={12} /> {formatDuration(task.created_at, task.updated_at)}
                        </span>
                        <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1">
                          <History size={12} /> {formatTime(task.created_at)}
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
    <div className="space-y-4 md:space-y-8">
      <header className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight uppercase">EXECUTION TASKS</h1>
            <span className="px-2 py-1 bg-yellow-500/20 border border-yellow-500/40 rounded-lg text-xs font-bold text-yellow-400 whitespace-nowrap">
              敬请期待
            </span>
          </div>
          <p className="text-sm md:text-base text-gray-400">Track and monitor the history of all AI agent activities.</p>
        </div>
      </header>

      <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search task logs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm md:text-base focus:outline-none focus:border-blue-500/50 transition-all"
          />
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-3 md:px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs md:text-sm font-bold text-gray-400 hover:text-white transition-all">
            <Filter size={16} /> <span className="hidden sm:inline">Filter</span>
          </button>
          <ActionButton variant="secondary" className="text-xs md:text-sm">
            <span className="hidden sm:inline">Clear History</span>
            <span className="sm:hidden">Clear</span>
          </ActionButton>
        </div>
      </div>

      {/* 桌面端表格 - 仅在 ≥md 显示 */}
      <div className="hidden md:block bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/5 bg-white/5 text-[10px] font-black uppercase tracking-widest text-gray-400">
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Task Name</th>
              <th className="px-6 py-4">Workflow</th>
              <th className="px-6 py-4">Duration</th>
              <th className="px-6 py-4">Finished</th>
              <th className="px-6 py-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filteredTasks.length > 0 ? (
              filteredTasks.map((task) => (
                <tr key={task.id} className="hover:bg-white/5 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(task.status)}
                      <span className={`text-xs font-bold capitalize ${getStatusColor(task.status)}`}>
                        {task.status}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-sm font-bold">{task.title}</p>
                      <p className="text-[10px] text-gray-500 line-clamp-1">{task.description}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded w-fit ${getPriorityTag(task).color}`}>
                        {getPriorityTag(task).text}
                      </span>
                      {task.workflow_id && (
                        <span className="text-[10px] text-gray-500">Workflow #{task.workflow_id}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-400">{formatDuration(task.created_at, task.updated_at)}</td>
                  <td className="px-6 py-4 text-xs text-gray-400">{formatTime(task.created_at)}</td>
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
                  No tasks found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 移动端卡片展示 - 仅在 <md 显示 */}
      <div className="md:hidden space-y-3">
        {filteredTasks.length > 0 ? (
          filteredTasks.map((task) => (
            <GlassCard key={task.id} className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  {getStatusIcon(task.status)}
                  <span className={`text-xs font-bold capitalize ${getStatusColor(task.status)}`}>
                    {task.status}
                  </span>
                </div>
                <button className="p-1 text-gray-500 hover:text-blue-400 transition-colors">
                  <ArrowRight size={16} />
                </button>
              </div>
              <div className="mb-3">
                <p className="text-sm font-bold mb-1">{task.title}</p>
                <p className="text-xs text-gray-500 line-clamp-2">{task.description}</p>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>{formatDuration(task.created_at, task.updated_at)}</span>
                <span>{formatTime(task.created_at)}</span>
              </div>
            </GlassCard>
          ))
        ) : (
          <div className="text-center py-12 text-gray-500">
            No tasks found
          </div>
        )}
      </div>
    </div>
  );
};

export default Tasks;
