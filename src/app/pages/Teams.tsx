import React, { useState, useEffect } from 'react';
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
  Edit
} from 'lucide-react';
import { useMode } from '../contexts/ModeContext';
import { GlassCard, GameCard, ActionButton } from '../components/ui-shared';
import { TeamEditor } from '../components/TeamEditor';
import { motion } from 'motion/react';
import { teamsApi } from '@/lib/api';
import type { Team } from '@/lib/api';

type ViewMode = 'list' | 'create' | 'edit';

const Teams = () => {
  const { mode } = useMode();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);

  useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await teamsApi.list();
      setTeams(response.items);
    } catch (err) {
      console.error('Failed to fetch teams:', err);
      setError(err instanceof Error ? err.message : 'Failed to load teams');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTeam = () => {
    setSelectedTeam(null);
    setViewMode('create');
  };

  const handleEditTeam = (team: Team) => {
    setSelectedTeam(team);
    setViewMode('edit');
  };

  const handleBackToList = () => {
    setViewMode('list');
    setSelectedTeam(null);
    fetchTeams();
  };

  // 如果在编辑模式，显示编辑器
  if (viewMode === 'create' || viewMode === 'edit') {
    return (
      <TeamEditor
        team={selectedTeam}
        onBack={handleBackToList}
        onSave={handleBackToList}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading teams...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-red-500 mb-4">Error: {error}</p>
          <ActionButton onClick={fetchTeams}>Retry</ActionButton>
        </div>
      </div>
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
          <ActionButton onClick={handleCreateTeam}>Forge Alliance</ActionButton>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {teams.map((team, idx) => {
            const colors = ['blue', 'purple', 'orange', 'green'];
            const color = colors[idx % colors.length];
            const memberCount = team.members?.length || 0;
            const level = Math.min(20, Math.floor(memberCount * 2));

            return (
              <motion.div
                key={team.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.1 }}
              >
                <GameCard rarity="epic" className="p-0 overflow-hidden h-full flex flex-col">
                  <div className="h-32 bg-black/40 relative flex items-center justify-center">
                    <div className={`absolute inset-0 bg-gradient-to-br from-${color}-600 to-transparent opacity-30`} />
                    <UsersRound size={48} className={`text-${color}-500 drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]`} />
                  </div>
                  <div className="p-6 flex-1 flex flex-col">
                    <h3 className="text-xl font-black uppercase italic text-white mb-2">{team.name}</h3>
                    <p className="text-xs text-gray-400 italic mb-6">"{team.description || 'No description'}"</p>

                    <div className="flex justify-between items-center mb-6">
                      <div className="flex -space-x-2">
                        {[...Array(Math.min(memberCount, 5))].map((_, i) => (
                          <div key={i} className={`w-8 h-8 rounded-full border-2 border-[#1a1a2e] bg-${color}-500/20 flex items-center justify-center`}>
                            <Shield size={14} className={`text-${color}-400`} />
                          </div>
                        ))}
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-black uppercase text-yellow-500">Guild LVL</p>
                        <p className="text-lg font-black text-white">{level}</p>
                      </div>
                    </div>

                    <div className="mt-auto pt-4 border-t border-white/5">
                      <ActionButton
                        variant="secondary"
                        className="w-full text-xs font-black uppercase"
                        onClick={() => handleEditTeam(team)}
                      >
                        Review Formation
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
    <div className="space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Agent Teams</h1>
          <p className="text-gray-400">Manage collaborative groups of AI agents for complex tasks.</p>
        </div>
        <div className="flex gap-3">
          <ActionButton onClick={handleCreateTeam}>Create Team</ActionButton>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {teams.map((team) => {
          const colors = ['blue', 'purple', 'orange', 'green'];
          const color = colors[team.id % colors.length];
          const memberCount = team.members?.length || 0;

          return (
            <GlassCard key={team.id} className="flex flex-col">
              <div className="flex justify-between items-start mb-6">
                <div className={`w-12 h-12 rounded-xl bg-${color}-500/20 border border-${color}-500/30 flex items-center justify-center text-${color}-500`}>
                  <UsersRound size={24} />
                </div>
                <button className="text-gray-500 hover:text-white transition-colors">
                  <MoreVertical size={20} />
                </button>
              </div>

              <h3 className="text-xl font-bold mb-2">{team.name}</h3>
              <p className="text-sm text-gray-400 mb-6">{team.description || 'No description'}</p>

              <div className="flex items-center gap-4 mb-8">
                <div className="flex -space-x-3">
                  {[...Array(Math.min(memberCount, 5))].map((_, i) => (
                    <div key={i} className="w-10 h-10 rounded-full border-2 border-[#0f111a] bg-gray-800 flex items-center justify-center">
                      <BrainCircuit size={16} className="text-blue-400" />
                    </div>
                  ))}
                </div>
                <span className="text-sm text-gray-400 font-medium">{memberCount} Members</span>
              </div>

              <div className="mt-auto flex gap-3 pt-4 border-t border-white/5">
                <button className="flex-1 py-2 text-sm font-bold text-gray-400 hover:text-white transition-colors">Settings</button>
                <button
                  onClick={() => handleEditTeam(team)}
                  className="flex-1 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-sm font-bold transition-all border border-white/10 flex items-center justify-center gap-2"
                >
                  <Edit size={14} />
                  Manage
                </button>
              </div>
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
};

export default Teams;
