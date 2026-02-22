import React, { useState, useEffect, useRef } from "react";
import {
  GitBranch,
  Layout,
  Clock,
  Plus,
  Sparkles,
  ArrowRight,
  Play,
  Save,
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
  AlertCircle,
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
  { id: "1", name: "Core Infrastructure", members: 3, color: "blue", icon: Shield },
  { id: "2", name: "The UI Wizards", members: 2, color: "purple", icon: Sparkles },
  { id: "3", name: "Data Insights", members: 2, color: "orange", icon: BrainCircuit },
];

interface Node {
  id: string;
  name: string;
  type: "trigger" | "action" | "condition";
  status: "todo" | "doing" | "done" | "plan";
  start: number;
  duration: number;
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

  const containerRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [connections, setConnections] = useState<{from: {x:number, y:number}, to: {x:number, y:number}}[]>([]);

  useEffect(() => {
    const update = () => {
      if (!containerRef.current || view !== "flow") return;
      const rect = containerRef.current.getBoundingClientRect();
      const newConns: any[] = [];
      nodes.forEach(n => {
        n.connections.forEach(tid => {
          const f = nodeRefs.current[n.id], t = nodeRefs.current[tid];
          if (f && t) {
            const fr = f.getBoundingClientRect(), tr = t.getBoundingClientRect();
            newConns.push({
              from: { x: fr.right - rect.left, y: fr.top + fr.height/2 - rect.top },
              to: { x: tr.left - rect.left, y: tr.top + tr.height/2 - rect.top }
            });
          }
        });
      });
      setConnections(newConns);
    };
    const t = setTimeout(update, 100);
    window.addEventListener("resize", update);
    return () => { window.removeEventListener("resize", update); clearTimeout(t); };
  }, [nodes, view, selectedNodeId, mode]);

  const selectedNode = nodes.find(n => n.id === selectedNodeId);

  const FlowView = () => (
    <div ref={containerRef} className="relative h-[500px] w-full bg-black/20 rounded-2xl overflow-hidden p-8 border border-white/5">
      <svg className="absolute inset-0 pointer-events-none w-full h-full">
        <defs>
          <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={mode === "adventure" ? "#f59e0b" : "#3b82f6"} stopOpacity="0" />
            <stop offset="50%" stopColor={mode === "adventure" ? "#f59e0b" : "#3b82f6"} stopOpacity="0.4" />
            <stop offset="100%" stopColor={mode === "adventure" ? "#f59e0b" : "#3b82f6"} stopOpacity="0" />
          </linearGradient>
          <marker id="arrow" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orientation="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill={mode === "adventure" ? "#f59e0b" : "#3b82f6"} fillOpacity="0.3" />
          </marker>
        </defs>
        {connections.map((c, i) => (
          <path key={i} d={`M ${c.from.x} ${c.from.y} C ${c.from.x + (c.to.x-c.from.x)/2} ${c.from.y}, ${c.from.x + (c.to.x-c.from.x)/2} ${c.to.y}, ${c.to.x} ${c.to.y}`} stroke="url(#lineGrad)" strokeWidth="2" fill="none" markerEnd="url(#arrow)" className="opacity-50" />
        ))}
      </svg>
      <div className="relative z-10 flex flex-wrap gap-12 items-center justify-center h-full">
        {nodes.map((node, idx) => {
          const team = mockTeams.find(t => t.id === node.teamId);
          return (
            <motion.div key={node.id} ref={el => nodeRefs.current[node.id] = el} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-4" onClick={() => setSelectedNodeId(node.id)}>
              <div className={`px-6 py-4 rounded-xl border-2 shadow-xl flex items-center gap-4 min-w-[240px] cursor-pointer transition-all relative ${selectedNodeId === node.id ? (mode === "adventure" ? "border-yellow-500 scale-105 shadow-yellow-500/20" : "border-blue-500 scale-105 shadow-blue-500/20") : "border-white/10 hover:border-white/30"} ${mode === "adventure" ? "bg-[#1a1a2e]" : "bg-white/5 backdrop-blur-xl"}`}>
                <div className={`p-2.5 rounded-xl ${node.type === "trigger" ? "bg-orange-500/20 text-orange-400" : "bg-blue-500/20 text-blue-400"}`}>
                  {node.type === "trigger" ? <Zap size={20} /> : <GitBranch size={20} />}
                </div>
                <div className="flex flex-col flex-1 overflow-hidden">
                  <span className="text-[10px] uppercase font-black opacity-40">{node.type}</span>
                  <span className="text-sm font-bold truncate text-white">{node.name}</span>
                  <div className="mt-2.5 flex items-center gap-2">
                    {team ? (
                      <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-${team.color}-500/10 border border-${team.color}-500/20 text-[9px] font-black uppercase text-${team.color}-400`}>
                        <team.icon size={10} /> {team.name}
                      </div>
                    ) : <span className="text-[9px] font-black text-gray-500 italic">No Team</span>}
                  </div>
                </div>
                {selectedNodeId === node.id && <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center border-2 border-[#0a0b14]"><ShieldCheck size={14} className="text-white" /></div>}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-8 bg-black/80 backdrop-blur-md">
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} className={`w-full max-w-6xl h-full max-h-[850px] rounded-3xl overflow-hidden flex flex-col border shadow-2xl relative ${mode === "adventure" ? "bg-[#0f0f1a] border-yellow-500/20 shadow-yellow-500/5" : "bg-[#0a0b14] border-white/10 shadow-blue-500/5"}`}>
        <AnimatePresence>
          {selectedNodeId && (
            <motion.div initial={{ x: 400, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 400, opacity: 0 }} className={`absolute right-0 top-0 bottom-0 w-96 z-20 border-l p-10 shadow-2xl backdrop-blur-3xl flex flex-col ${mode === "adventure" ? "bg-[#1a1a2e]/98 border-yellow-500/20" : "bg-[#0f111a]/98 border-white/10"}`}>
              <div className="flex justify-between items-center mb-10 text-white">
                <h2 className="text-2xl font-black uppercase italic italic tracking-tighter">Stage Config</h2>
                <button onClick={() => setSelectedNodeId(null)} className="p-2 hover:bg-white/10 rounded-xl"><X size={20} /></button>
              </div>
              <div className="space-y-8 flex-1 overflow-y-auto">
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase text-gray-500">Stage Name</label>
                  <input value={selectedNode?.name || ""} onChange={e => setNodes(nodes.map(n => n.id === selectedNodeId ? { ...n, name: e.target.value } : n))} className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-white focus:outline-none focus:border-blue-500/50" />
                </div>
                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase text-gray-500">Agent Team</label>
                  <div className="space-y-3">
                    {mockTeams.map(t => (
                      <button key={t.id} onClick={() => setNodes(nodes.map(n => n.id === selectedNodeId ? { ...n, teamId: t.id } : n))} className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${selectedNode?.teamId === t.id ? (mode === "adventure" ? "bg-yellow-500/10 border-yellow-500/50 text-yellow-500" : "bg-blue-600/10 border-blue-600/50 text-blue-400") : "bg-white/5 border-white/5 text-gray-400 hover:border-white/20"}`}>
                        <div className="flex items-center gap-4 text-left">
                          <t.icon size={18} className={`text-${t.color}-500`} />
                          <div><p className="text-sm font-bold text-white">{t.name}</p><p className="text-[10px] opacity-50">{t.members} Agents</p></div>
                        </div>
                        {selectedNode?.teamId === t.id && <ShieldCheck size={16} />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <button onClick={() => setSelectedNodeId(null)} className={`mt-8 w-full py-4 rounded-2xl font-black uppercase text-white shadow-2xl ${mode === "adventure" ? "bg-gradient-to-r from-yellow-600 to-orange-600" : "bg-gradient-to-r from-blue-600 to-indigo-600"}`}>Commit Config</button>
            </motion.div>
          )}
        </AnimatePresence>

        <header className={`px-10 py-8 flex items-center justify-between border-b ${mode === "adventure" ? "border-yellow-500/20" : "border-white/5"}`}>
          <div className="flex items-center gap-10">
            <div className="flex flex-col">
              <input value={workflowName} onChange={e => setWorkflowName(e.target.value)} className={`text-3xl font-black bg-transparent border-none outline-none focus:ring-0 p-0 ${mode === "adventure" ? "text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 italic uppercase" : "text-white"}`} />
              <div className="flex items-center gap-4 mt-2 text-[9px] text-gray-500 font-black uppercase tracking-[0.2em]"><Compass size={12} className="text-blue-500" /> {nodes.length} Active Nodes</div>
            </div>
            <div className="flex bg-black/40 p-1 rounded-2xl border border-white/5">
              {["flow", "kanban"].map(v => (
                <button key={v} onClick={() => setView(v as WorkflowView)} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 ${view === v ? (mode === "adventure" ? "bg-yellow-500 text-black shadow-lg" : "bg-blue-600 text-white shadow-lg") : "text-gray-500 hover:text-white hover:bg-white/5"}`}>{v === "flow" ? <GitBranch size={14} /> : <Layout size={14} />} {v}</button>
              ))}
            </div>
          </div>
          <button onClick={() => setIsGenerating(true)} disabled={isGenerating} className={`px-8 py-3 rounded-2xl flex items-center gap-3 font-black uppercase text-[10px] transition-all relative overflow-hidden group shadow-xl ${mode === "adventure" ? "bg-red-600 text-white" : "bg-purple-600 text-white"} ${isGenerating ? "opacity-50" : "active:scale-95"}`}>{isGenerating ? "Synthesizing..." : "AI Orchestrate"}<Sparkles size={16} /></button>
          <button onClick={onClose} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-gray-400 hover:text-red-500 transition-all"><X size={20} /></button>
        </header>

        <main className="flex-1 p-10 overflow-hidden relative">
          <AnimatePresence mode="wait">
            <motion.div key={view} initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} className="h-full">
              {view === "flow" && <FlowView />}
              {view === "kanban" && <div className="grid grid-cols-4 gap-6 h-full">{(["plan", "todo", "doing", "done"] as const).map(c => <div key={c} className="flex flex-col gap-4"><div className="flex justify-between px-2 text-xs font-black uppercase text-gray-400">{c}<span>{nodes.filter(n => n.status === c).length}</span></div><div className="flex-1 bg-black/20 rounded-xl p-4 border border-white/5 space-y-4 overflow-y-auto">{nodes.filter(n => n.status === c).map(node => <div key={node.id} onClick={() => setSelectedNodeId(node.id)} className={`p-4 rounded-xl border text-sm font-medium transition-all cursor-pointer ${selectedNodeId === node.id ? "ring-2 ring-white/30 border-white/40" : "border-white/5"} ${mode === "adventure" ? "bg-[#22223b] text-yellow-100" : "bg-white/5 text-white hover:bg-white/10"}`}>{node.name}</div>)}</div></div>)}</div>}
            </motion.div>
          </AnimatePresence>
        </main>

        <footer className={`px-10 py-8 border-t ${mode === "adventure" ? "border-yellow-500/20 bg-black/60" : "border-white/5 bg-black/40"} flex items-center justify-between backdrop-blur-xl`}>
          <button className={`flex items-center gap-3 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest ${mode === "adventure" ? "bg-white/5 text-yellow-500 border border-yellow-500/20" : "bg-white/5 text-blue-400 border border-blue-500/20"}`}><Plus size={18} /> New Logic Node</button>
          <div className="flex gap-4">
            <button onClick={onClose} className="px-8 py-3 rounded-2xl border border-white/10 text-[10px] font-black uppercase text-gray-500">Discard</button>
            <button className={`px-10 py-3 rounded-2xl text-[10px] font-black uppercase text-white shadow-2xl flex items-center gap-3 ${mode === "adventure" ? "bg-gradient-to-r from-red-600 to-orange-600" : "bg-gradient-to-r from-green-600 to-emerald-600"}`}><Play size={18} fill="currentColor" /> Launch Pipeline</button>
          </div>
        </footer>
      </motion.div>
    </div>
  );
};
