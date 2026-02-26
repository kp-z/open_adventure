import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  Save,
  Wand2,
  Settings,
  Users,
  Palette,
  Tag,
  Network,
  MessageSquare,
  CheckCircle2,
  X,
  Plus,
  Crown,
  Sparkles,
  Shield,
  Star,
  Workflow,
  Share2,
  AlertTriangle,
  Clock,
  Info,
  Target,
  Zap,
  GitBranch,
  Radio,
  Vote,
  RefreshCw,
} from 'lucide-react';
import * as Icons from 'lucide-react';
import { useTeams, type Team, type AgentRole, type TeamWorkflow } from '../contexts/TeamsContext';
import { useAgents } from '../contexts/AgentsContext';
import { GlassCard } from './ui-shared';
import { TeamRosterSection } from './TeamRosterSection';

interface TeamCreatorProps {
  teamId?: string | null;
  onBack: () => void;
}

const iconOptions = [
  'Users', 'Workflow', 'GitBranch', 'Network', 'Layers', 'Boxes',
  'Target', 'Zap', 'Cpu', 'Shield', 'Rocket', 'Trophy'
];

const colorOptions = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', 
  '#10b981', '#06b6d4', '#f97316', '#6366f1',
];

const roleTypes = [
  { value: 'leader', label: 'Leader', icon: Crown, color: 'text-yellow-500', desc: 'Coordinates and delegates tasks' },
  { value: 'coordinator', label: 'Coordinator', icon: Network, color: 'text-blue-500', desc: 'Manages workflow and communication' },
  { value: 'specialist', label: 'Specialist', icon: Star, color: 'text-purple-500', desc: 'Expert in specific domain' },
  { value: 'support', label: 'Support', icon: Shield, color: 'text-green-500', desc: 'Assists other agents' },
];

const workflowStrategies = [
  {
    value: 'sequential',
    label: 'Sequential',
    icon: 'ArrowRight',
    desc: 'Agents work one after another in order',
    color: 'blue',
  },
  {
    value: 'parallel',
    label: 'Parallel',
    icon: 'GitBranch',
    desc: 'All agents work simultaneously on different parts',
    color: 'green',
  },
  {
    value: 'dynamic',
    label: 'Dynamic',
    icon: 'Workflow',
    desc: 'Coordinator assigns tasks based on context and load',
    color: 'purple',
  },
  {
    value: 'hierarchical',
    label: 'Hierarchical',
    icon: 'Network',
    desc: 'Leader delegates to sub-teams recursively',
    color: 'orange',
  },
];

const taskDistributions = [
  { value: 'manual', label: 'Manual', desc: 'Pre-defined task assignment' },
  { value: 'auto-balanced', label: 'Auto-Balanced', desc: 'Distribute evenly by workload' },
  { value: 'skill-based', label: 'Skill-Based', desc: 'Match tasks to agent capabilities' },
  { value: 'leader-assigned', label: 'Leader-Assigned', desc: 'Leader decides distribution' },
];

const communicationModes = [
  { value: 'direct', label: 'Direct', icon: 'Users', desc: 'Agents communicate peer-to-peer' },
  { value: 'hub-spoke', label: 'Hub-Spoke', icon: 'Radio', desc: 'All through central coordinator' },
  { value: 'broadcast', label: 'Broadcast', icon: 'Radio', desc: 'Messages sent to all agents' },
  { value: 'selective', label: 'Selective', icon: 'Share2', desc: 'Route based on relevance' },
];

const resultAggregations = [
  { value: 'concatenate', label: 'Concatenate', icon: 'Plus', desc: 'Combine outputs in sequence' },
  { value: 'synthesize', label: 'Synthesize', icon: 'Sparkles', desc: 'AI merges into coherent result' },
  { value: 'vote', label: 'Vote', icon: 'Vote', desc: 'Select best output by voting' },
  { value: 'leader-decides', label: 'Leader Decides', icon: 'Crown', desc: 'Leader chooses final result' },
];

const errorHandlings = [
  { value: 'abort', label: 'Abort', icon: 'X', desc: 'Stop entire team execution', color: 'red' },
  { value: 'skip', label: 'Skip', icon: 'ArrowRight', desc: 'Continue without failed agent', color: 'yellow' },
  { value: 'retry', label: 'Retry', icon: 'RefreshCw', desc: 'Retry failed task up to 3 times', color: 'blue' },
  { value: 'delegate', label: 'Delegate', icon: 'Users', desc: 'Reassign to another agent', color: 'green' },
];

export const TeamCreator: React.FC<TeamCreatorProps> = ({ teamId, onBack }) => {
  const { createTeam, updateTeam, getTeam, generateTeamWithAI } = useTeams();
  const { agents } = useAgents();
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [showAgentPicker, setShowAgentPicker] = useState(false);
  const [editingRole, setEditingRole] = useState<string | null>(null);
  const [showTagsPanel, setShowTagsPanel] = useState(false);
  const [showVisualPanel, setShowVisualPanel] = useState(false);

  // Form state
  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    purpose: string;
    roles: AgentRole[];
    workflow: TeamWorkflow;
    sharedContext: Team['sharedContext'];
    color: string;
    icon: string;
    status: Team['status'];
    tags: string[];
  }>({
    name: '',
    description: '',
    purpose: '',
    roles: [],
    workflow: {
      strategy: 'dynamic',
      taskDistribution: 'skill-based',
      communicationMode: 'selective',
      resultAggregation: 'synthesize',
      errorHandling: 'retry',
      maxParallelTasks: 3,
      taskTimeout: 300,
    },
    sharedContext: {
      enabled: true,
      scope: 'relevant',
      includeHistory: true,
    },
    color: colorOptions[0],
    icon: iconOptions[0],
    status: 'active',
    tags: [],
  });

  const [tagInput, setTagInput] = useState('');
  const [roleResponsibility, setRoleResponsibility] = useState('');

  // Load existing team
  useEffect(() => {
    if (teamId) {
      const team = getTeam(teamId);
      if (team) {
        setFormData({
          name: team.name,
          description: team.description,
          purpose: team.purpose,
          roles: team.roles,
          workflow: team.workflow,
          sharedContext: team.sharedContext,
          color: team.color,
          icon: team.icon,
          status: team.status,
          tags: team.tags,
        });
      }
    }
  }, [teamId, getTeam]);

  const updateFormData = (updates: Partial<typeof formData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const updateWorkflow = (updates: Partial<TeamWorkflow>) => {
    setFormData(prev => ({
      ...prev,
      workflow: { ...prev.workflow, ...updates },
    }));
  };

  // AI Generation
  const handleAIGenerate = async () => {
    if (!aiPrompt.trim()) return;

    setIsGenerating(true);
    try {
      const generated = await generateTeamWithAI(aiPrompt);
      updateFormData({
        name: generated.name || formData.name,
        description: generated.description || formData.description,
        purpose: generated.purpose || formData.purpose,
        tags: generated.tags || formData.tags,
        workflow: generated.workflow || formData.workflow,
        sharedContext: generated.sharedContext || formData.sharedContext,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Save team
  const handleSave = () => {
    if (!formData.name.trim()) {
      alert('Please enter a team name');
      return;
    }

    if (formData.roles.length === 0) {
      alert('Please add at least one agent role');
      return;
    }

    if (teamId) {
      updateTeam(teamId, formData);
    } else {
      createTeam(formData);
    }

    onBack();
  };

  // Role management
  const handleAddAgent = (agentId: string) => {
    // First agent automatically becomes the leader
    const isFirstAgent = formData.roles.length === 0;
    const hasLeader = formData.roles.some(r => r.role === 'leader');
    
    const newRole: AgentRole = {
      agentId,
      role: isFirstAgent || !hasLeader ? 'leader' : 'specialist',
      responsibilities: isFirstAgent || !hasLeader 
        ? ['Coordinate team activities', 'Make strategic decisions', 'Oversee project progress']
        : [],
      canDelegate: isFirstAgent || !hasLeader ? true : false,
      priority: formData.roles.length + 1,
    };
    updateFormData({ roles: [...formData.roles, newRole] });
    setShowAgentPicker(false);
  };

  const handleRemoveRole = (agentId: string) => {
    updateFormData({ 
      roles: formData.roles.filter(r => r.agentId !== agentId),
    });
  };

  const handleUpdateRole = (agentId: string, updates: Partial<AgentRole>) => {
    updateFormData({
      roles: formData.roles.map(r => 
        r.agentId === agentId ? { ...r, ...updates } : r
      ),
    });
  };

  const handleAddResponsibility = (agentId: string, responsibility: string) => {
    if (!responsibility.trim()) return;
    handleUpdateRole(agentId, {
      responsibilities: [
        ...formData.roles.find(r => r.agentId === agentId)?.responsibilities || [],
        responsibility.trim(),
      ],
    });
    setRoleResponsibility('');
  };

  const handleRemoveResponsibility = (agentId: string, index: number) => {
    const role = formData.roles.find(r => r.agentId === agentId);
    if (!role) return;
    handleUpdateRole(agentId, {
      responsibilities: role.responsibilities.filter((_, i) => i !== index),
    });
  };

  // Tag management
  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      updateFormData({ tags: [...formData.tags, tagInput.trim()] });
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    updateFormData({ tags: formData.tags.filter(t => t !== tag) });
  };

  // Get components
  const getIconComponent = (iconName: string) => {
    const IconComponent = (Icons as any)[iconName];
    return IconComponent || Icons.Users;
  };

  const availableAgents = agents.filter(a => !formData.roles.find(r => r.agentId === a.id));
  const teamAgents = formData.roles.map(role => {
    const agent = agents.find(a => a.id === role.agentId);
    return agent ? { agent, role } : null;
  }).filter(Boolean) as { agent: any; role: AgentRole }[];

  return (
    <>
      <div className="max-w-7xl mx-auto pb-20">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={onBack}
            className="p-3 hover:bg-white/10 rounded-xl transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold tracking-tight">
              {teamId ? 'Configure Team' : 'Create Agent Team'}
            </h1>
            <p className="text-gray-400 mt-1">
              Design collaborative workflows for multi-agent execution
            </p>
          </div>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 rounded-xl font-bold transition-all shadow-lg"
          >
            <Save size={20} />
            {teamId ? 'Update' : 'Create'}
          </button>
        </div>

      {/* AI Assistant */}
      <GlassCard className="p-6 mb-8 border-2 border-purple-500/30">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
            <Sparkles className="text-purple-400" size={20} />
          </div>
          <div>
            <h3 className="font-bold">AI Team Builder</h3>
            <p className="text-xs text-gray-400">
              Describe your use case and get intelligent team configuration
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <input
            type="text"
            placeholder='E.g., "Build a team for code review and testing" or "Analyze customer feedback data"'
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAIGenerate()}
            className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 transition-all"
            disabled={isGenerating}
          />
          <button
            onClick={handleAIGenerate}
            disabled={isGenerating || !aiPrompt.trim()}
            className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-xl font-bold transition-all"
          >
            <Wand2 size={20} className={isGenerating ? 'animate-spin' : ''} />
            Generate
          </button>
        </div>
      </GlassCard>

      {/* Team Roster - Full Width */}
      <GlassCard className="p-6 mb-8">
        <TeamRosterSection
          roles={formData.roles}
          agents={agents}
          onAddAgent={() => setShowAgentPicker(true)}
          onRemoveRole={handleRemoveRole}
          onEditRole={(agentId) => setEditingRole(agentId)}
        />
      </GlassCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column - Team Information */}
        <div className="space-y-6">
          <GlassCard className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <Info size={18} className="text-blue-400" />
              <h3 className="font-bold">Team Information</h3>
            </div>
            
            <div className="space-y-4">
              {/* Team Name */}
              <div>
                <label className="block text-sm font-bold text-gray-400 mb-2">
                  Team Name *
                </label>
                <input
                  type="text"
                  placeholder="E.g., Full-Stack Development Team"
                  value={formData.name}
                  onChange={(e) => updateFormData({ name: e.target.value })}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-bold text-gray-400 mb-2">
                  Description
                </label>
                <textarea
                  placeholder="Brief description of the team..."
                  value={formData.description}
                  onChange={(e) => updateFormData({ description: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 resize-none"
                />
              </div>

              {/* Purpose */}
              <div>
                <label className="block text-sm font-bold text-gray-400 mb-2">
                  Purpose / Use Case *
                </label>
                <textarea
                  placeholder="What is this team designed to accomplish?"
                  value={formData.purpose}
                  onChange={(e) => updateFormData({ purpose: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 resize-none"
                />
              </div>

              {/* Visual Identity - Collapsible */}
              <div className="pt-4 border-t border-white/10">
                <button
                  onClick={() => setShowVisualPanel(!showVisualPanel)}
                  className="w-full flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all"
                >
                  <div className="flex items-center gap-2">
                    <Palette size={16} className="text-purple-400" />
                    <span className="text-sm font-bold">Visual Identity</span>
                  </div>
                  <motion.div
                    animate={{ rotate: showVisualPanel ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Plus size={16} className={showVisualPanel ? "rotate-45" : ""} />
                  </motion.div>
                </button>
                
                {showVisualPanel && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-3 p-4 bg-white/5 rounded-xl border border-white/10 space-y-4"
                  >
                    {/* Icon Selector */}
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Icon</label>
                      <div className="grid grid-cols-4 gap-2">
                        {iconOptions.map((iconName) => {
                          const IconComponent = getIconComponent(iconName);
                          return (
                            <button
                              key={iconName}
                              onClick={() => updateFormData({ icon: iconName })}
                              className={`aspect-square rounded-lg border-2 transition-all flex items-center justify-center ${
                                formData.icon === iconName
                                  ? 'border-blue-500 bg-blue-500/20'
                                  : 'border-white/10 hover:border-white/30 bg-white/5'
                              }`}
                            >
                              <IconComponent size={18} />
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Color */}
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Color</label>
                      <div className="grid grid-cols-4 gap-2">
                        {colorOptions.map((color) => (
                          <button
                            key={color}
                            onClick={() => updateFormData({ color })}
                            className={`aspect-square rounded-lg border-2 transition-all ${
                              formData.color === color
                                ? 'border-white scale-110'
                                : 'border-white/10 hover:scale-105'
                            }`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Preview */}
                    <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center border-2"
                          style={{
                            backgroundColor: `${formData.color}20`,
                            borderColor: `${formData.color}40`,
                          }}
                        >
                          {(() => {
                            const IconComponent = getIconComponent(formData.icon);
                            return <IconComponent size={20} style={{ color: formData.color }} />;
                          })()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold truncate">
                            {formData.name || 'Team Preview'}
                          </p>
                          <p className="text-xs text-gray-400">
                            {formData.roles.length} agents
                          </p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Tags - Collapsible */}
              <div>
                <button
                  onClick={() => setShowTagsPanel(!showTagsPanel)}
                  className="w-full flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all"
                >
                  <div className="flex items-center gap-2">
                    <Tag size={16} className="text-pink-400" />
                    <span className="text-sm font-bold">Tags</span>
                    {formData.tags.length > 0 && (
                      <span className="px-2 py-0.5 bg-pink-500/20 rounded-full text-xs font-bold text-pink-400">
                        {formData.tags.length}
                      </span>
                    )}
                  </div>
                  <motion.div
                    animate={{ rotate: showTagsPanel ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Plus size={16} className={showTagsPanel ? "rotate-45" : ""} />
                  </motion.div>
                </button>

                {showTagsPanel && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-3 p-4 bg-white/5 rounded-xl border border-white/10"
                  >
                    <div className="flex gap-2 mb-3">
                      <input
                        type="text"
                        placeholder="Add tag..."
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                        className="flex-1 px-3 py-2 text-sm bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-pink-500/50"
                      />
                      <button
                        onClick={handleAddTag}
                        className="px-3 py-2 bg-pink-600 hover:bg-pink-500 rounded-lg transition-all"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {formData.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-1 bg-pink-500/20 border border-pink-500/30 rounded text-xs font-bold text-pink-400 flex items-center gap-1"
                        >
                          {tag}
                          <button
                            onClick={() => handleRemoveTag(tag)}
                            className="hover:text-pink-300"
                          >
                            <X size={12} />
                          </button>
                        </span>
                      ))}
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Right Column - Workflow & Configuration */}
        <div className="space-y-6">

          {/* Workflow Strategy */}
          <GlassCard className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <Workflow size={18} className="text-purple-400" />
              <h3 className="font-bold">Workflow Strategy</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {workflowStrategies.map((strategy) => {
                const StrategyIcon = getIconComponent(strategy.icon);
                return (
                  <button
                    key={strategy.value}
                    onClick={() => updateWorkflow({ strategy: strategy.value as any })}
                    className={`p-4 rounded-xl border-2 transition-all text-left ${
                      formData.workflow.strategy === strategy.value
                        ? `border-${strategy.color}-500 bg-${strategy.color}-500/20`
                        : 'border-white/10 hover:border-white/30 bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <StrategyIcon size={20} />
                      <span className="font-bold">{strategy.label}</span>
                      {formData.workflow.strategy === strategy.value && (
                        <CheckCircle2 size={18} className="ml-auto text-green-500" />
                      )}
                    </div>
                    <p className="text-xs text-gray-400">{strategy.desc}</p>
                  </button>
                );
              })}
            </div>
          </GlassCard>

          {/* Communication & Distribution */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Task Distribution */}
            <GlassCard className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Target size={18} className="text-orange-400" />
                <h3 className="font-bold text-sm">Task Distribution</h3>
              </div>
              <div className="space-y-2">
                {taskDistributions.map((dist) => (
                  <button
                    key={dist.value}
                    onClick={() => updateWorkflow({ taskDistribution: dist.value as any })}
                    className={`w-full p-3 rounded-lg border-2 transition-all text-left ${
                      formData.workflow.taskDistribution === dist.value
                        ? 'border-orange-500 bg-orange-500/20'
                        : 'border-white/10 hover:border-white/30 bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-bold">{dist.label}</span>
                      {formData.workflow.taskDistribution === dist.value && (
                        <CheckCircle2 size={16} className="ml-auto text-orange-500" />
                      )}
                    </div>
                    <p className="text-xs text-gray-400">{dist.desc}</p>
                  </button>
                ))}
              </div>
            </GlassCard>

            {/* Communication Mode */}
            <GlassCard className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <MessageSquare size={18} className="text-cyan-400" />
                <h3 className="font-bold text-sm">Communication</h3>
              </div>
              <div className="space-y-2">
                {communicationModes.map((mode) => {
                  const ModeIcon = getIconComponent(mode.icon);
                  return (
                    <button
                      key={mode.value}
                      onClick={() => updateWorkflow({ communicationMode: mode.value as any })}
                      className={`w-full p-3 rounded-lg border-2 transition-all text-left ${
                        formData.workflow.communicationMode === mode.value
                          ? 'border-cyan-500 bg-cyan-500/20'
                          : 'border-white/10 hover:border-white/30 bg-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <ModeIcon size={14} />
                        <span className="text-sm font-bold">{mode.label}</span>
                        {formData.workflow.communicationMode === mode.value && (
                          <CheckCircle2 size={16} className="ml-auto text-cyan-500" />
                        )}
                      </div>
                      <p className="text-xs text-gray-400">{mode.desc}</p>
                    </button>
                  );
                })}
              </div>
            </GlassCard>
          </div>

          {/* Result & Error Handling */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Result Aggregation */}
            <GlassCard className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles size={18} className="text-green-400" />
                <h3 className="font-bold text-sm">Result Aggregation</h3>
              </div>
              <div className="space-y-2">
                {resultAggregations.map((agg) => {
                  const AggIcon = getIconComponent(agg.icon);
                  return (
                    <button
                      key={agg.value}
                      onClick={() => updateWorkflow({ resultAggregation: agg.value as any })}
                      className={`w-full p-3 rounded-lg border-2 transition-all text-left ${
                        formData.workflow.resultAggregation === agg.value
                          ? 'border-green-500 bg-green-500/20'
                          : 'border-white/10 hover:border-white/30 bg-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <AggIcon size={14} />
                        <span className="text-sm font-bold">{agg.label}</span>
                        {formData.workflow.resultAggregation === agg.value && (
                          <CheckCircle2 size={16} className="ml-auto text-green-500" />
                        )}
                      </div>
                      <p className="text-xs text-gray-400">{agg.desc}</p>
                    </button>
                  );
                })}
              </div>
            </GlassCard>

            {/* Error Handling */}
            <GlassCard className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle size={18} className="text-red-400" />
                <h3 className="font-bold text-sm">Error Handling</h3>
              </div>
              <div className="space-y-2">
                {errorHandlings.map((err) => {
                  const ErrIcon = getIconComponent(err.icon);
                  return (
                    <button
                      key={err.value}
                      onClick={() => updateWorkflow({ errorHandling: err.value as any })}
                      className={`w-full p-3 rounded-lg border-2 transition-all text-left ${
                        formData.workflow.errorHandling === err.value
                          ? `border-${err.color}-500 bg-${err.color}-500/20`
                          : 'border-white/10 hover:border-white/30 bg-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <ErrIcon size={14} />
                        <span className="text-sm font-bold">{err.label}</span>
                        {formData.workflow.errorHandling === err.value && (
                          <CheckCircle2 size={16} className={`ml-auto text-${err.color}-500`} />
                        )}
                      </div>
                      <p className="text-xs text-gray-400">{err.desc}</p>
                    </button>
                  );
                })}
              </div>
            </GlassCard>
          </div>

          {/* Advanced Settings */}
          <GlassCard className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <Settings size={18} className="text-gray-400" />
              <h3 className="font-bold">Advanced Settings</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-gray-400 mb-2">
                  Max Parallel Tasks
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={formData.workflow.maxParallelTasks}
                  onChange={(e) => updateWorkflow({ maxParallelTasks: parseInt(e.target.value) || 1 })}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-blue-500/50"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-400 mb-2">
                  Task Timeout (seconds)
                </label>
                <input
                  type="number"
                  min="30"
                  max="3600"
                  step="30"
                  value={formData.workflow.taskTimeout}
                  onChange={(e) => updateWorkflow({ taskTimeout: parseInt(e.target.value) || 300 })}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-blue-500/50"
                />
              </div>
            </div>

            {/* Context Sharing */}
            <div className="mt-6 p-4 bg-white/5 rounded-xl border border-white/10">
              <div className="flex items-center gap-2 mb-4">
                <Share2 size={16} className="text-blue-400" />
                <h4 className="font-bold text-sm">Context Sharing</h4>
              </div>
              <div className="space-y-3">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={formData.sharedContext.enabled}
                    onChange={(e) => updateFormData({
                      sharedContext: { ...formData.sharedContext, enabled: e.target.checked }
                    })}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm">Enable shared context between agents</span>
                </label>
                {formData.sharedContext.enabled && (
                  <>
                    <div className="flex gap-2 ml-7">
                      {['all', 'relevant', 'minimal'].map(scope => (
                        <button
                          key={scope}
                          onClick={() => updateFormData({
                            sharedContext: { ...formData.sharedContext, scope: scope as any }
                          })}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            formData.sharedContext.scope === scope
                              ? 'bg-blue-500/20 border-2 border-blue-500/50'
                              : 'bg-white/5 border border-white/10'
                          }`}
                        >
                          {scope.charAt(0).toUpperCase() + scope.slice(1)}
                        </button>
                      ))}
                    </div>
                    <label className="flex items-center gap-3 ml-7">
                      <input
                        type="checkbox"
                        checked={formData.sharedContext.includeHistory}
                        onChange={(e) => updateFormData({
                          sharedContext: { ...formData.sharedContext, includeHistory: e.target.checked }
                        })}
                        className="w-4 h-4 rounded"
                      />
                      <span className="text-sm">Include conversation history</span>
                    </label>
                  </>
                )}
              </div>
            </div>
          </GlassCard>
        </div>
      </div>
      </div>

      {/* Agent Picker Modal - Outside main container for proper z-index */}
      {showAgentPicker && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-6"
          onClick={() => setShowAgentPicker(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="max-w-5xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <GlassCard className="p-6 max-h-[85vh] overflow-hidden flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between mb-5 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg">
                    <Users size={22} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Add Agent to Team</h3>
                    <p className="text-sm text-gray-400">
                      {availableAgents.length > 0 
                        ? `${availableAgents.length} agent${availableAgents.length > 1 ? 's' : ''} available`
                        : 'No agents available'
                      }
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAgentPicker(false)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors group"
                  title="Close"
                >
                  <X size={22} className="text-gray-400 group-hover:text-white transition-colors" />
                </button>
              </div>

              {/* Leader Hint */}
              {formData.roles.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4 p-3.5 bg-gradient-to-r from-yellow-500/15 to-orange-500/10 border border-yellow-500/40 rounded-xl flex items-center gap-3 shrink-0"
                >
                  <div className="w-8 h-8 rounded-lg bg-yellow-500/20 flex items-center justify-center shrink-0">
                    <Crown size={18} className="text-yellow-400" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-yellow-300">First Agent = Team Leader</p>
                    <p className="text-xs text-yellow-400/80">Will coordinate team activities and make strategic decisions</p>
                  </div>
                </motion.div>
              )}
              
              {!formData.roles.some(r => r.role === 'leader') && formData.roles.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4 p-3.5 bg-gradient-to-r from-yellow-500/15 to-orange-500/10 border border-yellow-500/40 rounded-xl flex items-center gap-3 shrink-0"
                >
                  <div className="w-8 h-8 rounded-lg bg-yellow-500/20 flex items-center justify-center shrink-0">
                    <Crown size={18} className="text-yellow-400" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-yellow-300">No Leader Yet!</p>
                    <p className="text-xs text-yellow-400/80">Next agent will be assigned as Team Leader</p>
                  </div>
                </motion.div>
              )}

              {/* Agent List */}
              {availableAgents.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center py-12">
                  <div className="w-20 h-20 rounded-2xl bg-gray-500/10 flex items-center justify-center mb-4">
                    <Users size={40} className="text-gray-600" />
                  </div>
                  <p className="text-gray-400 font-bold">All agents are already in this team</p>
                  <p className="text-sm text-gray-500 mt-1">Create new agents to expand your team</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto pr-2 custom-scrollbar">
                  {availableAgents.map((agent, index) => {
                    const AgentIcon = getIconComponent(agent.icon);
                    const statusColors = {
                      active: 'green',
                      idle: 'gray',
                      disabled: 'red',
                    };
                    const statusColor = statusColors[agent.status];
                    const willBeLeader = formData.roles.length === 0 || !formData.roles.some(r => r.role === 'leader');

                    return (
                      <motion.button
                        key={agent.id}
                        onClick={() => handleAddAgent(agent.id)}
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ delay: index * 0.05, type: 'spring', stiffness: 300, damping: 25 }}
                        whileHover={{ scale: 1.03, y: -4 }}
                        whileTap={{ scale: 0.98 }}
                        className={`p-4 rounded-xl border-2 transition-all text-left relative group ${
                          willBeLeader 
                            ? 'bg-gradient-to-br from-yellow-500/10 to-orange-500/5 border-yellow-500/50 hover:border-yellow-500/80 shadow-lg shadow-yellow-500/10 hover:shadow-yellow-500/20' 
                            : 'bg-white/5 hover:bg-white/10 border-white/10 hover:border-green-500/50 hover:shadow-lg hover:shadow-green-500/10'
                        }`}
                      >
                        {/* Leader Badge */}
                        {willBeLeader && (
                          <div className="absolute -top-2 -right-2 px-2.5 py-1 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-lg flex items-center gap-1.5 shadow-lg z-10">
                            <Crown size={12} className="text-black" />
                            <span className="text-xs font-bold text-black">Will be Leader</span>
                          </div>
                        )}
                        
                        {/* Agent Icon & Info */}
                        <div className="flex items-start gap-3 mb-3">
                          <div
                            className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0 border-2 shadow-md group-hover:shadow-lg transition-all"
                            style={{
                              backgroundColor: `${agent.color}20`,
                              borderColor: `${agent.color}60`,
                              boxShadow: `0 4px 12px ${agent.color}20`,
                            }}
                          >
                            <AgentIcon size={24} style={{ color: agent.color }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <h4 className="font-bold text-sm truncate">{agent.name}</h4>
                              <div 
                                className={`w-2 h-2 rounded-full`}
                                style={{ backgroundColor: statusColor === 'green' ? '#10b981' : statusColor === 'red' ? '#ef4444' : '#6b7280' }}
                              />
                            </div>
                            <p className="text-xs text-gray-400 line-clamp-2 leading-snug">{agent.description}</p>
                          </div>
                        </div>

                        {/* Stats - Compact */}
                        <div className="flex items-center gap-3 mb-3 text-xs">
                          <div className="flex items-center gap-1">
                            <Zap size={12} className="text-yellow-400" />
                            <span className="text-gray-400 font-bold">{agent.skills.length}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <CheckCircle2 size={12} className="text-green-400" />
                            <span className="text-gray-400 font-bold">{agent.stats.successCount}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock size={12} className="text-blue-400" />
                            <span className="text-gray-400 font-bold">{agent.stats.avgResponseTime}s</span>
                          </div>
                        </div>

                        {/* Tags - Compact */}
                        {agent.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-3">
                            {agent.tags.slice(0, 2).map((tag) => (
                              <span
                                key={tag}
                                className="px-1.5 py-0.5 bg-blue-500/20 border border-blue-500/30 rounded text-[10px] font-bold text-blue-400"
                              >
                                {tag}
                              </span>
                            ))}
                            {agent.tags.length > 2 && (
                              <span className="px-1.5 py-0.5 bg-gray-500/20 border border-gray-500/30 rounded text-[10px] font-bold text-gray-400">
                                +{agent.tags.length - 2}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Add Button Indicator */}
                        <div className="pt-2.5 border-t border-white/10 flex items-center justify-center gap-2 text-green-400 font-bold text-sm opacity-70 group-hover:opacity-100 transition-opacity">
                          <Plus size={16} />
                          <span>Add to Team</span>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              )}

              {/* Footer Info */}
              {availableAgents.length > 0 && (
                <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-gray-500 shrink-0">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    <span>Click any agent to add to team</span>
                  </div>
                  <span>Team size: {formData.roles.length} / 6</span>
                </div>
              )}
            </GlassCard>
          </motion.div>
        </div>
      )}
    </>
  );
};