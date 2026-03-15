import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { agentsApi, type Agent } from '@/lib/api';

interface RealAgentsContextType {
  agents: Agent[];
  loading: boolean;
  error: string | null;
  availableModels: Set<string>;
  categories: {
    counts: { builtin: number; user: number; project: number };
    projects: Array<{ id: string; name: string; count: number }>;
  } | null;
  fetchAgents: (activeOnly?: boolean) => Promise<void>;
  fetchCategories: () => Promise<void>;
  fetchAvailableModels: () => Promise<void>;
  syncAgents: () => Promise<{ created: number; updated: number; deleted: number }>;
  deleteAgent: (id: number, deleteFile: boolean) => Promise<void>;
  refreshAll: () => Promise<void>;
}

const RealAgentsContext = createContext<RealAgentsContextType | undefined>(undefined);

export const useRealAgentsContext = () => {
  const context = useContext(RealAgentsContext);
  if (!context) {
    throw new Error('useRealAgentsContext must be used within a RealAgentsProvider');
  }
  return context;
};

export const RealAgentsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [availableModels, setAvailableModels] = useState<Set<string>>(new Set());
  const [categories, setCategories] = useState<{
    counts: { builtin: number; user: number; project: number };
    projects: Array<{ id: string; name: string; count: number }>;
  } | null>(null);

  const fetchAgents = useCallback(async (activeOnly = true) => {
    try {
      const response = await agentsApi.list({
        limit: 1000,
        active_only: activeOnly
      });
      setAgents(response.items);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load agents';
      setError(message);
      console.error('Failed to fetch agents:', err);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const data = await agentsApi.getCategories();

      // 将 plugin scope 的 agent 重新分类到 user 或 project
      const allAgentsResponse = await agentsApi.list({ limit: 1000 });
      const allAgents = allAgentsResponse.items;

      let userCount = data.counts.user || 0;
      let projectCount = data.counts.project || 0;

      allAgents.forEach(agent => {
        if (agent.scope === 'plugin') {
          const path = agent.meta?.path || '';
          const hasClaudePlugins = path.includes('/.claude/plugins/') || path.includes('\\.claude\\plugins\\');
          const hasProjectMarkers = path.includes('/.git/') || path.includes('\\.git\\') ||
                                   path.includes('/package.json') || path.includes('\\package.json');
          const isUserPlugin = hasClaudePlugins && !hasProjectMarkers;

          if (isUserPlugin) {
            userCount++;
          } else {
            projectCount++;
          }
        }
      });

      const transformedData = {
        counts: {
          builtin: data.counts.builtin,
          user: userCount,
          project: projectCount
        },
        projects: data.projects
      };
      setCategories(transformedData);
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  }, []);

  const fetchAvailableModels = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:38080/api/claude/health');
      const health = await response.json();
      const models = health.model_info?.available_models || [];
      const available = new Set(
        models
          .filter((m: any) => m.available)
          .map((m: any) => m.alias)
      );
      setAvailableModels(available);
    } catch (err) {
      console.error('Failed to fetch available models:', err);
    }
  }, []);

  const syncAgents = useCallback(async () => {
    const result = await agentsApi.sync({ include_builtin: true });
    await fetchAgents();
    await fetchCategories();
    return result;
  }, [fetchAgents, fetchCategories]);

  const deleteAgent = useCallback(async (id: number, deleteFile: boolean) => {
    await agentsApi.delete(id, deleteFile);
    await fetchAgents();
  }, [fetchAgents]);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchAgents(),
        fetchCategories(),
        fetchAvailableModels()
      ]);
    } finally {
      setLoading(false);
    }
  }, [fetchAgents, fetchCategories, fetchAvailableModels]);

  // 初始加载
  useEffect(() => {
    refreshAll();
  }, []);

  const value: RealAgentsContextType = {
    agents,
    loading,
    error,
    availableModels,
    categories,
    fetchAgents,
    fetchCategories,
    fetchAvailableModels,
    syncAgents,
    deleteAgent,
    refreshAll,
  };

  return (
    <RealAgentsContext.Provider value={value}>
      {children}
    </RealAgentsContext.Provider>
  );
};
