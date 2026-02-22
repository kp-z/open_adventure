/**
 * Skills API 服务
 */

import { apiClient } from '../client';
import type { Skill, SkillCreate, SkillUpdate, SkillListResponse } from '../types';

export const skillsApi = {
  /**
   * 获取技能列表
   */
  list: (params?: { skip?: number; limit?: number; source?: string }) =>
    apiClient.get<SkillListResponse>('/skills', { params }),

  /**
   * 获取单个技能详情
   */
  get: (id: number) =>
    apiClient.get<Skill>(`/skills/${id}`),

  /**
   * 创建新技能
   */
  create: (data: SkillCreate) =>
    apiClient.post<Skill>('/skills', data),

  /**
   * 更新技能
   */
  update: (id: number, data: SkillUpdate) =>
    apiClient.put<Skill>(`/skills/${id}`, data),

  /**
   * 删除技能
   */
  delete: (id: number) =>
    apiClient.delete<void>(`/skills/${id}`),

  /**
   * 同步技能（从 Claude CLI）
   */
  sync: () =>
    apiClient.post<{ synced_count: number }>('/skills/sync'),

  /**
   * AI 生成技能
   */
  generate: (description: string, name?: string) =>
    apiClient.post<Skill>('/skills/generate', { description, name }),
};
