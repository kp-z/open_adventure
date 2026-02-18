import React from 'react';
import { 
  History, 
  Search, 
  Filter, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ArrowRight,
  Trophy,
  Sword,
  Shield,
  Star,
  Play
} from 'lucide-react';
import { useMode } from '../contexts/ModeContext';
import { GlassCard, GameCard, ActionButton } from '../components/ui-shared';
import { motion } from 'motion/react';
import { getAvatarById } from '../lib/avatars';

const mockTasks = [
  { id: 'T-4501', title: 'Security Audit - API v2', workflow: 'Vulnerability Scan', status: 'success', duration: '12m 45s', time: '2h ago', rating: 'S', avatar: 'blackpanther' },
  { id: 'T-4500', title: 'Generate Q3 Marketing Docs', workflow: 'Content Pipeline', status: 'failed', duration: '3m 12s', time: '5h ago', rating: 'F', avatar: 'harleyquinn' },
  { id: 'T-4499', title: 'Database Migration Prep', workflow: 'Infra Deploy', status: 'success', duration: '45m 10s', time: 'Yesterday', rating: 'A', avatar: 'captainamerica' },
  { id: 'T-4498', title: 'UI Component Review', workflow: 'Design System', status: 'success', duration: '8m 20s', time: 'Yesterday', rating: 'B', avatar: 'wonderwoman' },
];

const Tasks = () => {
  const { mode } = useMode();

  if (mode === 'adventure') {
    return (
      <div className="space-y-8">
        <header>
          <h1 className="text-4xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-600 uppercase">
            Battle Logs: Victory Hall
          </h1>
          <p className="text-gray-400 font-medium">Behold the records of past conquests and learn from every encounter.</p>
        </header>

        <div className="space-y-4">
          {mockTasks.map((task, idx) => (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
            >
              <GameCard rarity={task.status === 'success' ? 'rare' : 'common'} className="p-0 flex flex-col sm:flex-row items-stretch gap-0 overflow-hidden group">
                {/* Hero Avatar Section */}
                <div className="w-full sm:w-28 bg-black/40 relative overflow-hidden flex items-center justify-center shrink-0 min-h-[100px] sm:min-h-0">
                   <div className="absolute inset-0 bg-gradient-to-r from-black/20 to-transparent z-10" />
                   <img 
                      src={getAvatarById(task.avatar).img} 
                      alt="Hero" 
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 opacity-80"
                   />
                   <div className={`relative z-20 w-12 h-12 rounded-full flex items-center justify-center font-black text-xl italic shadow-xl ${
                      task.rating === 'S' ? 'bg-yellow-500 text-black shadow-yellow-500/30' :
                      task.rating === 'A' ? 'bg-blue-500 text-white' :
                      task.rating === 'B' ? 'bg-purple-500 text-white' : 'bg-red-500 text-white'
                   }`}>
                      {task.rating}
                   </div>
                </div>

                <div className="flex-1 p-4 flex flex-col sm:flex-row items-center gap-6">
                  <div className="flex-1 text-center sm:text-left">
                    <p className="text-[10px] font-black uppercase text-gray-500 tracking-widest">{task.id} • {task.workflow}</p>
                    <h3 className="text-xl font-black uppercase italic tracking-wider text-white mt-1">{task.title}</h3>
                    <div className="flex flex-wrap justify-center sm:justify-start gap-4 mt-2">
                      <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1"><Clock size={12} /> {task.duration}</span>
                      <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1"><History size={12} /> {task.time}</span>
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
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Execution Tasks</h1>
        <p className="text-gray-400">Track and monitor the history of all AI agent activities.</p>
      </header>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Search task logs..."
            className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 focus:outline-none focus:border-blue-500/50 transition-all"
          />
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm font-bold text-gray-400 hover:text-white transition-all">
            <Filter size={16} /> Filter
          </button>
          <ActionButton variant="secondary">Clear History</ActionButton>
        </div>
      </div>

      <div className="bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
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
            {mockTasks.map((task) => (
              <tr key={task.id} className="hover:bg-white/5 transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    {task.status === 'success' ? (
                      <CheckCircle2 size={16} className="text-green-500" />
                    ) : (
                      <XCircle size={16} className="text-red-500" />
                    )}
                    <span className={`text-xs font-bold capitalize ${task.status === 'success' ? 'text-green-500' : 'text-red-500'}`}>
                      {task.status}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div>
                    <p className="text-sm font-bold">{task.title}</p>
                    <p className="text-[10px] text-gray-500 font-mono uppercase tracking-tighter">{task.id}</p>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="text-xs text-gray-400 bg-white/5 px-2 py-1 rounded border border-white/5">{task.workflow}</span>
                </td>
                <td className="px-6 py-4 text-xs text-gray-400">{task.duration}</td>
                <td className="px-6 py-4 text-xs text-gray-400">{task.time}</td>
                <td className="px-6 py-4 text-right">
                  <button className="p-2 text-gray-500 hover:text-blue-400 transition-colors">
                    <ArrowRight size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Tasks;
