import React from 'react';
import {
  GitBranch,
  Map as MapIcon,
  Play,
  Plus,
  Package,
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
import { useAppContext } from '../contexts/AppContext';
import { GlassCard, GameCard, ActionButton } from '../components/ui-shared';
import { motion, AnimatePresence } from 'motion/react';
import { WorkflowEditor } from '../components/WorkflowEditor';

const mockWorkflows = [
  { id: 1, name: 'Code Review Pipeline', desc: 'Automated multi-step process for analyzing pull requests.', nodes: 5, difficulty: 3, success: 92, status: 'active', color: 'blue' },
  { id: 2, name: 'SaaS Deployment', desc: 'Deploy cloud infrastructure and verify health endpoints.', nodes: 8, difficulty: 5, success: 88, status: 'draft', color: 'purple' },
  { id: 3, name: 'Content Generation', desc: 'SEO-optimized blog post generation with image search.', nodes: 4, difficulty: 2, success: 98, status: 'active', color: 'green' },
  { id: 4, name: 'Bug Bounty Hunter', desc: 'Scan codebase for known patterns of common vulnerabilities.', nodes: 12, difficulty: 5, success: 75, status: 'archived', color: 'red' },
];

const Workflows = () => {
  const { mode } = useAppContext();
  const [isEditorOpen, setIsEditorOpen] = React.useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = React.useState<any>(null);

  const handleRunWorkflow = (workflow: any) => {
    setSelectedWorkflow(workflow);
    setIsEditorOpen(true);
  };

  const handleEditWorkflow = (workflow: any) => {
    setSelectedWorkflow(workflow);
    setIsEditorOpen(true);
  };

  const handleCloseEditor = () => {
    setIsEditorOpen(false);
    setSelectedWorkflow(null);
  };

  if (mode === 'adventure') {
    return (
      <div className="space-y-8 relative">
        <AnimatePresence>
          {isEditorOpen && <WorkflowEditor workflow={selectedWorkflow} onClose={handleCloseEditor} />}
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
          {mockWorkflows.map((wf, idx) => (
            <motion.div
              key={wf.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.1 }}
            >
              <GameCard rarity={wf.difficulty >= 5 ? 'legendary' : wf.difficulty >= 3 ? 'epic' : 'rare'} className="group p-0 overflow-hidden h-full flex flex-col sm:flex-row">
                 <div className={`w-full sm:w-48 bg-black/60 relative overflow-hidden flex items-center justify-center p-8 shrink-0`}>
                    <div className={`absolute inset-0 bg-${wf.color}-500 opacity-20 group-hover:opacity-40 transition-opacity`} />
                    <Compass size={80} className={`text-${wf.color}-500 relative z-10 drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]`} />
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/80 px-3 py-1 rounded border border-white/10 text-[10px] font-black italic uppercase whitespace-nowrap z-20">
                       {wf.nodes} STAGES
                    </div>
                 </div>
                 
                 <div className="p-6 flex-1 flex flex-col">
                    <div className="flex justify-between items-start mb-2">
                       <h3 className="text-xl font-black uppercase italic tracking-wider text-white">{wf.name}</h3>
                       <div className="flex gap-1">
                          {[...Array(5)].map((_, i) => (
                            <div key={i} className={`w-2 h-2 rounded-full ${i < wf.difficulty ? 'bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.5)]' : 'bg-gray-800'}`} />
                          ))}
                       </div>
                    </div>
                    <p className="text-xs text-gray-400 italic mb-6">"{wf.desc}"</p>
                    
                    <div className="grid grid-cols-2 gap-4 mb-8">
                       <div className="bg-black/40 rounded-lg p-3 border border-white/5 text-center">
                          <p className="text-[9px] font-black uppercase text-gray-500 tracking-widest mb-1">Clear Rate</p>
                          <p className="text-lg font-black text-green-500">{wf.success}%</p>
                       </div>
                       <div className="bg-black/40 rounded-lg p-3 border border-white/5 text-center">
                          <p className="text-[9px] font-black uppercase text-gray-500 tracking-widest mb-1">Rewards</p>
                          <p className="text-lg font-black text-yellow-500">2.4k XP</p>
                       </div>
                    </div>

                    <div className="mt-auto flex gap-3">
                       <button className="flex-1 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-[10px] font-black uppercase transition-all" onClick={() => handleEditWorkflow(wf)}>Edit Map</button>
                       <button className="flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-[10px] font-black uppercase text-white transition-all shadow-lg flex items-center justify-center gap-2" onClick={() => handleRunWorkflow(wf)}>
                          <Sword size={14} />
                          Launch Raid
                       </button>
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
    <div className="space-y-4 md:space-y-8 relative">
      <AnimatePresence>
        {isEditorOpen && <WorkflowEditor workflow={selectedWorkflow} onClose={handleCloseEditor} />}
      </AnimatePresence>
      <header className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight uppercase">WORKFLOWS</h1>
          <p className="text-sm md:text-base text-gray-400">Design and manage complex multi-agent automation chains.</p>
        </div>
        <div className="flex md:flex-row flex-col gap-2 shrink-0">
          <ActionButton variant="secondary" className="md:px-4 px-2 py-2 text-sm min-w-0">
            <Package size={16} />
            <span className="hidden md:inline ml-2">Import</span>
          </ActionButton>
          <ActionButton onClick={() => setIsEditorOpen(true)} className="md:px-4 px-2 py-2 text-sm min-w-0">
            <Plus size={16} />
            <span className="hidden md:inline ml-2">New</span>
          </ActionButton>
        </div>
      </header>

      {/* Workflows Grid - 响应式网格 */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
        {mockWorkflows.map((wf) => (
          <GlassCard key={wf.id} className="flex flex-col">
            <div className="flex justify-between items-start mb-6">
              <div className={`w-12 h-12 rounded-xl bg-${wf.color}-500/20 border border-${wf.color}-500/30 flex items-center justify-center text-${wf.color}-500`}>
                <GitBranch size={24} />
              </div>
              <div className="flex gap-2">
                 <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    wf.status === 'active' ? 'bg-green-500/20 text-green-400' : 
                    wf.status === 'draft' ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-500/20 text-gray-400'
                 }`}>
                    {wf.status}
                 </div>
                 <button className="text-gray-500 hover:text-white"><MoreVertical size={18} /></button>
              </div>
            </div>

            <h3 className="text-xl font-bold mb-2">{wf.name}</h3>
            <p className="text-sm text-gray-400 mb-6 line-clamp-2">{wf.desc}</p>

            <div className="space-y-4 mb-8">
               <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-500 flex items-center gap-1"><Layers size={14} /> Nodes</span>
                  <span className="font-bold">{wf.nodes} steps</span>
               </div>
               <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-500 flex items-center gap-1"><CheckCircle2 size={14} /> Success Rate</span>
                  <span className={`font-bold ${wf.success >= 90 ? 'text-green-500' : 'text-yellow-500'}`}>{wf.success}%</span>
               </div>
            </div>

            <div className="mt-auto flex gap-3 pt-4 border-t border-white/5">
               <button className="flex-1 py-2 text-sm font-bold text-gray-400 hover:text-white transition-colors" onClick={() => handleEditWorkflow(wf)}>Edit</button>
               <button className="flex-[2] py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-sm font-bold transition-all flex items-center justify-center gap-2" onClick={() => handleRunWorkflow(wf)}>
                  <Play size={16} fill="currentColor" />
                  Run Now
               </button>
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
};

export default Workflows;