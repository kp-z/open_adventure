/**
 * Tasks API 服务
 */

import { apiClient } from '../client';
import type { Task, TaskCreate, TaskUpdate, TaskListResponse } from '../types';

export const tasksApi = {
  /**
   * 获取任务列表
   */
  list: (params?: { skip?: number; limit?: number; status?: string; workflow_id?: number }) =>
    apiClient.get<TaskListResponse>('/tasks', { params }),

  /**
   * 获取单个任务详情
   */
  get: (id: number) =>
    apiClient.get<Task>(`/tasks/${id}`),

  /**
   * 创建新任务
   */
  create: (data: TaskCreate) =>
    apiClient.post<Task>('/tasks', data),

  /**
   * 更新任务
   */
  update: (id: number, data: TaskUpdate) =>
    apiClient.put<Task>(`/tasks/${id}`, data),

  /**
   * 删除任务
   */
  delete: (id: number) =>
    apiClient.delete<void>(`/tasks/${id}`),

  /**
   * 取消任务
   */
  cancel: (id: number) =>
    apiClient.post<Task>(`/tasks/${id}/cancel`),
};
