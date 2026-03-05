/**
 * Stats API 服务
 */

import { apiClient } from '../client';
import type { StatsResponse } from '../types';

export const statsApi = {
  /**
   * 获取统计数据
   */
  getAll: () =>
    apiClient.get<StatsResponse>('/stats'),
};
