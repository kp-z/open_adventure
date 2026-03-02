import { motion } from 'motion/react';
import { Crown, Users, Plus, Zap, CheckCircle2, Clock, Edit2, Trash2, Star } from 'lucide-react';
import * as Icons from 'lucide-react';
import { Agent } from '../data/agents';
import { AgentRole } from '../contexts/TeamsContext';

interface TeamRosterSectionProps {
  roles: AgentRole[];
  agents: Agent[];
  onAddAgent: () => void;
  onRemoveRole: (agentId: string) => void;
  onEditRole: (agentId: string) => void;
}

export function TeamRosterSection({
  roles,
  agents,
  onAddAgent,
  onRemoveRole,
  onEditRole,
}: TeamRosterSectionProps) {
  const MAX_TEAM_SIZE = 6; // 1 Leader + 5 Members

  // Get icon component from icon name
  const getIconComponent = (iconName: string) => {
    const IconComponent = (Icons as any)[iconName];
    return IconComponent || Icons.Users;
  };

  // Separate leader and teammates
  const leaderRole = roles[0];
  const leaderAgent = leaderRole ? agents.find(a => a.id === leaderRole.agentId) : null;
  const teammateRoles = roles.slice(1);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <Users size={20} className="text-green-400" />
        <h3 className="font-bold text-lg">Team</h3>
        <span className="px-2.5 py-0.5 bg-green-500/20 rounded-full text-xs font-black text-green-400">
          {roles.length} / {MAX_TEAM_SIZE}
        </span>
      </div>

      {/* Main Layout: Leader (Left) + Members (Right Grid) */}
      <div className="grid grid-cols-[auto_1fr] gap-4">
        {/* Leader Section - Left */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Crown size={14} className="text-yellow-400" />
            <span className="text-xs font-bold text-yellow-400 uppercase tracking-wide">Leader</span>
          </div>
          
          {!leaderAgent ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={onAddAgent}
              className="cursor-pointer"
            >
              <div className="w-36 h-36 rounded-xl border-2 border-dashed border-yellow-500/40 bg-gradient-to-br from-yellow-500/10 to-orange-500/5 flex flex-col items-center justify-center gap-2 hover:border-yellow-500/60 hover:shadow-[0_4px_20px_rgb(234,179,8,0.15)] transition-all">
                <Crown size={28} className="text-yellow-500/40" />
                <div className="text-center">
                  <p className="text-yellow-400/80 font-bold text-xs">Leader</p>
                  <p className="text-gray-500 text-[10px]">Click to Add</p>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, x: -20 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              className="group relative"
            >
              <div
                className="w-36 h-36 rounded-xl p-3 flex flex-col items-center justify-center gap-2 relative overflow-hidden transition-all duration-300 group-hover:scale-[1.02] group-hover:shadow-2xl"
                style={{
                  background: `linear-gradient(135deg, ${leaderAgent.color}30, ${leaderAgent.color}15, transparent)`,
                  border: `2px solid ${leaderAgent.color}60`,
                  boxShadow: `0 8px 32px ${leaderAgent.color}30, inset 0 1px 0 rgba(255,255,255,0.1)`,
                }}
              >
                {/* Background Glow */}
                <div 
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{
                    background: `radial-gradient(circle at 50% 30%, ${leaderAgent.color}35, transparent 70%)`,
                  }}
                />

                {/* Leader Crown Badge */}
                <div className="absolute -top-2 -left-2 w-6 h-6 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg z-10">
                  <Crown size={12} className="text-black" />
                </div>

                {/* Agent Icon */}
                <div
                  className="relative w-14 h-14 rounded-lg flex items-center justify-center shadow-lg group-hover:shadow-2xl transition-all duration-300"
                  style={{
                    backgroundColor: `${leaderAgent.color}25`,
                    border: `2px solid ${leaderAgent.color}`,
                    boxShadow: `0 4px 20px ${leaderAgent.color}50`,
                  }}
                >
                  {(() => {
                    const LeaderIcon = getIconComponent(leaderAgent.icon);
                    return <LeaderIcon size={28} style={{ color: leaderAgent.color }} />;
                  })()}
                  <div 
                    className="absolute inset-0 rounded-lg opacity-40 blur-xl"
                    style={{ backgroundColor: leaderAgent.color }}
                  />
                </div>

                {/* Agent Name */}
                <h5 className="font-bold text-xs text-center truncate w-full px-1 relative z-10">{leaderAgent.name}</h5>
                
                {/* Leader Badge */}
                <span 
                  className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider"
                  style={{ 
                    backgroundColor: leaderAgent.color,
                    color: '#000',
                    boxShadow: `0 2px 8px ${leaderAgent.color}60`,
                  }}
                >
                  Leader
                </span>
                
                {/* Mini Stats */}
                <div className="flex items-center justify-center gap-1.5 text-[9px] text-gray-400 relative z-10">
                  <div className="flex items-center gap-0.5">
                    <Zap size={8} className="text-yellow-400" />
                    <span className="font-bold text-white">{leaderAgent.skills.length}</span>
                  </div>
                  <div className="flex items-center gap-0.5">
                    <CheckCircle2 size={8} className="text-green-400" />
                    <span className="font-bold text-white">{leaderAgent.stats.successCount}</span>
                  </div>
                </div>

                {/* Hover Actions Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 rounded-xl flex items-end justify-center p-2 z-20">
                  <div className="flex gap-1.5 w-full">
                    <button
                      onClick={() => onEditRole(leaderAgent.id)}
                      className="flex-1 py-1.5 text-[10px] font-bold bg-blue-500/90 hover:bg-blue-500 text-white rounded-lg transition-all flex items-center justify-center gap-1 shadow-lg"
                    >
                      <Edit2 size={10} />
                      Edit
                    </button>
                    <button
                      onClick={() => onRemoveRole(leaderAgent.id)}
                      className="flex-1 py-1.5 text-[10px] font-bold bg-red-500/90 hover:bg-red-500 text-white rounded-lg transition-all flex items-center justify-center gap-1 shadow-lg"
                    >
                      <Trash2 size={10} />
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Teammates Section - Right Grid */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Users size={14} className="text-blue-400" />
            <span className="text-xs font-bold text-blue-400 uppercase tracking-wide">Members</span>
            <span className="text-[10px] text-gray-500">({teammateRoles.length} / 5)</span>
          </div>
          
          <div className="grid grid-cols-3 gap-3">
            {Array.from({ length: 5 }).map((_, index) => {
              const role = teammateRoles[index];
              const agent = role ? agents.find(a => a.id === role.agentId) : null;
              const slotNumber = index + 2; // Start from 2 since leader is 1

              if (!agent) {
                return (
                  <motion.div
                    key={`slot-${slotNumber}`}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={onAddAgent}
                    className="cursor-pointer"
                  >
                    <div className="aspect-square rounded-lg border-2 border-dashed border-white/20 bg-gradient-to-br from-white/5 to-white/10 flex flex-col items-center justify-center gap-1.5 hover:border-white/30 hover:shadow-[0_4px_20px_rgba(255,255,255,0.05)] transition-all">
                      <Plus size={20} className="text-white/30" />
                      <div className="text-center">
                        <p className="text-gray-500 font-bold text-[10px]">Add</p>
                        <p className="text-gray-600 text-[9px]">Member</p>
                      </div>
                    </div>
                  </motion.div>
                );
              }

              const AgentIcon = getIconComponent(agent.icon);

              return (
                <motion.div
                  key={`agent-${agent.id}`}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05, type: 'spring', stiffness: 200, damping: 15 }}
                  className="group relative"
                >
                  <div
                    className="aspect-square rounded-lg p-2.5 flex flex-col items-center justify-center gap-1.5 relative overflow-hidden transition-all duration-300 group-hover:scale-[1.02] group-hover:shadow-xl"
                    style={{
                      background: `linear-gradient(135deg, ${agent.color}20, transparent)`,
                      border: `2px solid ${agent.color}40`,
                      boxShadow: `0 4px 16px ${agent.color}20`,
                    }}
                  >
                    {/* Background Glow */}
                    <div 
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                      style={{
                        background: `radial-gradient(circle at 50% 50%, ${agent.color}25, transparent 70%)`,
                      }}
                    />

                    {/* Agent Icon */}
                    <div
                      className="relative w-12 h-12 rounded-md flex items-center justify-center shadow-md group-hover:shadow-lg transition-all duration-300"
                      style={{
                        backgroundColor: `${agent.color}20`,
                        border: `1.5px solid ${agent.color}`,
                        boxShadow: `0 2px 12px ${agent.color}30`,
                      }}
                    >
                      <AgentIcon size={22} style={{ color: agent.color }} />
                    </div>

                    {/* Agent Name */}
                    <h5 className="font-bold text-[10px] text-center truncate w-full px-1 relative z-10">{agent.name}</h5>
                    
                    {/* Role Badge */}
                    {role && (
                      <span 
                        className="inline-block px-1.5 py-0.5 rounded text-[7px] font-bold uppercase tracking-wider"
                        style={{ 
                          backgroundColor: `${agent.color}50`,
                          color: agent.color,
                        }}
                      >
                        {role.role}
                      </span>
                    )}
                    
                    {/* Mini Stats - Compact */}
                    <div className="flex items-center gap-1.5 text-[8px] text-gray-400 relative z-10">
                      <div className="flex items-center gap-0.5">
                        <Zap size={7} className="text-yellow-400" />
                        <span className="font-bold text-white">{agent.skills.length}</span>
                      </div>
                      <div className="flex items-center gap-0.5">
                        <CheckCircle2 size={7} className="text-green-400" />
                        <span className="font-bold text-white">{agent.stats.successCount}</span>
                      </div>
                    </div>

                    {/* Hover Actions Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 rounded-lg flex items-end justify-center p-1.5 z-20">
                      <div className="flex gap-1 w-full">
                        <button
                          onClick={() => onEditRole(agent.id)}
                          className="flex-1 py-1 text-[9px] font-bold bg-blue-500/90 hover:bg-blue-500 text-white rounded-md transition-all flex items-center justify-center gap-0.5 shadow-lg"
                          title="Edit Role"
                        >
                          <Edit2 size={9} />
                          Edit
                        </button>
                        <button
                          onClick={() => onRemoveRole(agent.id)}
                          className="flex-1 py-1 text-[9px] font-bold bg-red-500/90 hover:bg-red-500 text-white rounded-md transition-all flex items-center justify-center gap-0.5 shadow-lg"
                          title="Remove"
                        >
                          <Trash2 size={9} />
                          Del
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}