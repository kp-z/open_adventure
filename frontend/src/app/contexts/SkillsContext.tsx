import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { skillsApi, transformSkillsToUI, type UISkill } from '@/lib/api';

interface SkillsContextType {
  skills: UISkill[];
  loading: boolean;
  error: string | null;
  categories: {
    counts: { builtin: number; user: number; project: number };
    projects: Array<{ id: string; name: string; count: number }>;
  } | null;
  semanticCategories: {
    categories: Array<{ id: string; name: string; count: number }>;
  } | null;
  fetchSkills: () => Promise<void>;
  fetchCategories: () => Promise<void>;
  fetchSemanticCategories: () => Promise<void>;
  syncSkills: () => Promise<{ created: number; updated: number; deleted: number }>;
  deleteSkill: (id: number, deleteFile: boolean) => Promise<void>;
  refreshAll: () => Promise<void>;
}

const SkillsContext = createContext<SkillsContextType | undefined>(undefined);

export const useSkillsContext = () => {
  const context = useContext(SkillsContext);
  if (!context) {
    throw new Error('useSkillsContext must be used within a SkillsProvider');
  }
  return context;
};

export const SkillsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [skills, setSkills] = useState<UISkill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<{
    counts: { builtin: number; user: number; project: number };
    projects: Array<{ id: string; name: string; count: number }>;
  } | null>(null);
  const [semanticCategories, setSemanticCategories] = useState<{
    categories: Array<{ id: string; name: string; count: number }>;
  } | null>(null);

  const fetchSkills = useCallback(async () => {
    try {
      const response = await skillsApi.list({ limit: 1000 });
      const transformed = transformSkillsToUI(response.items);
      setSkills(transformed);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : '获取技能列表失败';
      setError(message);
      console.error('Failed to fetch skills:', err);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const data = await skillsApi.getCategories();
      setCategories(data);
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  }, []);

  const fetchSemanticCategories = useCallback(async () => {
    try {
      const data = await skillsApi.getSemanticCategories();
      setSemanticCategories(data);
    } catch (err) {
      console.error('Failed to fetch semantic categories:', err);
    }
  }, []);

  const syncSkills = useCallback(async () => {
    const result = await skillsApi.sync({ include_builtin: true });
    await fetchSkills();
    await fetchCategories();
    await fetchSemanticCategories();
    return result;
  }, [fetchSkills, fetchCategories, fetchSemanticCategories]);

  const deleteSkill = useCallback(async (id: number, deleteFile: boolean) => {
    await skillsApi.delete(id, deleteFile);
    await fetchSkills();
  }, [fetchSkills]);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchSkills(),
        fetchCategories(),
        fetchSemanticCategories()
      ]);
    } finally {
      setLoading(false);
    }
  }, [fetchSkills, fetchCategories, fetchSemanticCategories]);

  // 初始加载
  useEffect(() => {
    refreshAll();
  }, []);

  const value: SkillsContextType = {
    skills,
    loading,
    error,
    categories,
    semanticCategories,
    fetchSkills,
    fetchCategories,
    fetchSemanticCategories,
    syncSkills,
    deleteSkill,
    refreshAll,
  };

  return (
    <SkillsContext.Provider value={value}>
      {children}
    </SkillsContext.Provider>
  );
};
