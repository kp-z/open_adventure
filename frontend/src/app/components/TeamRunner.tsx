import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  Play,
  Square,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  MessageSquare,
  Users,
  Workflow,
  TrendingUp,
  Download,
  Share2,
  Zap,
  AlertCircle,
} from 'lucide-react';
import * as Icons from 'lucide-react';
import { useTeams, type TeamExecution, type ExecutionStep } from '../contexts/TeamsContext';
import { useAgents } from '../contexts/AgentsContext';
import { GlassCard } from './ui-shared';

interface TeamRunnerProps {
  teamId: string;
  onBack: () => void;
}

export const TeamRunner: React.FC<TeamRunnerProps> = ({ teamId, onBack }) => {
  const { getTeam, executeTeam, cancelExecution, getExecution } = useTeams();
  const { agents } = useAgents();
  const team = getTeam(teamId);
  const [task, setTask] = useState('');
  const [currentExecutionId, setCurrentExecutionId] = useState<string | null>(null);
  const [execution, setExecution] = useState<TeamExecution | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Poll for execution updates
  useEffect(() => {
    if (!currentExecutionId) return;

    const interval = setInterval(() => {
      const exec = getExecution(currentExecutionId);
      if (exec) {
        setExecution(exec);
        if (exec.status === 'completed' || exec.status === 'failed' || exec.status === 'cancelled') {
          clearInterval(interval);
        }
      }
    }, 500);

    return () => clearInterval(interval);
  }, [currentExecutionId, getExecution]);

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [execution?.messages]);

  if (!team) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-400">Team not found</p>
      </div>
    );
  }

  const handleStart = async () => {
    if (!task.trim()) {
      alert('Please enter a task');
      return;
    }

    try {
      const execId = await executeTeam(teamId, task);
      setCurrentExecutionId(execId);
      const exec = getExecution(execId);
      if (exec) setExecution(exec);
    } catch (error) {
      console.error('Failed to start execution:', error);
      alert('Failed to start team execution');
    }
  };

  const handleStop = () => {
    if (currentExecutionId) {
      cancelExecution(currentExecutionId);
    }
  };

  const handleReset = () => {
    setCurrentExecutionId(null);
    setExecution(null);
    setTask('');
  };

  const isRunning = execution && (execution.status === 'initializing' || execution.status === 'running');
  const isCompleted = execution?.status === 'completed';
  const isFailed = execution?.status === 'failed';
  const isCancelled = execution?.status === 'cancelled';

  const getIconComponent = (iconName: string) => {
    const IconComponent = (Icons as any)[iconName];
    return IconComponent || Icons.Users;
  };

  const getStepStatusIcon = (status: ExecutionStep['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 size={16} className="text-green-500" />;
      case 'running':
        return <Loader2 size={16} className="text-blue-500 animate-spin" />;
      case 'failed':
        return <XCircle size={16} className="text-red-500" />;
      case 'pending':
        return <Clock size={16} className="text-gray-500" />;
    }
  };

  const getStatusColor = (status: TeamExecution['status']) => {
    switch (status) {
      case 'completed': return 'green';
      case 'failed': return 'red';
      case 'cancelled': return 'yellow';
      case 'running': return 'blue';
      case 'initializing': return 'purple';
    }
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return minutes > 0 ? `${minutes}m ${remainingSeconds}s` : `${remainingSeconds}s`;
  };

  const teamAgents = team.roles.map(role => {
    const agent = agents.find(a => a.id === role.agentId);
    return agent ? { agent, role } : null;
  }).filter(Boolean) as { agent: any; role: any }[];

  return (
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
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center border-2"
              style={{
                backgroundColor: `${team.color}20`,
                borderColor: `${team.color}40`,
              }}
            >
              {(() => {
                const TeamIcon = getIconComponent(team.icon);
                return <TeamIcon size={24} style={{ color: team.color }} />;
              })()}
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{team.name}</h1>
              <p className="text-gray-400">{team.purpose}</p>
            </div>
          </div>
        </div>
        {execution && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl font-bold transition-all"
            >
              <RotateCcw size={18} />
              New Test
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Control Panel */}
        <div className="space-y-6">
          {/* Task Input */}
          <GlassCard className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Zap size={18} className="text-yellow-400" />
              <h3 className="font-bold">Task</h3>
            </div>
            <textarea
              placeholder="Enter the task for the team to execute...&#10;&#10;Example: 'Build a REST API for a todo application with user authentication'"
              value={task}
              onChange={(e) => setTask(e.target.value)}
              disabled={!!execution}
              rows={6}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500/50 resize-none disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <div className="flex gap-3 mt-4">
              {!execution ? (
                <button
                  onClick={handleStart}
                  disabled={!task.trim()}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed rounded-xl font-bold transition-all shadow-lg"
                >
                  <Play size={20} />
                  Start Execution
                </button>
              ) : isRunning ? (
                <button
                  onClick={handleStop}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 rounded-xl font-bold transition-all shadow-lg"
                >
                  <Square size={20} />
                  Stop
                </button>
              ) : (
                <button
                  onClick={handleReset}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 rounded-xl font-bold transition-all shadow-lg"
                >
                  <RotateCcw size={20} />
                  Reset
                </button>
              )}
            </div>
          </GlassCard>

          {/* Team Info */}
          <GlassCard className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Workflow size={18} className="text-purple-400" />
              <h3 className="font-bold text-sm">Team Configuration</h3>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Strategy:</span>
                <span className="font-bold capitalize">{team.workflow.strategy}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Distribution:</span>
                <span className="font-bold capitalize text-xs">{team.workflow.taskDistribution.replace('-', ' ')}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Communication:</span>
                <span className="font-bold capitalize text-xs">{team.workflow.communicationMode.replace('-', ' ')}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Result:</span>
                <span className="font-bold capitalize text-xs">{team.workflow.resultAggregation.replace('-', ' ')}</span>
              </div>
            </div>
          </GlassCard>

          {/* Team Members */}
          <GlassCard className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Users size={18} className="text-blue-400" />
              <h3 className="font-bold text-sm">Team Members</h3>
              <span className="ml-auto px-2 py-0.5 bg-blue-500/20 rounded-full text-xs font-black text-blue-400">
                {teamAgents.length}
              </span>
            </div>
            <div className="space-y-2">
              {teamAgents.map(({ agent, role }) => {
                const AgentIcon = getIconComponent(agent.icon);
                const agentStep = execution?.steps.find(s => s.agentId === agent.id);
                return (
                  <div
                    key={agent.id}
                    className="flex items-center gap-3 p-3 bg-white/5 rounded-lg"
                  >
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border"
                      style={{
                        backgroundColor: `${agent.color}20`,
                        borderColor: `${agent.color}40`,
                      }}
                    >
                      <AgentIcon size={18} style={{ color: agent.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-sm truncate">{agent.name}</h4>
                      <p className="text-xs text-gray-500 capitalize">{role.role}</p>
                    </div>
                    {agentStep && getStepStatusIcon(agentStep.status)}
                  </div>
                );
              })}
            </div>
          </GlassCard>

          {/* Stats */}
          {execution && (
            <GlassCard className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp size={18} className="text-green-400" />
                <h3 className="font-bold text-sm">Execution Stats</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-white/5 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Status</p>
                  <p className={`text-sm font-black capitalize text-${getStatusColor(execution.status)}-400`}>
                    {execution.status}
                  </p>
                </div>
                <div className="p-3 bg-white/5 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Duration</p>
                  <p className="text-sm font-black">
                    {execution.duration 
                      ? formatDuration(execution.duration)
                      : formatDuration(Date.now() - new Date(execution.startTime).getTime())
                    }
                  </p>
                </div>
                <div className="p-3 bg-white/5 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Steps</p>
                  <p className="text-sm font-black">
                    {execution.steps.filter(s => s.status === 'completed').length} / {execution.steps.length}
                  </p>
                </div>
                <div className="p-3 bg-white/5 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Messages</p>
                  <p className="text-sm font-black">{execution.messages.length}</p>
                </div>
              </div>
            </GlassCard>
          )}
        </div>

        {/* Right Column - Execution View */}
        <div className="lg:col-span-2 space-y-6">
          {!execution ? (
            <GlassCard className="p-12 text-center">
              <div className="max-w-md mx-auto">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 mx-auto mb-6 flex items-center justify-center">
                  <Play size={40} className="text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-3">Ready to Execute</h3>
                <p className="text-gray-400 mb-6">
                  Enter a task in the control panel and click "Start Execution" to see your team in action.
                </p>
                <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl text-left">
                  <h4 className="font-bold text-sm mb-2 flex items-center gap-2">
                    <AlertCircle size={16} className="text-blue-400" />
                    Tips for better results:
                  </h4>
                  <ul className="text-sm text-gray-400 space-y-1 ml-6 list-disc">
                    <li>Be specific about what you want to accomplish</li>
                    <li>Include any constraints or requirements</li>
                    <li>Mention preferred technologies if relevant</li>
                  </ul>
                </div>
              </div>
            </GlassCard>
          ) : (
            <>
              {/* Status Banner */}
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <GlassCard className={`p-6 border-2 border-${getStatusColor(execution.status)}-500/30`}>
                  <div className="flex items-center gap-4">
                    <div className={`w-16 h-16 rounded-xl bg-${getStatusColor(execution.status)}-500/20 flex items-center justify-center`}>
                      {isRunning && <Loader2 size={32} className="text-blue-500 animate-spin" />}
                      {isCompleted && <CheckCircle2 size={32} className="text-green-500" />}
                      {isFailed && <XCircle size={32} className="text-red-500" />}
                      {isCancelled && <AlertCircle size={32} className="text-yellow-500" />}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold mb-1 capitalize">
                        {execution.status === 'initializing' && 'Initializing Team...'}
                        {execution.status === 'running' && 'Execution in Progress'}
                        {execution.status === 'completed' && 'Execution Completed Successfully'}
                        {execution.status === 'failed' && 'Execution Failed'}
                        {execution.status === 'cancelled' && 'Execution Cancelled'}
                      </h3>
                      <p className="text-sm text-gray-400">
                        {execution.task}
                      </p>
                    </div>
                    {(isCompleted || isFailed || isCancelled) && (
                      <div className="flex gap-2">
                        <button className="p-3 hover:bg-white/10 rounded-xl transition-colors" title="Download Results">
                          <Download size={20} />
                        </button>
                        <button className="p-3 hover:bg-white/10 rounded-xl transition-colors" title="Share">
                          <Share2 size={20} />
                        </button>
                      </div>
                    )}
                  </div>
                </GlassCard>
              </motion.div>

              {/* Execution Steps Timeline */}
              <GlassCard className="p-6">
                <div className="flex items-center gap-2 mb-6">
                  <Workflow size={18} className="text-purple-400" />
                  <h3 className="font-bold">Execution Timeline</h3>
                </div>
                <div className="space-y-4">
                  {execution.steps.length === 0 ? (
                    <div className="text-center py-8">
                      <Loader2 size={32} className="text-gray-600 mx-auto mb-3 animate-spin" />
                      <p className="text-gray-400 text-sm">Preparing execution...</p>
                    </div>
                  ) : (
                    <div className="relative">
                      {/* Timeline line */}
                      <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-white/10" />
                      
                      <AnimatePresence>
                        {execution.steps.map((step, index) => {
                          const agent = agents.find(a => a.id === step.agentId);
                          if (!agent) return null;
                          const AgentIcon = getIconComponent(agent.icon);

                          return (
                            <motion.div
                              key={step.id}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.1 }}
                              className="relative pl-16 pb-6 last:pb-0"
                            >
                              {/* Timeline dot */}
                              <div
                                className="absolute left-0 w-12 h-12 rounded-xl border-2 flex items-center justify-center"
                                style={{
                                  backgroundColor: `${agent.color}20`,
                                  borderColor: `${agent.color}40`,
                                }}
                              >
                                <AgentIcon size={20} style={{ color: agent.color }} />
                              </div>

                              {/* Step content */}
                              <div className={`p-4 rounded-xl border-2 ${
                                step.status === 'completed' ? 'border-green-500/30 bg-green-500/10' :
                                step.status === 'running' ? 'border-blue-500/30 bg-blue-500/10' :
                                step.status === 'failed' ? 'border-red-500/30 bg-red-500/10' :
                                'border-white/10 bg-white/5'
                              }`}>
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <h4 className="font-bold">{step.agentName}</h4>
                                      {getStepStatusIcon(step.status)}
                                    </div>
                                    <p className="text-sm text-gray-400">{step.action}</p>
                                  </div>
                                  {step.duration && (
                                    <span className="text-xs text-gray-500 ml-4">
                                      {formatDuration(step.duration)}
                                    </span>
                                  )}
                                </div>

                                {step.input && (
                                  <div className="mt-3 p-3 bg-white/5 rounded-lg">
                                    <p className="text-xs font-bold text-gray-500 mb-1">INPUT:</p>
                                    <p className="text-sm text-gray-300">{step.input}</p>
                                  </div>
                                )}

                                {step.output && (
                                  <div className="mt-3 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                                    <p className="text-xs font-bold text-green-500 mb-1">OUTPUT:</p>
                                    <p className="text-sm text-gray-300">{step.output}</p>
                                  </div>
                                )}

                                {step.error && (
                                  <div className="mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                                    <p className="text-xs font-bold text-red-500 mb-1">ERROR:</p>
                                    <p className="text-sm text-gray-300">{step.error}</p>
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
                    </div>
                  )}
                </div>
              </GlassCard>

              {/* Communication Log */}
              <GlassCard className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <MessageSquare size={18} className="text-cyan-400" />
                  <h3 className="font-bold">Team Communication</h3>
                  <span className="ml-auto px-2 py-0.5 bg-cyan-500/20 rounded-full text-xs font-black text-cyan-400">
                    {execution.messages.length}
                  </span>
                </div>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {execution.messages.length === 0 ? (
                    <div className="text-center py-8">
                      <MessageSquare size={32} className="text-gray-600 mx-auto mb-3" />
                      <p className="text-gray-400 text-sm">No messages yet</p>
                    </div>
                  ) : (
                    <>
                      {execution.messages.map((message) => {
                        const fromAgent = agents.find(a => a.id === message.from);
                        const typeColors = {
                          task: 'blue',
                          result: 'green',
                          question: 'purple',
                          info: 'cyan',
                          error: 'red',
                        };
                        const color = typeColors[message.type];

                        return (
                          <motion.div
                            key={message.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`p-4 rounded-xl border border-${color}-500/30 bg-${color}-500/10`}
                          >
                            <div className="flex items-start gap-3">
                              {fromAgent && (() => {
                                const AgentIcon = getIconComponent(fromAgent.icon);
                                return (
                                  <div
                                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border"
                                    style={{
                                      backgroundColor: `${fromAgent.color}20`,
                                      borderColor: `${fromAgent.color}40`,
                                    }}
                                  >
                                    <AgentIcon size={14} style={{ color: fromAgent.color }} />
                                  </div>
                                );
                              })()}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-bold text-sm">
                                    {fromAgent?.name || 'System'}
                                  </span>
                                  <span className={`px-2 py-0.5 bg-${color}-500/20 rounded text-xs font-bold text-${color}-400 capitalize`}>
                                    {message.type}
                                  </span>
                                  <span className="text-xs text-gray-500 ml-auto">
                                    {new Date(message.timestamp).toLocaleTimeString()}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-300">{message.content}</p>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </>
                  )}
                </div>
              </GlassCard>

              {/* Final Result */}
              {execution.finalResult && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <GlassCard className="p-6 border-2 border-green-500/30">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                        <CheckCircle2 size={24} className="text-green-500" />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg">Final Result</h3>
                        <p className="text-xs text-gray-400">Aggregated output from all agents</p>
                      </div>
                    </div>
                    <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                      <p className="text-gray-300 whitespace-pre-wrap">{execution.finalResult}</p>
                    </div>
                  </GlassCard>
                </motion.div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
