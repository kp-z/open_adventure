/**
 * Executions API 服务
 */

import { apiClient } from '../client';
import type { Execution, ExecutionListResponse } from '../types';

export const executionsApi = {
  /**
   * 获取执行历史列表
   */
  list: (params?: { skip?: number; limit?: number; task_id?: number }) =>
    apiClient.get<ExecutionListResponse>('/executions/', { params }),

  /**
   * 获取单个执行详情
   */
  get: (id: number) =>
    apiClient.get<Execution>(`/executions/${id}`),

  /**
   * 删除执行记录
   */
  delete: (id: number) =>
    apiClient.delete<void>(`/executions/${id}`),
};
