/**
 * Teams API 服务
 */

import { apiClient } from '../client';
import type { Team, TeamCreate, TeamUpdate, TeamListResponse } from '../types';

export const teamsApi = {
  /**
   * 获取团队列表
   */
  list: (params?: { skip?: number; limit?: number }) =>
    apiClient.get<TeamListResponse>('/agent-teams', { params }),

  /**
   * 获取单个团队详情
   */
  get: (id: number) =>
    apiClient.get<Team>(`/agent-teams/${id}`),

  /**
   * 创建新团队
   */
  create: (data: TeamCreate) =>
    apiClient.post<Team>('/agent-teams', data),

  /**
   * 更新团队
   */
  update: (id: number, data: TeamUpdate) =>
    apiClient.put<Team>(`/agent-teams/${id}`, data),

  /**
   * 删除团队
   */
  delete: (id: number) =>
    apiClient.delete<void>(`/agent-teams/${id}`),
};
