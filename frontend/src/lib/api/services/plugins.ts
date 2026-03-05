/**
 * Plugin API 服务
 */

import { apiClient } from '../client';

export type PluginStatus = 'installed' | 'update_available' | 'installing' | 'updating' | 'error';

export interface Plugin {
  id: number;
  name: string;
  display_name: string;
  description: string;
  git_repo_url: string;
  branch: string;
  local_commit_hash: string | null;
  remote_commit_hash: string | null;
  status: PluginStatus;
  enabled: boolean;
  local_path: string | null;
  last_check_time: string | null;
  created_at: string;
  updated_at: string;
}

export interface PluginCreate {
  name: string;
  display_name: string;
  description: string;
  git_repo_url: string;
  branch?: string;
  local_path?: string;
  local_commit_hash?: string;
}

export interface PluginUpdate {
  display_name?: string;
  description?: string;
  git_repo_url?: string;
  branch?: string;
  local_commit_hash?: string;
  remote_commit_hash?: string;
  status?: PluginStatus;
  enabled?: boolean;
}

export interface PluginListResponse {
  total: number;
  items: Plugin[];
}

/**
 * 获取所有 Plugin 列表
 */
export async function list(params?: {
  skip?: number;
  limit?: number;
  status?: PluginStatus;
  enabled?: boolean;
}): Promise<PluginListResponse> {
  return apiClient.get<PluginListResponse>('/plugins', { params });
}

/**
 * 获取单个 Plugin
 */
export async function get(id: number): Promise<Plugin> {
  return apiClient.get<Plugin>(`/plugins/${id}`);
}

/**
 * 创建新的 Plugin
 */
export async function create(data: PluginCreate): Promise<Plugin> {
  return apiClient.post<Plugin>('/plugins', data);
}

/**
 * 更新 Plugin
 */
export async function update(id: number, data: PluginUpdate): Promise<Plugin> {
  return apiClient.put<Plugin>(`/plugins/${id}`, data);
}

/**
 * 删除 Plugin
 */
export async function remove(id: number, removeFiles: boolean = false): Promise<{ success: boolean }> {
  return apiClient.delete<{ success: boolean }>(`/plugins/${id}`, {
    params: { remove_files: removeFiles }
  });
}

/**
 * 检查单个 Plugin 的更新
 */
export async function checkUpdate(id: number): Promise<Plugin> {
  return apiClient.post<Plugin>(`/plugins/${id}/check-update`);
}

/**
 * 检查所有 Plugin 的更新
 */
export async function checkAllUpdates(): Promise<PluginListResponse> {
  return apiClient.post<PluginListResponse>('/plugins/check-all-updates');
}

/**
 * 安装 Plugin (git clone)
 */
export async function install(id: number): Promise<Plugin> {
  return apiClient.post<Plugin>(`/plugins/${id}/install`);
}

/**
 * 更新 Plugin 文件 (git pull)
 */
export async function updateFiles(id: number): Promise<Plugin> {
  return apiClient.post<Plugin>(`/plugins/${id}/update`);
}

/**
 * 扫描 marketplace 目录
 */
export async function scan(): Promise<PluginListResponse> {
  return apiClient.post<PluginListResponse>('/plugins/scan');
}
