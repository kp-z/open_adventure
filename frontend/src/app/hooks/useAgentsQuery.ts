import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { agentsApi } from '@/lib/api';

// Query Keys
export const agentsKeys = {
  all: ['agents'] as const,
  lists: () => [...agentsKeys.all, 'list'] as const,
  list: (filters?: any) => [...agentsKeys.lists(), filters] as const,
  details: () => [...agentsKeys.all, 'detail'] as const,
  detail: (id: string) => [...agentsKeys.details(), id] as const,
};

// Agents Query
export function useAgentsQuery() {
  return useQuery({
    queryKey: agentsKeys.lists(),
    queryFn: async () => {
      const response = await agentsApi.list({ limit: 1000 });
      return response.items;
    },
  });
}

// Agent Detail Query
export function useAgentQuery(id: string) {
  return useQuery({
    queryKey: agentsKeys.detail(id),
    queryFn: async () => {
      const response = await agentsApi.get(parseInt(id));
      return response;
    },
    enabled: !!id,
  });
}

// Create Agent Mutation
export function useCreateAgentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (agentData: any) => {
      const response = await agentsApi.create(agentData);
      return response;
    },
    onSuccess: () => {
      // 刷新 agents 列表
      queryClient.invalidateQueries({ queryKey: agentsKeys.lists() });
    },
  });
}

// Update Agent Mutation
export function useUpdateAgentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await agentsApi.update(parseInt(id), data);
      return response;
    },
    onSuccess: (_, variables) => {
      // 刷新 agents 列表和详情
      queryClient.invalidateQueries({ queryKey: agentsKeys.lists() });
      queryClient.invalidateQueries({ queryKey: agentsKeys.detail(variables.id) });
    },
  });
}

// Delete Agent Mutation
export function useDeleteAgentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await agentsApi.delete(parseInt(id), true);
      return id;
    },
    onMutate: async (id) => {
      // 取消正在进行的查询
      await queryClient.cancelQueries({ queryKey: agentsKeys.lists() });

      // 获取当前数据快照
      const previousAgents = queryClient.getQueryData(agentsKeys.lists());

      // 乐观更新：立即从列表中移除
      queryClient.setQueryData(agentsKeys.lists(), (old: any) => {
        if (!old) return old;
        return old.filter((agent: any) => agent.id !== parseInt(id));
      });

      // 返回快照用于回滚
      return { previousAgents };
    },
    onError: (err, id, context) => {
      // 失败时回滚
      if (context?.previousAgents) {
        queryClient.setQueryData(agentsKeys.lists(), context.previousAgents);
      }
    },
    onSettled: () => {
      // 无论成功失败，都刷新数据
      queryClient.invalidateQueries({ queryKey: agentsKeys.lists() });
    },
  });
}

// Sync Agents Mutation
export function useSyncAgentsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await agentsApi.sync({ include_builtin: true });
      return response;
    },
    onSuccess: () => {
      // 刷新所有 agents 相关数据
      queryClient.invalidateQueries({ queryKey: agentsKeys.all });
    },
  });
}

// Test Agent Mutation
export function useTestAgentMutation() {
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: string }) => {
      const response = await agentsApi.test(parseInt(id), { input });
      return response;
    },
  });
}
