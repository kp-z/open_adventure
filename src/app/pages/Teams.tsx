import React, { useState } from 'react';
import {
  UsersRound,
  Shield,
  Sword,
  Zap,
  Star,
  Plus,
  MoreVertical,
  BrainCircuit,
  MessageSquare,
  Crown,
  Network,
  Settings,
  Trash2,
  Edit,
  ChevronDown,
  Play,
} from 'lucide-react';
import * as Icons from 'lucide-react';
import { useAppContext } from '../contexts/AppContext';
import { useTeams } from '../contexts/TeamsContext';
import { useAgents } from '../contexts/AgentsContext';
import { GlassCard, GameCard, ActionButton } from '../components/ui-shared';
import { TeamCreator } from '../components/TeamCreator';
import { TeamRunner } from '../components/TeamRunner';
import { motion, AnimatePresence } from 'motion/react';

type ViewType = 'list' | 'create' | 'run';

const Teams = () => {
  const { mode } = useAppContext();
  const { teams, deleteTeam } = useTeams();
  const { agents } = useAgents();
  const [view, setView] = useState<ViewType>('list');
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState<string | null>(null);

  // Get icon component
  const getIconComponent = (iconName: string) => {
    const IconComponent = (Icons as any)[iconName];
    return IconComponent || Icons.Users;
  };

  // Handle actions
  const handleAction = (action: string, teamId: string) => {
    setShowDropdown(null);
    setSelectedTeam(teamId);

    switch (action) {
      case 'edit':
        setView('create');
        break;
      case 'delete':
        if (confirm('Are you sure you want to delete this team?')) {
          deleteTeam(teamId);
        }
        break;
      case 'run':
        setView('run');
        break;
    }
  };

  // Get team members
  const getTeamMembers = (teamId: string) => {
    const team = teams.find(t => t.id === teamId);
    if (!team) return [];
    return team.roles.map(role => agents.find(a => a.id === role.agentId)).filter(Boolean) as any[];
  };
  
  const getTeamLeader = (teamId: string) => {
    const team = teams.find(t => t.id === teamId);
    if (!team) return null;
    const leaderRole = team.roles.find(r => r.role === 'leader');
    if (!leaderRole) return null;
    return agents.find(a => a.id === leaderRole.agentId);
  };

  // Views
  if (view === 'create') {
    return (
      <TeamCreator
        teamId={selectedTeam}
        onBack={() => {
          setView('list');
          setSelectedTeam(null);
        }}
      />
    );
  }

  if (view === 'run') {
    return (
      <TeamRunner
        teamId={selectedTeam}
        onBack={() => {
          setView('list');
          setSelectedTeam(null);
        }}
      />
    );
  }

  if (mode === 'adventure') {
    return (
      <div className="space-y-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-4xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-600 uppercase">
              Guild Hall: Alliances
            </h1>
            <p className="text-gray-400 font-medium">Form elite squads of heroes to tackle impossible raids.</p>
          </div>
          <ActionButton
            onClick={() => {
              setSelectedTeam(null);
              setView('create');
            }}
          >
            Forge Alliance
          </ActionButton>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <AnimatePresence mode="popLayout">
            {teams.map((team, idx) => {
              const TeamIcon = getIconComponent(team.icon);
              const teamMembers = getTeamMembers(team.id);
              const leader = getTeamLeader(team.id);

              return (
                <motion.div
                  key={team.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: idx * 0.1 }}
                  layout
                >
                  <GameCard rarity="epic" className="p-0 overflow-hidden h-full flex flex-col">
                    <div className="h-32 bg-black/40 relative flex items-center justify-center">
                      <div
                        className="absolute inset-0 opacity-30"
                        style={{
                          background: `linear-gradient(to bottom right, ${team.color}, transparent)`,
                        }}
                      />
                      <TeamIcon size={48} style={{ color: team.color }} className="drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]" />
                    </div>
                    <div className="p-6 flex-1 flex flex-col">
                      <h3 className="text-xl font-black uppercase italic text-white mb-2">{team.name}</h3>
                      <p className="text-xs text-gray-400 italic mb-6">"{team.description}"</p>

                      <div className="flex justify-between items-center mb-6">
                        <div className="flex -space-x-2">
                          {teamMembers.slice(0, 4).map((agent) => {
                            const AgentIcon = getIconComponent(agent.icon);
                            return (
                              <div
                                key={agent.id}
                                className="w-8 h-8 rounded-full border-2 border-[#1a1a2e] flex items-center justify-center"
                                style={{
                                  backgroundColor: `${agent.color}20`,
                                }}
                              >
                                <AgentIcon size={14} style={{ color: agent.color }} />
                              </div>
                            );
                          })}
                          {teamMembers.length > 4 && (
                            <div className="w-8 h-8 rounded-full border-2 border-[#1a1a2e] bg-gray-800 flex items-center justify-center">
                              <span className="text-xs font-bold text-gray-400">+{teamMembers.length - 4}</span>
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-black uppercase text-yellow-500">Success Rate</p>
                          <p className="text-lg font-black text-white">
                            {team.stats.totalExecutions > 0 
                              ? Math.round((team.stats.successfulExecutions / team.stats.totalExecutions) * 100)
                              : 0}%
                          </p>
                        </div>
                      </div>

                      {leader && (
                        <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                          <div className="flex items-center gap-2 text-xs">
                            <Crown size={14} className="text-yellow-500" />
                            <span className="text-gray-400">Leader:</span>
                            <span className="font-bold text-yellow-400">{leader.name}</span>
                          </div>
                        </div>
                      )}

                      <div className="mt-auto pt-4 border-t border-white/5">
                        <ActionButton
                          variant="secondary"
                          className="w-full text-xs font-black uppercase"
                          onClick={() => {
                            setSelectedTeam(team.id);
                            setView('create');
                          }}
                        >
                          Review Formation
                        </ActionButton>
                        <ActionButton
                          variant="secondary"
                          className="w-full text-xs font-black uppercase"
                          onClick={() => {
                            setSelectedTeam(team.id);
                            setView('run');
                          }}
                        >
                          Deploy Team
                        </ActionButton>
                      </div>
                    </div>
                  </GameCard>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight uppercase">AGENT TEAMS</h1>
          <p className="text-gray-400">Manage collaborative groups of AI agents for complex tasks.</p>
        </div>
        <div className="flex gap-3">
          <ActionButton
            onClick={() => {
              setSelectedTeam(null);
              setView('create');
            }}
          >
            <Plus size={20} />
            Create Team
          </ActionButton>
        </div>
      </header>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Teams', value: teams.length, icon: UsersRound, color: 'blue' },
          { label: 'Active Teams', value: teams.filter(t => t.status === 'active').length, icon: Zap, color: 'green' },
          {
            label: 'Total Tasks',
            value: teams.reduce((sum, t) => sum + t.stats.totalExecutions, 0),
            icon: Star,
            color: 'purple',
          },
          {
            label: 'Avg Success Rate',
            value: teams.length > 0 ? `${Math.round(
              (teams.reduce((sum, t) => sum + t.stats.successfulExecutions, 0) /
                Math.max(1, teams.reduce((sum, t) => sum + t.stats.totalExecutions, 0))) *
                100
            )}%` : '0%',
            icon: Shield,
            color: 'orange',
          },
        ].map((stat) => (
          <GlassCard key={stat.label} className="p-6">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl bg-${stat.color}-500/20 border border-${stat.color}-500/30 flex items-center justify-center`}>
                <stat.icon className={`text-${stat.color}-500`} size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-400">{stat.label}</p>
                <p className="text-2xl font-black">{stat.value}</p>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>

      {/* Teams Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {teams.map((team, index) => {
            const TeamIcon = getIconComponent(team.icon);
            const teamMembers = getTeamMembers(team.id);
            const leader = getTeamLeader(team.id);
            const successRate = team.stats.totalExecutions > 0
              ? Math.round((team.stats.successfulExecutions / team.stats.totalExecutions) * 100)
              : 0;

            return (
              <motion.div
                key={team.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: index * 0.05 }}
                layout
              >
                <GlassCard className="flex flex-col h-full">
                  {/* Header */}
                  <div className="flex justify-between items-start mb-4">
                    <div
                      className="w-14 h-14 rounded-xl flex items-center justify-center border-2"
                      style={{
                        backgroundColor: `${team.color}20`,
                        borderColor: `${team.color}40`,
                      }}
                    >
                      <TeamIcon size={28} style={{ color: team.color }} />
                    </div>
                    <div className="relative">
                      <button
                        onClick={() => setShowDropdown(showDropdown === team.id ? null : team.id)}
                        className="text-gray-500 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
                      >
                        <MoreVertical size={20} />
                      </button>
                      {showDropdown === team.id && (
                        <div className="absolute right-0 mt-2 w-48 bg-[#0f111a] border border-white/10 rounded-xl shadow-xl z-10 overflow-hidden">
                          <button
                            onClick={() => handleAction('edit', team.id)}
                            className="w-full px-4 py-3 text-left hover:bg-white/5 transition-colors flex items-center gap-3"
                          >
                            <Edit size={16} />
                            <span className="text-sm font-medium">Edit Team</span>
                          </button>
                          <button
                            onClick={() => handleAction('delete', team.id)}
                            className="w-full px-4 py-3 text-left hover:bg-red-500/10 transition-colors flex items-center gap-3 text-red-400"
                          >
                            <Trash2 size={16} />
                            <span className="text-sm font-medium">Delete</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Team Info */}
                  <h3 className="text-xl font-bold mb-2 line-clamp-1">{team.name}</h3>
                  <p className="text-sm text-gray-400 mb-4 line-clamp-2">{team.description}</p>

                  {/* Members */}
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-bold text-gray-500">MEMBERS</span>
                      <span className="text-xs font-black text-gray-400">{teamMembers.length}</span>
                    </div>
                    <div className="flex -space-x-3">
                      {teamMembers.slice(0, 5).map((agent) => {
                        const AgentIcon = getIconComponent(agent.icon);
                        return (
                          <div
                            key={agent.id}
                            className="w-10 h-10 rounded-full border-2 border-[#0f111a] flex items-center justify-center"
                            style={{
                              backgroundColor: `${agent.color}20`,
                            }}
                            title={agent.name}
                          >
                            <AgentIcon size={18} style={{ color: agent.color }} />
                          </div>
                        );
                      })}
                      {teamMembers.length > 5 && (
                        <div className="w-10 h-10 rounded-full border-2 border-[#0f111a] bg-gray-800 flex items-center justify-center">
                          <span className="text-xs font-bold text-gray-400">+{teamMembers.length - 5}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Leader */}
                  {leader && (
                    <div className="mb-4 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                      <div className="flex items-center gap-2 text-xs">
                        <Crown size={12} className="text-yellow-500" />
                        <span className="text-gray-400">Leader:</span>
                        <span className="font-bold text-yellow-400 truncate">{leader.name}</span>
                      </div>
                    </div>
                  )}

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="p-3 bg-white/5 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">Success Rate</p>
                      <p className="text-lg font-black text-green-400">{successRate}%</p>
                    </div>
                    <div className="p-3 bg-white/5 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">Total Tasks</p>
                      <p className="text-lg font-black text-blue-400">{team.stats.totalExecutions}</p>
                    </div>
                  </div>

                  {/* Mode Badges */}
                  <div className="flex gap-2 mb-4">
                    <span className="px-2 py-1 bg-purple-500/20 border border-purple-500/30 rounded text-xs font-bold text-purple-400 capitalize">
                      {team.workflow.strategy}
                    </span>
                    <span className="px-2 py-1 bg-cyan-500/20 border border-cyan-500/30 rounded text-xs font-bold text-cyan-400 capitalize">
                      {team.workflow.communicationMode}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="mt-auto flex gap-3 pt-4 border-t border-white/5">
                    <button
                      onClick={() => {
                        setSelectedTeam(team.id);
                        setView('create');
                      }}
                      className="flex-1 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-sm font-bold transition-all border border-white/10"
                    >
                      Manage
                    </button>
                    <button
                      onClick={() => {
                        setSelectedTeam(team.id);
                        setView('run');
                      }}
                      className="flex-1 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-sm font-bold transition-all border border-white/10"
                    >
                      Deploy
                    </button>
                  </div>
                </GlassCard>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Teams;