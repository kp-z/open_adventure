/**
 * Dashboard API 服务
 */

import { apiClient } from '../client';
import type { DashboardStats, TokenUsageResponse } from '../types';

export const dashboardApi = {
  /**
   * 获取仪表板统计数据
   */
  getStats: () =>
    apiClient.get<DashboardStats>('/dashboard/stats'),

  /**
   * 获取 token 使用情况
   */
  getTokenUsage: () =>
    apiClient.get<TokenUsageResponse>('/token-usage'),
};
