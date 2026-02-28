/**
 * Plugin API 服务
 */

import { apiClient } from '../client';

export interface Plugin {
  name: string;
  path: string;
}

export interface PluginCreate {
  name: string;
  description?: string;
  author?: string;
}

export interface PluginListResponse {
  items: Plugin[];
}

/**
 * 获取所有已安装的 Plugin 列表
 */
export async function list(): Promise<Plugin[]> {
  const response = await apiClient.get<PluginListResponse>('/plugins');
  return response.items;
}

/**
 * 创建新的 Plugin
 */
export async function create(data: PluginCreate): Promise<Plugin> {
  return apiClient.post<Plugin>('/plugins', data);
}
