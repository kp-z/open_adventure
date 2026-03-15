import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { skillsApi, claudeApi } from '@/lib/api';

// Query Keys
export const skillsKeys = {
  all: ['skills'] as const,
  lists: () => [...skillsKeys.all, 'list'] as const,
  list: (filters?: any) => [...skillsKeys.lists(), filters] as const,
  details: () => [...skillsKeys.all, 'detail'] as const,
  detail: (id: string) => [...skillsKeys.details(), id] as const,
  categories: () => ['categories'] as const,
  semanticCategories: () => ['semanticCategories'] as const,
};

// Skills Query
export function useSkillsQuery() {
  return useQuery({
    queryKey: skillsKeys.lists(),
    queryFn: async () => {
      const response = await skillsApi.list({ limit: 1000 });
      return response;
    },
  });
}

// Categories Query
export function useCategoriesQuery() {
  return useQuery({
    queryKey: skillsKeys.categories(),
    queryFn: async () => {
      const data = await skillsApi.getCategories();
      return data;
    },
  });
}

// Semantic Categories Query
export function useSemanticCategoriesQuery() {
  return useQuery({
    queryKey: skillsKeys.semanticCategories(),
    queryFn: async () => {
      const data = await skillsApi.getSemanticCategories();
      return data;
    },
  });
}

// Skill Detail Query
export function useSkillQuery(id: string) {
  return useQuery({
    queryKey: skillsKeys.detail(id),
    queryFn: async () => {
      const response = await skillsApi.get(parseInt(id));
      return response;
    },
    enabled: !!id,
  });
}

// Create Skill Mutation
export function useCreateSkillMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (skillData: any) => {
      const response = await skillsApi.create(skillData);
      return response;
    },
    onSuccess: () => {
      // 刷新 skills 列表
      queryClient.invalidateQueries({ queryKey: skillsKeys.lists() });
    },
  });
}

// Update Skill Mutation
export function useUpdateSkillMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await skillsApi.update(parseInt(id), data);
      return response;
    },
    onSuccess: (_, variables) => {
      // 刷新 skills 列表和详情
      queryClient.invalidateQueries({ queryKey: skillsKeys.lists() });
      queryClient.invalidateQueries({ queryKey: skillsKeys.detail(variables.id) });
    },
  });
}

// Delete Skill Mutation
export function useDeleteSkillMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await skillsApi.delete(parseInt(id));
      return id;
    },
    onMutate: async (id) => {
      // 取消正在进行的查询
      await queryClient.cancelQueries({ queryKey: skillsKeys.lists() });

      // 获取当前数据快照
      const previousSkills = queryClient.getQueryData(skillsKeys.lists());

      // 乐观更新：立即从列表中移除
      queryClient.setQueryData(skillsKeys.lists(), (old: any) => {
        if (!old || !old.items) return old;
        return {
          ...old,
          items: old.items.filter((skill: any) => skill.id !== parseInt(id))
        };
      });

      // 返回快照用于回滚
      return { previousSkills };
    },
    onError: (err, id, context) => {
      // 失败时回滚
      if (context?.previousSkills) {
        queryClient.setQueryData(skillsKeys.lists(), context.previousSkills);
      }
    },
    onSettled: () => {
      // 无论成功失败，都刷新数据
      queryClient.invalidateQueries({ queryKey: skillsKeys.lists() });
    },
  });
}

// Sync Skills Mutation
export function useSyncSkillsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await claudeApi.syncSkills();
      return response;
    },
    onSuccess: () => {
      // 刷新所有 skills 相关数据
      queryClient.invalidateQueries({ queryKey: skillsKeys.all });
    },
  });
}
