/**
 * Dashboard API 服务
 */

import { apiClient } from '../client';
import type { DashboardStats } from '../types';

export const dashboardApi = {
  /**
   * 获取仪表板统计数据
   */
  getStats: () =>
    apiClient.get<DashboardStats>('/dashboard/stats'),
};
