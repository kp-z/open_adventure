/**
 * Workflows API 服务
 */

import { apiClient } from '../client';
import type { Workflow, WorkflowCreate, WorkflowUpdate, WorkflowListResponse } from '../types';

export const workflowsApi = {
  /**
   * 获取工作流列表
   */
  list: (params?: { skip?: number; limit?: number }) =>
    apiClient.get<WorkflowListResponse>('/workflows', { params }),

  /**
   * 获取单个工作流详情
   */
  get: (id: number) =>
    apiClient.get<Workflow>(`/workflows/${id}`),

  /**
   * 创建新工作流
   */
  create: (data: WorkflowCreate) =>
    apiClient.post<Workflow>('/workflows', data),

  /**
   * 更新工作流
   */
  update: (id: number, data: WorkflowUpdate) =>
    apiClient.put<Workflow>(`/workflows/${id}`, data),

  /**
   * 删除工作流
   */
  delete: (id: number) =>
    apiClient.delete<void>(`/workflows/${id}`),

  /**
   * 执行工作流
   */
  execute: (id: number, inputData?: Record<string, any>) =>
    apiClient.post<{ task_id: number }>(`/workflows/${id}/execute`, { input_data: inputData }),
};
