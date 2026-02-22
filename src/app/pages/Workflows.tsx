import React, { useState, useEffect } from 'react';
import {
  GitBranch,
  Map as MapIcon,
  Play,
  Plus,
  MoreVertical,
  Layers,
  CheckCircle2,
  Clock,
  AlertCircle,
  Sword,
  Shield,
  Trophy,
  Compass
} from 'lucide-react';
import { useMode } from '../contexts/ModeContext';
import { GlassCard, GameCard, ActionButton } from '../components/ui-shared';
import { motion, AnimatePresence } from 'motion/react';
import { WorkflowEditor } from '../components/WorkflowEditor';
import { workflowsApi } from '@/lib/api';
import type { Workflow } from '@/lib/api';

const Workflows = () => {
  const { mode } = useMode();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  useEffect(() => {
    fetchWorkflows();
  }, []);

  const fetchWorkflows = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await workflowsApi.list();
      setWorkflows(response.items);
    } catch (err) {
      console.error('Failed to fetch workflows:', err);
      setError(err instanceof Error ? err.message : 'Failed to load workflows');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading workflows...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-red-500 mb-4">Error: {error}</p>
          <ActionButton onClick={fetchWorkflows}>Retry</ActionButton>
        </div>
      </div>
    );
  }

  if (mode === 'adventure') {
    return (
      <div className="space-y-8 relative">
        <AnimatePresence>
          {isEditorOpen && <WorkflowEditor onClose={() => setIsEditorOpen(false)} />}
        </AnimatePresence>
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-4xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-600 uppercase leading-[0.8]">
              Dungeon Hall: Missions
            </h1>
            <p className="text-gray-400 font-medium">Embark on legendary automation quests and reap the rewards.</p>
          </div>
          <ActionButton onClick={() => setIsEditorOpen(true)}>Create New Map</ActionButton>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {workflows.map((wf, idx) => {
            const colors = ['blue', 'purple', 'green', 'red'];
            const color = colors[idx % colors.length];
            const difficulty = Math.min(5, Math.ceil((wf.steps?.length || 0) / 3));
            const successRate = wf.avg_rating ? Math.round(wf.avg_rating * 20) : 85;

            return (
              <motion.div
                key={wf.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.1 }}
              >
                <GameCard rarity={difficulty >= 5 ? 'legendary' : difficulty >= 3 ? 'epic' : 'rare'} className="group p-0 overflow-hidden h-full flex flex-col sm:flex-row">
                  <div className={`w-full sm:w-48 bg-black/60 relative overflow-hidden flex items-center justify-center p-8 shrink-0`}>
                    <div className={`absolute inset-0 bg-${color}-500 opacity-20 group-hover:opacity-40 transition-opacity`} />
                    <Compass size={80} className={`text-${color}-500 relative z-10 drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]`} />
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/80 px-3 py-1 rounded border border-white/10 text-[10px] font-black italic uppercase whitespace-nowrap z-20">
                      {wf.steps?.length || 0} STAGES
                    </div>
                  </div>

                  <div className="p-6 flex-1 flex flex-col">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-xl font-black uppercase italic tracking-wider text-white">{wf.name}</h3>
                      <div className="flex gap-1">
                        {[...Array(5)].map((_, i) => (
                          <div key={i} className={`w-2 h-2 rounded-full ${i < difficulty ? 'bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.5)]' : 'bg-gray-800'}`} />
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 italic mb-6">"{wf.description || 'No description'}"</p>

                    <div className="grid grid-cols-2 gap-4 mb-8">
                      <div className="bg-black/40 rounded-lg p-3 border border-white/5 text-center">
                        <p className="text-[9px] font-black uppercase text-gray-500 tracking-widest mb-1">Clear Rate</p>
                        <p className="text-lg font-black text-green-500">{successRate}%</p>
                      </div>
                      <div className="bg-black/40 rounded-lg p-3 border border-white/5 text-center">
                        <p className="text-[9px] font-black uppercase text-gray-500 tracking-widest mb-1">Rewards</p>
                        <p className="text-lg font-black text-yellow-500">{(wf.usage_count * 2.4).toFixed(1)}k XP</p>
                      </div>
                    </div>

                    <div className="mt-auto flex gap-3">
                      <button className="flex-1 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-[10px] font-black uppercase transition-all">Edit Map</button>
                      <button className="flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-[10px] font-black uppercase text-white transition-all shadow-lg flex items-center justify-center gap-2">
                        <Sword size={14} />
                        Launch Raid
                      </button>
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
    <div className="space-y-8 relative">
      <AnimatePresence>
        {isEditorOpen && <WorkflowEditor onClose={() => setIsEditorOpen(false)} />}
      </AnimatePresence>
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Workflows</h1>
          <p className="text-gray-400">Design and manage complex multi-agent automation chains.</p>
        </div>
        <div className="flex gap-3">
          <ActionButton variant="secondary">Import Template</ActionButton>
          <ActionButton onClick={() => setIsEditorOpen(true)}>New Workflow</ActionButton>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {workflows.map((wf) => {
          const colors = ['blue', 'purple', 'green', 'red'];
          const color = colors[wf.id % colors.length];
          const successRate = wf.avg_rating ? Math.round(wf.avg_rating * 20) : 85;

          return (
            <GlassCard key={wf.id} className="flex flex-col">
              <div className="flex justify-between items-start mb-6">
                <div className={`w-12 h-12 rounded-xl bg-${color}-500/20 border border-${color}-500/30 flex items-center justify-center text-${color}-500`}>
                  <GitBranch size={24} />
                </div>
                <div className="flex gap-2">
                  <div className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-green-500/20 text-green-400">
                    active
                  </div>
                  <button className="text-gray-500 hover:text-white"><MoreVertical size={18} /></button>
                </div>
              </div>

              <h3 className="text-xl font-bold mb-2">{wf.name}</h3>
              <p className="text-sm text-gray-400 mb-6 line-clamp-2">{wf.description || 'No description'}</p>

              <div className="space-y-4 mb-8">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-500 flex items-center gap-1"><Layers size={14} /> Nodes</span>
                  <span className="font-bold">{wf.steps?.length || 0} steps</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-500 flex items-center gap-1"><CheckCircle2 size={14} /> Success Rate</span>
                  <span className={`font-bold ${successRate >= 90 ? 'text-green-500' : 'text-yellow-500'}`}>{successRate}%</span>
                </div>
              </div>

              <div className="mt-auto flex gap-3 pt-4 border-t border-white/5">
                <button className="flex-1 py-2 text-sm font-bold text-gray-400 hover:text-white transition-colors">Edit</button>
                <button className="flex-[2] py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-sm font-bold transition-all flex items-center justify-center gap-2">
                  <Play size={16} fill="currentColor" />
                  Run Now
                </button>
              </div>
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
};

export default Workflows;
