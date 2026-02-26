import React, { createContext, useContext, useState, useCallback } from 'react';

// Skill interface - aligned with existing Skills system
export interface Skill {
  id: string;
  name: string;
  description: string;
  category: string;
  enabled: boolean;
}

// Agent interface - based on Claude Code sub-agents concept
export interface Agent {
  id: string;
  name: string;
  description: string;
  
  // AI Model configuration
  model: 'claude-3-opus' | 'claude-3-5-sonnet' | 'claude-3-haiku';
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
  
  // Skills - MCP tools or custom functions
  skills: string[]; // skill IDs
  
  // Sub-agents - delegate specific tasks
  subAgents: string[]; // sub-agent IDs
  
  // Configuration
  color: string; // For visual identification
  icon: string; // lucide-react icon name
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  tags: string[];
  
  // Status and stats
  status: 'active' | 'idle' | 'disabled';
  stats: {
    totalCalls: number;
    successCount: number;
    failCount: number;
    avgResponseTime: number; // in seconds
    lastUsed?: string;
  };
}

interface AgentsContextType {
  // Agents management
  agents: Agent[];
  getAgent: (id: string) => Agent | undefined;
  createAgent: (agent: Omit<Agent, 'id' | 'createdAt' | 'updatedAt' | 'stats'>) => string;
  updateAgent: (id: string, updates: Partial<Agent>) => void;
  deleteAgent: (id: string) => void;
  
  // Sub-agents management
  addSubAgent: (parentId: string, subAgentId: string) => void;
  removeSubAgent: (parentId: string, subAgentId: string) => void;
  getSubAgents: (parentId: string) => Agent[];
  
  // Skills management
  availableSkills: Skill[];
  addSkillToAgent: (agentId: string, skillId: string) => void;
  removeSkillFromAgent: (agentId: string, skillId: string) => void;
  
  // AI Generation
  generateAgentWithAI: (prompt: string) => Promise<Partial<Agent>>;
  
  // Testing
  testAgent: (id: string, input: string) => Promise<{ success: boolean; output: string; duration: number }>;
  
  // Stats
  getAgentStats: () => {
    total: number;
    active: number;
    totalCalls: number;
    avgSuccessRate: number;
  };
}

const AgentsContext = createContext<AgentsContextType | undefined>(undefined);

// Mock skills data - in real app, this would come from Skills context
const mockSkills: Skill[] = [
  {
    id: 'skill-1',
    name: 'Web Search',
    description: 'Search the web for real-time information',
    category: 'browsing',
    enabled: true,
  },
  {
    id: 'skill-2',
    name: 'Python Executor',
    description: 'Execute Python code in sandbox',
    category: 'coding',
    enabled: true,
  },
  {
    id: 'skill-3',
    name: 'File Reader',
    description: 'Read and parse various file formats',
    category: 'data',
    enabled: true,
  },
  {
    id: 'skill-4',
    name: 'API Generator',
    description: 'Generate REST API boilerplate',
    category: 'coding',
    enabled: true,
  },
  {
    id: 'skill-5',
    name: 'Database Query',
    description: 'Query databases with natural language',
    category: 'data',
    enabled: true,
  },
];

// Mock agents data
const createMockAgents = (): Agent[] => [
  {
    id: 'agent-1',
    name: 'Backend Developer',
    description: 'Specialized in backend development, API design, and database optimization',
    model: 'claude-3-5-sonnet',
    systemPrompt: 'You are an expert backend developer with deep knowledge of system architecture, API design patterns, and database optimization. Focus on writing clean, scalable, and maintainable code.',
    temperature: 0.7,
    maxTokens: 4096,
    skills: ['skill-2', 'skill-4', 'skill-5'],
    subAgents: [],
    color: '#3b82f6', // blue
    icon: 'Server',
    createdAt: new Date('2024-01-15').toISOString(),
    updatedAt: new Date().toISOString(),
    tags: ['backend', 'api', 'database'],
    status: 'active',
    stats: {
      totalCalls: 145,
      successCount: 138,
      failCount: 7,
      avgResponseTime: 3.4,
      lastUsed: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    },
  },
  {
    id: 'agent-2',
    name: 'Frontend Developer',
    description: 'Expert in modern frontend frameworks, UI/UX design, and web accessibility',
    model: 'claude-3-5-sonnet',
    systemPrompt: 'You are a frontend development expert specializing in React, TypeScript, and modern UI/UX design patterns. Emphasize accessibility, performance, and user experience.',
    temperature: 0.8,
    maxTokens: 4096,
    skills: ['skill-1'],
    subAgents: [],
    color: '#8b5cf6', // purple
    icon: 'Palette',
    createdAt: new Date('2024-01-10').toISOString(),
    updatedAt: new Date().toISOString(),
    tags: ['frontend', 'react', 'ui/ux'],
    status: 'active',
    stats: {
      totalCalls: 203,
      successCount: 199,
      failCount: 4,
      avgResponseTime: 2.8,
      lastUsed: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    },
  },
  {
    id: 'agent-3',
    name: 'QA Engineer',
    description: 'Focused on testing strategies, quality assurance, and security analysis',
    model: 'claude-3-haiku',
    systemPrompt: 'You are a QA engineer focused on comprehensive testing strategies, security analysis, and code quality. Prioritize edge cases and potential vulnerabilities.',
    temperature: 0.5,
    maxTokens: 2048,
    skills: ['skill-2', 'skill-3'],
    subAgents: [],
    color: '#10b981', // green
    icon: 'ShieldCheck',
    createdAt: new Date('2024-02-01').toISOString(),
    updatedAt: new Date().toISOString(),
    tags: ['testing', 'security', 'qa'],
    status: 'idle',
    stats: {
      totalCalls: 89,
      successCount: 85,
      failCount: 4,
      avgResponseTime: 1.9,
      lastUsed: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    },
  },
  {
    id: 'agent-4',
    name: 'Full Stack Architect',
    description: 'Coordinates multiple specialized agents for full-stack development',
    model: 'claude-3-opus',
    systemPrompt: 'You are a full-stack architect who coordinates between frontend, backend, and QA specialists. Focus on system design and integration.',
    temperature: 0.6,
    maxTokens: 8192,
    skills: ['skill-1', 'skill-4'],
    subAgents: ['agent-1', 'agent-2', 'agent-3'], // Has sub-agents
    color: '#f59e0b', // amber
    icon: 'Network',
    createdAt: new Date('2024-01-20').toISOString(),
    updatedAt: new Date().toISOString(),
    tags: ['fullstack', 'architecture', 'coordination'],
    status: 'active',
    stats: {
      totalCalls: 67,
      successCount: 63,
      failCount: 4,
      avgResponseTime: 5.2,
      lastUsed: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    },
  },
];

export function AgentsProvider({ children }: { children: React.ReactNode }) {
  const [agents, setAgents] = useState<Agent[]>(createMockAgents());

  // Get agent by ID
  const getAgent = useCallback((id: string) => {
    return agents.find(agent => agent.id === id);
  }, [agents]);

  // Create agent
  const createAgent = useCallback((agentData: Omit<Agent, 'id' | 'createdAt' | 'updatedAt' | 'stats'>) => {
    const newAgent: Agent = {
      ...agentData,
      id: `agent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      stats: {
        totalCalls: 0,
        successCount: 0,
        failCount: 0,
        avgResponseTime: 0,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setAgents(prev => [...prev, newAgent]);
    return newAgent.id;
  }, []);

  // Update agent
  const updateAgent = useCallback((id: string, updates: Partial<Agent>) => {
    setAgents(prev =>
      prev.map(agent =>
        agent.id === id
          ? { ...agent, ...updates, updatedAt: new Date().toISOString() }
          : agent
      )
    );
  }, []);

  // Delete agent
  const deleteAgent = useCallback((id: string) => {
    setAgents(prev => {
      // Remove from all parent agents' subAgents arrays
      return prev
        .filter(agent => agent.id !== id)
        .map(agent => ({
          ...agent,
          subAgents: agent.subAgents.filter(subId => subId !== id),
        }));
    });
  }, []);

  // Add sub-agent
  const addSubAgent = useCallback((parentId: string, subAgentId: string) => {
    updateAgent(parentId, {
      subAgents: [...(getAgent(parentId)?.subAgents || []), subAgentId],
    });
  }, [updateAgent, getAgent]);

  // Remove sub-agent
  const removeSubAgent = useCallback((parentId: string, subAgentId: string) => {
    const parent = getAgent(parentId);
    if (parent) {
      updateAgent(parentId, {
        subAgents: parent.subAgents.filter(id => id !== subAgentId),
      });
    }
  }, [updateAgent, getAgent]);

  // Get sub-agents
  const getSubAgents = useCallback((parentId: string) => {
    const parent = getAgent(parentId);
    if (!parent) return [];
    return agents.filter(agent => parent.subAgents.includes(agent.id));
  }, [agents, getAgent]);

  // Add skill to agent
  const addSkillToAgent = useCallback((agentId: string, skillId: string) => {
    const agent = getAgent(agentId);
    if (agent && !agent.skills.includes(skillId)) {
      updateAgent(agentId, {
        skills: [...agent.skills, skillId],
      });
    }
  }, [getAgent, updateAgent]);

  // Remove skill from agent
  const removeSkillFromAgent = useCallback((agentId: string, skillId: string) => {
    const agent = getAgent(agentId);
    if (agent) {
      updateAgent(agentId, {
        skills: agent.skills.filter(id => id !== skillId),
      });
    }
  }, [getAgent, updateAgent]);

  // AI Generation
  const generateAgentWithAI = useCallback(async (prompt: string): Promise<Partial<Agent>> => {
    // Simulate AI generation
    await new Promise(resolve => setTimeout(resolve, 1500));

    const templates = [
      {
        name: 'Code Reviewer',
        description: 'Expert in code review, best practices, and code quality',
        systemPrompt: 'You are an expert code reviewer focused on maintainability, performance, and best practices.',
        tags: ['code-review', 'quality'],
        icon: 'FileSearch',
        color: '#ec4899',
      },
      {
        name: 'Documentation Writer',
        description: 'Specialized in technical documentation and API documentation',
        systemPrompt: 'You are a technical writer expert in creating clear, comprehensive documentation.',
        tags: ['documentation', 'writing'],
        icon: 'FileText',
        color: '#06b6d4',
      },
      {
        name: 'DevOps Engineer',
        description: 'Expert in CI/CD, deployment, and infrastructure automation',
        systemPrompt: 'You are a DevOps expert specializing in CI/CD, containerization, and cloud infrastructure.',
        tags: ['devops', 'ci/cd', 'infrastructure'],
        icon: 'Boxes',
        color: '#f97316',
      },
    ];

    const template = templates[Math.floor(Math.random() * templates.length)];

    return {
      ...template,
      model: 'claude-3-5-sonnet',
      temperature: 0.7,
      maxTokens: 4096,
      skills: [],
      subAgents: [],
      status: 'idle',
    };
  }, []);

  // Test agent
  const testAgent = useCallback(async (id: string, input: string): Promise<{ success: boolean; output: string; duration: number }> => {
    const agent = getAgent(id);
    if (!agent) {
      throw new Error('Agent not found');
    }

    const startTime = Date.now();

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 2000));

    const duration = (Date.now() - startTime) / 1000;
    const success = Math.random() > 0.1; // 90% success rate

    // Update stats
    updateAgent(id, {
      stats: {
        ...agent.stats,
        totalCalls: agent.stats.totalCalls + 1,
        successCount: agent.stats.successCount + (success ? 1 : 0),
        failCount: agent.stats.failCount + (success ? 0 : 1),
        avgResponseTime: (agent.stats.avgResponseTime * agent.stats.totalCalls + duration) / (agent.stats.totalCalls + 1),
        lastUsed: new Date().toISOString(),
      },
    });

    return {
      success,
      output: success
        ? `Based on your input "${input}", here's a response from ${agent.name}. This is a simulated output demonstrating the agent's capabilities with the following skills: ${agent.skills.map(sid => mockSkills.find(s => s.id === sid)?.name).filter(Boolean).join(', ')}.`
        : 'Error: Failed to process the request. Please try again.',
      duration,
    };
  }, [getAgent, updateAgent]);

  // Get stats
  const getAgentStats = useCallback(() => {
    const total = agents.length;
    const active = agents.filter(a => a.status === 'active').length;
    const totalCalls = agents.reduce((sum, a) => sum + a.stats.totalCalls, 0);
    const avgSuccessRate = agents.length > 0
      ? agents.reduce((sum, a) => sum + (a.stats.successCount / (a.stats.totalCalls || 1)) * 100, 0) / agents.length
      : 0;

    return {
      total,
      active,
      totalCalls,
      avgSuccessRate,
    };
  }, [agents]);

  const value: AgentsContextType = {
    agents,
    getAgent,
    createAgent,
    updateAgent,
    deleteAgent,
    addSubAgent,
    removeSubAgent,
    getSubAgents,
    availableSkills: mockSkills,
    addSkillToAgent,
    removeSkillFromAgent,
    generateAgentWithAI,
    testAgent,
    getAgentStats,
  };

  return <AgentsContext.Provider value={value}>{children}</AgentsContext.Provider>;
}

export function useAgents() {
  const context = useContext(AgentsContext);
  if (!context) {
    throw new Error('useAgents must be used within AgentsProvider');
  }
  return context;
}
