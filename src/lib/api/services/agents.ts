/**
 * Agents API 服务
 */

import { apiClient } from '../client';
import type { Agent, AgentCreate, AgentUpdate, AgentListResponse } from '../types';

export const agentsApi = {
  /**
   * 获取 Agent 列表
   */
  list: (params?: { skip?: number; limit?: number; type?: string }) =>
    apiClient.get<AgentListResponse>('/agents', { params }),

  /**
   * 获取单个 Agent 详情
   */
  get: (id: number) =>
    apiClient.get<Agent>(`/agents/${id}`),

  /**
   * 创建新 Agent
   */
  create: (data: AgentCreate) =>
    apiClient.post<Agent>('/agents', data),

  /**
   * 更新 Agent
   */
  update: (id: number, data: AgentUpdate) =>
    apiClient.put<Agent>(`/agents/${id}`, data),

  /**
   * 删除 Agent
   */
  delete: (id: number) =>
    apiClient.delete<void>(`/agents/${id}`),
};
