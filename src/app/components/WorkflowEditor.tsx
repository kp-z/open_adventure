import React, { useState, useEffect } from "react";
import { 
  GitBranch, 
  Layout, 
  Clock, 
  Plus, 
  Sparkles, 
  ArrowRight, 
  Play, 
  Save, 
  Trash2, 
  ChevronRight,
  Settings,
  X,
  Database,
  Search,
  Zap,
  Sword,
  Shield,
  ShieldCheck,
  Map as MapIcon,
  Compass,
  UsersRound,
  BrainCircuit,
  MessageSquare,
  AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useMode } from "../contexts/ModeContext";
import { GlassCard, GameCard, ActionButton } from "./ui-shared";

type WorkflowView = "flow" | "kanban" | "gantt";

interface Team {
  id: string;
  name: string;
  members: number;
  color: string;
  icon: any;
}

const mockTeams: Team[] = [
  { id: '1', name: 'Core Infrastructure', members: 3, color: 'blue', icon: Shield },
  { id: '2', name: 'The UI Wizards', members: 2, color: 'purple', icon: Sparkles },
  { id: '3', name: 'Data Insights', members: 2, color: 'orange', icon: BrainCircuit },
];

interface Node {
  id: string;
  name: string;
  type: "trigger" | "action" | "condition";
  status: "todo" | "doing" | "done" | "plan";
  start: number; // For gantt, 0-100%
  duration: number; // For gantt, 0-100%
  connections: string[];
  teamId?: string;
}

const DEFAULT_NODES: Node[] = [
  { id: "1", name: "Trigger: New Issue", type: "trigger", status: "done", start: 0, duration: 20, connections: ["2"], teamId: "1" },
  { id: "2", name: "Analyze Content", type: "action", status: "doing", start: 20, duration: 30, connections: ["3", "4"], teamId: "3" },
  { id: "3", name: "Generate Summary", type: "action", status: "plan", start: 50, duration: 25, connections: ["5"], teamId: "2" },
  { id: "4", name: "Log Error", type: "action", status: "todo", start: 50, duration: 15, connections: [], teamId: "1" },
  { id: "5", name: "Send Notification", type: "action", status: "todo", start: 75, duration: 20, connections: [], teamId: "2" },
];

export const WorkflowEditor = ({ onClose }: { onClose: () => void }) => {
  const { mode } = useMode();
  const [view, setView] = useState<WorkflowView>("flow");
  const [nodes, setNodes] = useState<Node[]>(DEFAULT_NODES);
  const [isGenerating, setIsGenerating] = useState(false);
  const [workflowName, setWorkflowName] = useState("Untitled Quest");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const selectedNode = nodes.find(n => n.id === selectedNodeId);

  const updateNodeTeam = (nodeId: string, teamId: string) => {
    setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, teamId } : n));
  };

  const generateAIWorkflow = () => {
    setIsGenerating(true);
    setTimeout(() => {
      const newNodes: Node[] = [
        { id: "1", name: "Trigger: Daily Schedule", type: "trigger", status: "done", start: 0, duration: 15, connections: ["2"], teamId: "1" },
        { id: "2", name: "Fetch Market Data", type: "action", status: "done", start: 15, duration: 25, connections: ["3"], teamId: "3" },
        { id: "3", name: "Run Risk Analysis", type: "action", status: "doing", start: 40, duration: 30, connections: ["4", "5"], teamId: "3" },
        { id: "4", name: "Buy Asset (Condition Met)", type: "action", status: "plan", start: 70, duration: 20, connections: [], teamId: "1" },
        { id: "5", name: "Send Alert (Condition Failed)", type: "action", status: "plan", start: 70, duration: 15, connections: [], teamId: "2" },
      ];
      setNodes(newNodes);
      setWorkflowName("Market Watcher Quest");
      setIsGenerating(false);
    }, 1500);
  };

  const FlowView = () => (
    <div className="relative h-[500px] w-full bg-black/20 rounded-2xl overflow-hidden p-8 border border-white/5">
      <div className="absolute inset-0 grid grid-cols-12 grid-rows-6 pointer-events-none opacity-5">
        {[...Array(12)].map((_, i) => <div key={`v-${i}`} className="border-r border-white" />)}
        {[...Array(6)].map((_, i) => <div key={`h-${i}`} className="border-b border-white" />)}
      </div>

      <div className="relative z-10 flex flex-wrap gap-12 items-center justify-center h-full">
        {nodes.map((node, idx) => {
          const team = mockTeams.find(t => t.id === node.teamId);
          return (
            <motion.div
              key={node.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.1 }}
              className="flex flex-col items-center gap-4"
              onClick={() => setSelectedNodeId(node.id)}
            >
              <div 
                className={`
                  px-6 py-4 rounded-xl border-2 shadow-xl flex items-center gap-4 min-w-[240px] cursor-pointer transition-all relative
                  ${selectedNodeId === node.id ? (mode === 'adventure' ? 'border-yellow-500 scale-105 shadow-yellow-500/20' : 'border-blue-500 scale-105 shadow-blue-500/20') : 'border-white/10 hover:border-white/30'}
                  ${mode === 'adventure' ? 'bg-[#1a1a2e]' : 'bg-white/5 backdrop-blur-xl'}
                `}
              >
                <div className={`p-2.5 rounded-xl ${node.type === 'trigger' ? 'bg-orange-500/20 text-orange-400' : 'bg-blue-500/20 text-blue-400'}`}>
                   {node.type === 'trigger' ? <Zap size={20} /> : <GitBranch size={20} />}
                </div>
                <div className="flex flex-col flex-1 overflow-hidden">
                  <span className="text-[10px] uppercase font-black opacity-40 tracking-widest">{node.type}</span>
                  <span className="text-sm font-bold truncate text-white">{node.name}</span>
                  
                  {/* Team Assignment Badge */}
                  <div className="mt-2.5 flex items-center gap-2">
                     {team ? (
                       <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-${team.color}-500/10 border border-${team.color}-500/20`}>
                          <team.icon size={10} className={`text-${team.color}-400`} />
                          <span className={`text-[9px] font-black uppercase text-${team.color}-400`}>{team.name}</span>
                       </div>
                     ) : (
                       <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/5 border border-dashed border-white/10">
                          <UsersRound size={10} className="text-gray-500" />
                          <span className="text-[9px] font-black uppercase text-gray-500 tracking-tighter">No Team Assigned</span>
                       </div>
                     )}
                  </div>
                </div>
                {selectedNodeId === node.id && (
                  <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center shadow-lg border-2 border-[#0a0b14]">
                     <ShieldCheck size={14} className="text-white" />
                  </div>
                )}
              </div>
              {idx < nodes.length - 1 && (
                 <motion.div 
                   animate={{ x: [0, 5, 0] }}
                   transition={{ repeat: Infinity, duration: 1.5 }}
                 >
                   <ArrowRight className="text-gray-600" />
                 </motion.div>
              )}
            </motion.div>
          );
        })}
      </div>
      
      <svg className="absolute inset-0 pointer-events-none w-full h-full opacity-20">
         <defs>
           <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
             <stop offset="0%" stopColor={mode === 'adventure' ? '#f59e0b' : '#3b82f6'} stopOpacity="0" />
             <stop offset="50%" stopColor={mode === 'adventure' ? '#f59e0b' : '#3b82f6'} stopOpacity="1" />
             <stop offset="100%" stopColor={mode === 'adventure' ? '#f59e0b' : '#3b82f6'} stopOpacity="0" />
           </linearGradient>
         </defs>
         <path d="M 200 250 L 400 250" stroke="url(#lineGrad)" strokeWidth="2" fill="none" />
         <path d="M 500 250 L 700 250" stroke="url(#lineGrad)" strokeWidth="2" fill="none" />
      </svg>
    </div>
  );

  const KanbanView = () => {
    const columns = ["plan", "todo", "doing", "done"];
    return (
      <div className="grid grid-cols-4 gap-6 h-[500px]">
        {columns.map((col) => (
          <div key={col} className="flex flex-col gap-4">
            <div className="flex items-center justify-between px-2">
              <span className="text-xs font-black uppercase tracking-widest text-gray-400">{col}</span>
              <span className="px-2 py-0.5 rounded-full bg-white/5 text-[10px] font-bold">
                {nodes.filter(n => n.status === col).length}
              </span>
            </div>
            <div className="flex-1 bg-black/20 rounded-xl p-4 border border-white/5 space-y-4">
              {nodes.filter(n => n.status === col).map(node => {
                const team = mockTeams.find(t => t.id === node.teamId);
                return (
                  <div 
                    key={node.id}
                    onClick={() => setSelectedNodeId(node.id)}
                    className={`p-4 rounded-xl border text-sm font-medium transition-all cursor-pointer group relative ${
                      selectedNodeId === node.id ? 'ring-2 ring-white/30 scale-[1.02] border-white/40' : 'border-white/5'
                    } ${
                      mode === 'adventure' 
                      ? 'bg-[#22223b] text-yellow-100 hover:bg-[#2a2a4a]' 
                      : 'bg-white/5 text-white hover:bg-white/10'
                    }`}
                  >
                    <div className="mb-3 font-bold group-hover:text-blue-400 transition-colors">{node.name}</div>
                    {team ? (
                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-${team.color}-500/10 border border-${team.color}-500/20`}>
                         <team.icon size={12} className={`text-${team.color}-400`} />
                         <span className={`text-[10px] font-black uppercase text-${team.color}-400 tracking-tighter`}>{team.name}</span>
                      </div>
                    ) : (
                       <div className="text-[10px] text-gray-500 italic flex items-center gap-2">
                          <AlertCircle size={12} /> Unassigned
                       </div>
                    )}
                  </div>
                );
              })}
              <button className="w-full py-3 rounded-xl border border-dashed border-white/10 text-gray-500 hover:text-white hover:bg-white/5 transition-all text-[10px] font-black uppercase flex items-center justify-center gap-2 tracking-widest">
                <Plus size={14} /> New Node
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const GanttView = () => (
    <div className="bg-black/20 rounded-xl border border-white/5 overflow-hidden h-[500px]">
      <div className="flex h-14 border-b border-white/5 items-center bg-black/40">
         <div className="w-72 px-8 text-xs font-black uppercase tracking-widest text-gray-500 border-r border-white/5 h-full flex items-center">Stage & Alliance</div>
         <div className="flex-1 px-4 text-[10px] font-black uppercase tracking-[0.2em] text-gray-600 flex justify-between h-full items-center">
            <span>0%</span>
            <span>25%</span>
            <span>50%</span>
            <span>75%</span>
            <span>100%</span>
         </div>
      </div>
      <div className="overflow-y-auto max-h-[calc(500px-56px)]">
        {nodes.map(node => {
          const team = mockTeams.find(t => t.id === node.teamId);
          return (
            <div 
              key={node.id} 
              onClick={() => setSelectedNodeId(node.id)}
              className={`flex h-16 border-b border-white/5 items-center transition-all cursor-pointer ${selectedNodeId === node.id ? 'bg-white/[0.08]' : 'hover:bg-white/[0.03]'}`}
            >
               <div className="w-72 px-8 border-r border-white/5 h-full flex flex-col justify-center gap-0.5">
                  <div className="text-sm font-bold truncate text-white">{node.name}</div>
                  {team ? (
                    <div className={`text-[10px] text-${team.color}-400 font-black uppercase tracking-tight flex items-center gap-1`}>
                       <team.icon size={10} /> {team.name}
                    </div>
                  ) : (
                    <div className="text-[10px] text-gray-500 font-bold uppercase italic">Unassigned</div>
                  )}
               </div>
               <div className="flex-1 px-4 relative h-full flex items-center">
                  <div className="absolute inset-0 grid grid-cols-4 pointer-events-none">
                    <div className="border-r border-white/[0.03]" />
                    <div className="border-r border-white/[0.03]" />
                    <div className="border-r border-white/[0.03]" />
                  </div>
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${node.duration}%`, left: `${node.start}%` }}
                    className={`
                      absolute h-8 rounded-lg shadow-xl flex items-center px-3 overflow-hidden group
                      ${mode === 'adventure' ? 'bg-gradient-to-r from-yellow-500 to-orange-600' : 'bg-gradient-to-r from-blue-500 to-indigo-600'}
                    `}
                  >
                     <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                     <span className="text-[10px] font-black uppercase text-white tracking-widest truncate relative z-10">{node.status}</span>
                  </motion.div>
               </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-8 bg-black/80 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className={`
          w-full max-w-6xl h-full max-h-[850px] rounded-3xl overflow-hidden flex flex-col border shadow-2xl relative
          ${mode === 'adventure' ? 'bg-[#0f0f1a] border-yellow-500/20 shadow-yellow-500/5' : 'bg-[#0a0b14] border-white/10 shadow-blue-500/5'}
        `}
      >
        <AnimatePresence>
          {selectedNodeId && (
            <motion.div
              initial={{ x: 400, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 400, opacity: 0 }}
              className={`
                absolute right-0 top-0 bottom-0 w-96 z-20 border-l p-10 shadow-2xl backdrop-blur-3xl flex flex-col
                ${mode === 'adventure' ? 'bg-[#1a1a2e]/98 border-yellow-500/20' : 'bg-[#0f111a]/98 border-white/10'}
              `}
            >
              <div className="flex justify-between items-center mb-10">
                 <div>
                    <h2 className="text-2xl font-black uppercase italic tracking-tighter text-white">Stage Config</h2>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Refining automation logic</p>
                 </div>
                 <button onClick={() => setSelectedNodeId(null)} className="p-2 hover:bg-white/10 rounded-xl transition-colors"><X size={20} /></button>
              </div>

              <div className="space-y-8 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                 <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Identify Stage</label>
                    <input 
                      value={selectedNode?.name || ""}
                      onChange={(e) => setNodes(nodes.map(n => n.id === selectedNodeId ? {...n, name: e.target.value} : n))}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-sm focus:outline-none focus:border-blue-500/50 transition-all text-white font-medium"
                      placeholder="Enter stage name..."
                    />
                 </div>

                 <div className="space-y-4">
                    <div className="flex justify-between items-center">
                       <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Assign Agent Team</label>
                       <button className="text-[9px] font-black uppercase text-blue-400 hover:text-blue-300">Browse Guild Hall</button>
                    </div>
                    <div className="space-y-3">
                       {mockTeams.map(team => (
                         <button
                           key={team.id}
                           onClick={() => updateNodeTeam(selectedNodeId!, team.id)}
                           className={`
                             w-full flex items-center justify-between p-4 rounded-2xl border transition-all group
                             ${selectedNode?.teamId === team.id 
                               ? (mode === 'adventure' ? 'bg-yellow-500/10 border-yellow-500/50 text-yellow-500' : 'bg-blue-600/10 border-blue-600/50 text-blue-400') 
                               : 'bg-white/5 border-white/5 text-gray-400 hover:border-white/20'
                             }
                           `}
                         >
                            <div className="flex items-center gap-4">
                               <div className={`w-10 h-10 rounded-xl bg-${team.color}-500/10 flex items-center justify-center group-hover:scale-110 transition-transform`}>
                                  <team.icon size={18} className={`text-${team.color}-500`} />
                               </div>
                               <div className="flex flex-col items-start">
                                  <span className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">{team.name}</span>
                                  <span className="text-[10px] font-medium opacity-50 tracking-tight">{team.members} Specialized Agents</span>
                               </div>
                            </div>
                            {selectedNode?.teamId === team.id ? (
                               <div className={`w-5 h-5 rounded-full flex items-center justify-center ${mode === 'adventure' ? 'bg-yellow-500' : 'bg-blue-600'} text-white`}>
                                  <ShieldCheck size={12} />
                               </div>
                            ) : (
                               <div className="w-5 h-5 rounded-full border border-white/10 group-hover:border-white/30" />
                            )}
                         </button>
                       ))}
                    </div>
                 </div>

                 <div className="space-y-4 pt-6 border-t border-white/5">
                    <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Task Type</label>
                    <div className="grid grid-cols-2 gap-3">
                       {["Sequential", "Parallel", "Recursive", "Polling"].map(t => (
                         <button key={t} className="p-3 rounded-xl bg-white/5 border border-white/5 text-[10px] font-black uppercase tracking-tighter hover:bg-white/10 transition-all text-center">
                            {t}
                         </button>
                       ))}
                    </div>
                 </div>
              </div>

              <div className="mt-10 space-y-4">
                 <button className="w-full py-4 rounded-2xl bg-white/5 text-[10px] font-black uppercase tracking-[0.2em] border border-white/10 hover:bg-white/10 transition-all text-gray-400 hover:text-white">Run Sandbox Test</button>
                 <button onClick={() => setSelectedNodeId(null)} className={`w-full py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-white shadow-2xl transition-all active:scale-95 ${mode === 'adventure' ? 'bg-gradient-to-r from-yellow-600 to-orange-600 hover:shadow-yellow-500/20' : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:shadow-blue-500/20'}`}>Commit Configuration</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <header className={`px-10 py-8 flex items-center justify-between border-b ${mode === 'adventure' ? 'border-yellow-500/20 bg-white/[0.01]' : 'border-white/5 bg-white/[0.02]'}`}>
          <div className="flex items-center gap-10">
             <div className="flex flex-col">
                <input 
                  value={workflowName}
                  onChange={(e) => setWorkflowName(e.target.value)}
                  className={`text-3xl font-black bg-transparent border-none outline-none focus:ring-0 p-0 ${mode === 'adventure' ? 'text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 italic uppercase' : 'text-white'}`}
                />
                <div className="flex items-center gap-4 mt-2">
                   <span className="text-[9px] text-gray-500 font-black uppercase tracking-[0.2em] flex items-center gap-2">
                      <Compass size={12} className="text-blue-500" /> {nodes.length} Active Nodes
                   </span>
                   <div className="w-1 h-1 rounded-full bg-white/10" />
                   <span className="text-[9px] text-gray-500 font-black uppercase tracking-[0.2em]">Revision v1.4</span>
                </div>
             </div>
             
             <div className="flex bg-black/40 p-1 rounded-2xl border border-white/5">
                {(['flow', 'kanban', 'gantt'] as WorkflowView[]).map((v) => (
                  <button
                    key={v}
                    onClick={() => setView(v)}
                    className={`
                      px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 tracking-widest
                      ${view === v 
                        ? (mode === 'adventure' ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/20' : 'bg-blue-600 text-white shadow-lg shadow-blue-500/20') 
                        : 'text-gray-500 hover:text-white hover:bg-white/5'
                      }
                    `}
                  >
                    {v === 'flow' && <GitBranch size={14} />}
                    {v === 'kanban' && <Layout size={14} />}
                    {v === 'gantt' && <Clock size={14} />}
                    {v}
                  </button>
                ))}
             </div>
          </div>

          <div className="flex items-center gap-4">
             <button 
               onClick={generateAIWorkflow}
               disabled={isGenerating}
               className={`
                 px-8 py-3 rounded-2xl flex items-center gap-3 font-black uppercase text-[10px] tracking-[0.1em] transition-all relative overflow-hidden group shadow-xl
                 ${mode === 'adventure' ? 'bg-red-600 text-white hover:bg-red-500' : 'bg-purple-600 text-white hover:bg-purple-500'}
                 ${isGenerating ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'}
               `}
             >
                {isGenerating ? (
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                    <Sparkles size={16} />
                  </motion.div>
                ) : <Sparkles size={16} className="group-hover:scale-125 transition-transform" />}
                {isGenerating ? 'Synthesizing...' : 'AI Orchestrate'}
                <motion.div 
                   animate={{ x: ['-100%', '200%'] }} 
                   transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                   className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12" 
                />
             </button>
             
             <div className="h-10 w-[1px] bg-white/5 mx-4" />
             
             <button className="p-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl text-gray-400 hover:text-white transition-all"><Save size={20} /></button>
             <button className="p-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl text-gray-400 hover:text-white transition-all"><Settings size={20} /></button>
             <button onClick={onClose} className="p-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl text-gray-400 hover:text-red-500 transition-all"><X size={20} /></button>
          </div>
        </header>

        <main className="flex-1 p-10 overflow-hidden relative">
          <AnimatePresence mode="wait">
             <motion.div
               key={view}
               initial={{ opacity: 0, scale: 0.98 }}
               animate={{ opacity: 1, scale: 1 }}
               exit={{ opacity: 0, scale: 0.98 }}
               transition={{ duration: 0.4, ease: "easeOut" }}
               className="h-full"
             >
                {view === 'flow' && <FlowView />}
                {view === 'kanban' && <KanbanView />}
                {view === 'gantt' && <GanttView />}
             </motion.div>
          </AnimatePresence>
        </main>

        <footer className={`px-10 py-8 border-t ${mode === 'adventure' ? 'border-yellow-500/20 bg-black/60' : 'border-white/5 bg-black/40'} flex items-center justify-between backdrop-blur-xl`}>
           <div className="flex gap-6">
              <button className={`flex items-center gap-3 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'adventure' ? 'bg-white/5 text-yellow-500 border border-yellow-500/20 hover:bg-yellow-500/10' : 'bg-white/5 text-blue-400 border border-blue-500/20 hover:bg-blue-600/10'}`}>
                 <Plus size={18} /> Add Logic Node
              </button>
              <button className="flex items-center gap-3 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest bg-white/5 text-gray-400 border border-white/5 hover:bg-white/10 transition-all">
                 <Database size={18} /> Global Variables
              </button>
           </div>
           
           <div className="flex gap-4">
              <button onClick={onClose} className="px-8 py-3 rounded-2xl border border-white/10 text-[10px] font-black uppercase tracking-[0.2em] hover:bg-white/5 transition-all text-gray-500">Discard Changes</button>
              <button className={`px-10 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-white shadow-2xl transition-all active:scale-95 flex items-center gap-3 ${mode === 'adventure' ? 'bg-gradient-to-r from-red-600 to-orange-600 shadow-red-600/20' : 'bg-gradient-to-r from-green-600 to-emerald-600 shadow-green-600/20'}`}>
                 <Play size={18} fill="currentColor" />
                 Launch Pipeline
              </button>
           </div>
        </footer>
      </motion.div>
    </div>
  );
};
