/**
 * Executions API 服务
 */

import { apiClient } from '../client';
import type { Execution, ExecutionListResponse, ExecutionType, ExecutionStatsByType } from '../types';

export const executionsApi = {
  /**
   * 获取执行历史列表
   */
  list: (params?: {
    skip?: number;
    limit?: number;
    task_id?: number;
    workflow_id?: number;
    execution_type?: ExecutionType;
  }) =>
    apiClient.get<ExecutionListResponse>('/executions/', { params }),

  /**
   * 获取单个执行详情
   */
  get: (id: number) =>
    apiClient.get<Execution>(`/executions/${id}`),

  /**
   * 获取各类型执行数量统计
   */
  getStatsByType: () =>
    apiClient.get<ExecutionStatsByType>('/executions/stats/by-type'),

  /**
   * 删除执行记录
   */
  delete: (id: number) =>
    apiClient.delete<void>(`/executions/${id}`),
};
