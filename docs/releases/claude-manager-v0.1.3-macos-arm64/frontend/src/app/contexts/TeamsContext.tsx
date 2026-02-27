import React, { createContext, useContext, useState, useCallback } from 'react';

// Message types for team communication
export interface TeamMessage {
  id: string;
  from: string; // agent ID or 'system'
  to: string | 'all'; // agent ID or 'all'
  content: string;
  timestamp: string;
  type: 'task' | 'result' | 'question' | 'info' | 'error';
}

// Execution step for tracking
export interface ExecutionStep {
  id: string;
  agentId: string;
  agentName: string;
  action: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startTime?: string;
  endTime?: string;
  duration?: number; // in ms
  input?: string;
  output?: string;
  error?: string;
}

// Team execution result
export interface TeamExecution {
  id: string;
  teamId: string;
  teamName: string;
  task: string;
  status: 'initializing' | 'running' | 'completed' | 'failed' | 'cancelled';
  startTime: string;
  endTime?: string;
  duration?: number;
  steps: ExecutionStep[];
  messages: TeamMessage[];
  finalResult?: string;
  error?: string;
}

// Agent role in team
export interface AgentRole {
  agentId: string;
  role: 'leader' | 'coordinator' | 'specialist' | 'support';
  responsibilities: string[];
  canDelegate: boolean;
  priority: number; // execution order priority
}

// Team workflow configuration
export interface TeamWorkflow {
  strategy: 'sequential' | 'parallel' | 'dynamic' | 'hierarchical';
  // Sequential: agents work one after another
  // Parallel: all agents work simultaneously  
  // Dynamic: coordinator assigns tasks based on context
  // Hierarchical: leader delegates to sub-teams
  
  taskDistribution: 'manual' | 'auto-balanced' | 'skill-based' | 'leader-assigned';
  // How tasks are distributed among agents
  
  communicationMode: 'direct' | 'hub-spoke' | 'broadcast' | 'selective';
  // Direct: agents communicate directly
  // Hub-spoke: all through coordinator
  // Broadcast: messages to all
  // Selective: based on relevance
  
  resultAggregation: 'concatenate' | 'synthesize' | 'vote' | 'leader-decides';
  // How to combine results from multiple agents
  
  errorHandling: 'abort' | 'skip' | 'retry' | 'delegate';
  // What to do when an agent fails
  
  maxParallelTasks: number;
  taskTimeout: number; // in seconds
}

// Team interface
export interface Team {
  id: string;
  name: string;
  description: string;
  purpose: string; // What this team is designed for
  
  // Team composition
  roles: AgentRole[];
  
  // Workflow configuration
  workflow: TeamWorkflow;
  
  // Context sharing
  sharedContext: {
    enabled: boolean;
    scope: 'all' | 'relevant' | 'minimal';
    includeHistory: boolean;
  };
  
  // Visual identity
  color: string;
  icon: string;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  tags: string[];
  
  // Status
  status: 'active' | 'idle' | 'archived';
  
  // Stats
  stats: {
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    avgExecutionTime: number; // in seconds
    lastUsed?: string;
  };
}

interface TeamsContextType {
  // Teams management
  teams: Team[];
  getTeam: (id: string) => Team | undefined;
  createTeam: (team: Omit<Team, 'id' | 'createdAt' | 'updatedAt' | 'stats'>) => string;
  updateTeam: (id: string, updates: Partial<Team>) => void;
  deleteTeam: (id: string) => void;
  
  // Role management
  addRole: (teamId: string, role: AgentRole) => void;
  updateRole: (teamId: string, agentId: string, updates: Partial<AgentRole>) => void;
  removeRole: (teamId: string, agentId: string) => void;
  
  // Execution
  executions: TeamExecution[];
  executeTeam: (teamId: string, task: string) => Promise<string>; // returns execution ID
  cancelExecution: (executionId: string) => void;
  getExecution: (executionId: string) => TeamExecution | undefined;
  
  // AI Generation
  generateTeamWithAI: (prompt: string) => Promise<Partial<Team>>;
  
  // Stats
  getTeamStats: () => {
    total: number;
    active: number;
    totalExecutions: number;
    avgSuccessRate: number;
  };
}

const TeamsContext = createContext<TeamsContextType | undefined>(undefined);

// Mock teams data
const createMockTeams = (): Team[] => [
  {
    id: 'team-1',
    name: 'Full-Stack Development Team',
    description: 'End-to-end application development with frontend, backend, and database specialists',
    purpose: 'Build complete web applications from requirements to deployment',
    roles: [
      {
        agentId: 'agent-1',
        role: 'leader',
        responsibilities: ['Architecture decisions', 'Code review', 'Integration'],
        canDelegate: true,
        priority: 1,
      },
      {
        agentId: 'agent-2',
        role: 'specialist',
        responsibilities: ['Frontend development', 'UI/UX implementation'],
        canDelegate: false,
        priority: 2,
      },
    ],
    workflow: {
      strategy: 'hierarchical',
      taskDistribution: 'leader-assigned',
      communicationMode: 'hub-spoke',
      resultAggregation: 'synthesize',
      errorHandling: 'retry',
      maxParallelTasks: 3,
      taskTimeout: 300,
    },
    sharedContext: {
      enabled: true,
      scope: 'all',
      includeHistory: true,
    },
    color: '#3b82f6',
    icon: 'Layers',
    createdAt: new Date('2024-01-15').toISOString(),
    updatedAt: new Date().toISOString(),
    tags: ['development', 'full-stack'],
    status: 'active',
    stats: {
      totalExecutions: 45,
      successfulExecutions: 42,
      failedExecutions: 3,
      avgExecutionTime: 120,
      lastUsed: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    },
  },
  {
    id: 'team-2',
    name: 'Data Analysis Pipeline',
    description: 'Parallel data processing and analysis team with specialized analyzers',
    purpose: 'Process and analyze large datasets in parallel',
    roles: [
      {
        agentId: 'agent-3',
        role: 'coordinator',
        responsibilities: ['Task distribution', 'Result aggregation'],
        canDelegate: true,
        priority: 1,
      },
    ],
    workflow: {
      strategy: 'parallel',
      taskDistribution: 'auto-balanced',
      communicationMode: 'hub-spoke',
      resultAggregation: 'synthesize',
      errorHandling: 'skip',
      maxParallelTasks: 5,
      taskTimeout: 180,
    },
    sharedContext: {
      enabled: true,
      scope: 'relevant',
      includeHistory: false,
    },
    color: '#10b981',
    icon: 'GitBranch',
    createdAt: new Date('2024-02-01').toISOString(),
    updatedAt: new Date().toISOString(),
    tags: ['data', 'analysis'],
    status: 'active',
    stats: {
      totalExecutions: 38,
      successfulExecutions: 36,
      failedExecutions: 2,
      avgExecutionTime: 95,
      lastUsed: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    },
  },
];

export const TeamsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [teams, setTeams] = useState<Team[]>(createMockTeams());
  const [executions, setExecutions] = useState<TeamExecution[]>([]);

  // Get team by ID
  const getTeam = useCallback((id: string) => {
    return teams.find(team => team.id === id);
  }, [teams]);

  // Create team
  const createTeam = useCallback((teamData: Omit<Team, 'id' | 'createdAt' | 'updatedAt' | 'stats'>) => {
    const newTeam: Team = {
      ...teamData,
      id: `team-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      stats: {
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        avgExecutionTime: 0,
      },
    };

    setTeams(prev => [...prev, newTeam]);
    return newTeam.id;
  }, []);

  // Update team
  const updateTeam = useCallback((id: string, updates: Partial<Team>) => {
    setTeams(prev => prev.map(team => 
      team.id === id 
        ? { ...team, ...updates, updatedAt: new Date().toISOString() }
        : team
    ));
  }, []);

  // Delete team
  const deleteTeam = useCallback((id: string) => {
    setTeams(prev => prev.filter(team => team.id !== id));
  }, []);

  // Add role
  const addRole = useCallback((teamId: string, role: AgentRole) => {
    setTeams(prev => prev.map(team => 
      team.id === teamId
        ? { 
            ...team, 
            roles: [...team.roles, role],
            updatedAt: new Date().toISOString() 
          }
        : team
    ));
  }, []);

  // Update role
  const updateRole = useCallback((teamId: string, agentId: string, updates: Partial<AgentRole>) => {
    setTeams(prev => prev.map(team => 
      team.id === teamId
        ? { 
            ...team, 
            roles: team.roles.map(role => 
              role.agentId === agentId ? { ...role, ...updates } : role
            ),
            updatedAt: new Date().toISOString() 
          }
        : team
    ));
  }, []);

  // Remove role
  const removeRole = useCallback((teamId: string, agentId: string) => {
    setTeams(prev => prev.map(team => 
      team.id === teamId
        ? { 
            ...team, 
            roles: team.roles.filter(role => role.agentId !== agentId),
            updatedAt: new Date().toISOString() 
          }
        : team
    ));
  }, []);

  // Execute team (simulate)
  const executeTeam = useCallback(async (teamId: string, task: string): Promise<string> => {
    const team = getTeam(teamId);
    if (!team) throw new Error('Team not found');

    const executionId = `exec-${Date.now()}`;
    const execution: TeamExecution = {
      id: executionId,
      teamId: team.id,
      teamName: team.name,
      task,
      status: 'initializing',
      startTime: new Date().toISOString(),
      steps: [],
      messages: [],
    };

    setExecutions(prev => [...prev, execution]);

    // Simulate execution
    setTimeout(() => {
      setExecutions(prev => prev.map(exec => 
        exec.id === executionId 
          ? { ...exec, status: 'running' }
          : exec
      ));

      // Simulate steps based on workflow strategy
      const simulateSteps = async () => {
        const steps: ExecutionStep[] = [];
        
        for (let i = 0; i < team.roles.length; i++) {
          const role = team.roles[i];
          const stepId = `step-${i}`;
          const step: ExecutionStep = {
            id: stepId,
            agentId: role.agentId,
            agentName: `Agent ${role.agentId}`,
            action: `Processing: ${role.responsibilities[0]}`,
            status: 'running',
            startTime: new Date().toISOString(),
          };

          steps.push(step);
          
          setExecutions(prev => prev.map(exec => 
            exec.id === executionId 
              ? { ...exec, steps: [...exec.steps, step] }
              : exec
          ));

          // Simulate work
          await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 2000));

          // Complete step
          const completedStep: ExecutionStep = {
            ...step,
            status: 'completed',
            endTime: new Date().toISOString(),
            duration: 2000 + Math.random() * 2000,
            output: `Completed ${role.responsibilities[0]}`,
          };

          setExecutions(prev => prev.map(exec => 
            exec.id === executionId 
              ? { 
                  ...exec, 
                  steps: exec.steps.map(s => s.id === stepId ? completedStep : s) 
                }
              : exec
          ));

          // Add message
          const message: TeamMessage = {
            id: `msg-${Date.now()}-${i}`,
            from: role.agentId,
            to: 'all',
            content: `Finished: ${role.responsibilities[0]}`,
            timestamp: new Date().toISOString(),
            type: 'result',
          };

          setExecutions(prev => prev.map(exec => 
            exec.id === executionId 
              ? { ...exec, messages: [...exec.messages, message] }
              : exec
          ));
        }

        // Complete execution
        setExecutions(prev => prev.map(exec => 
          exec.id === executionId 
            ? { 
                ...exec, 
                status: 'completed',
                endTime: new Date().toISOString(),
                duration: Date.now() - new Date(exec.startTime).getTime(),
                finalResult: 'Team task completed successfully',
              }
            : exec
        ));

        // Update team stats
        setTeams(prev => prev.map(t => 
          t.id === teamId
            ? {
                ...t,
                stats: {
                  ...t.stats,
                  totalExecutions: t.stats.totalExecutions + 1,
                  successfulExecutions: t.stats.successfulExecutions + 1,
                  lastUsed: new Date().toISOString(),
                },
              }
            : t
        ));
      };

      simulateSteps();
    }, 500);

    return executionId;
  }, [getTeam]);

  // Cancel execution
  const cancelExecution = useCallback((executionId: string) => {
    setExecutions(prev => prev.map(exec => 
      exec.id === executionId
        ? { 
            ...exec, 
            status: 'cancelled',
            endTime: new Date().toISOString(),
            duration: Date.now() - new Date(exec.startTime).getTime(),
          }
        : exec
    ));
  }, []);

  // Get execution
  const getExecution = useCallback((executionId: string) => {
    return executions.find(exec => exec.id === executionId);
  }, [executions]);

  // AI Generation (mock)
  const generateTeamWithAI = useCallback(async (prompt: string): Promise<Partial<Team>> => {
    await new Promise(resolve => setTimeout(resolve, 1500));

    return {
      name: 'AI Generated Team',
      description: `Team generated based on: ${prompt}`,
      purpose: 'AI-suggested purpose',
      tags: ['ai-generated'],
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
    };
  }, []);

  // Get team stats
  const getTeamStats = useCallback(() => {
    const total = teams.length;
    const active = teams.filter(t => t.status === 'active').length;
    const totalExecutions = teams.reduce((sum, t) => sum + t.stats.totalExecutions, 0);
    const totalSuccessful = teams.reduce((sum, t) => sum + t.stats.successfulExecutions, 0);
    const avgSuccessRate = totalExecutions > 0 ? (totalSuccessful / totalExecutions) * 100 : 0;

    return {
      total,
      active,
      totalExecutions,
      avgSuccessRate,
    };
  }, [teams]);

  const value: TeamsContextType = {
    teams,
    getTeam,
    createTeam,
    updateTeam,
    deleteTeam,
    addRole,
    updateRole,
    removeRole,
    executions,
    executeTeam,
    cancelExecution,
    getExecution,
    generateTeamWithAI,
    getTeamStats,
  };

  return <TeamsContext.Provider value={value}>{children}</TeamsContext.Provider>;
};

export const useTeams = () => {
  const context = useContext(TeamsContext);
  if (!context) {
    throw new Error('useTeams must be used within TeamsProvider');
  }
  return context;
};
