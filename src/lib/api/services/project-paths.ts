/**
 * Project Paths API 服务
 * 提供项目路径配置的 CRUD 接口
 */

import { apiClient } from '../client';

// ============ 类型定义 ============
export interface ProjectPath {
  id: number;
  path: string;
  alias: string | null;
  enabled: boolean;
  recursive_scan: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProjectPathCreate {
  path: string;
  alias?: string | null;
  enabled?: boolean;
  recursive_scan?: boolean;
}

export interface ProjectPathUpdate {
  path?: string;
  alias?: string | null;
  enabled?: boolean;
  recursive_scan?: boolean;
}

export interface ProjectPathListResponse {
  total: number;
  items: ProjectPath[];
}

export interface ProjectPathListParams {
  skip?: number;
  limit?: number;
  enabled?: boolean;
}

// ============ API 方法 ============

/**
 * 获取项目路径列表
 */
export async function listProjectPaths(params?: ProjectPathListParams): Promise<ProjectPathListResponse> {
  return await apiClient.get<ProjectPathListResponse>('/project-paths', { params });
}

/**
 * 获取单个项目路径
 */
export async function getProjectPath(id: number): Promise<ProjectPath> {
  return await apiClient.get<ProjectPath>(`/project-paths/${id}`);
}

/**
 * 创建项目路径
 */
export async function createProjectPath(data: ProjectPathCreate): Promise<ProjectPath> {
  return await apiClient.post<ProjectPath>('/project-paths', data);
}

/**
 * 更新项目路径
 */
export async function updateProjectPath(id: number, data: ProjectPathUpdate): Promise<ProjectPath> {
  return await apiClient.put<ProjectPath>(`/project-paths/${id}`, data);
}

/**
 * 切换项目路径启用状态
 */
export async function toggleProjectPath(id: number): Promise<ProjectPath> {
  return await apiClient.post<ProjectPath>(`/project-paths/${id}/toggle`);
}

/**
 * 删除项目路径
 */
export async function deleteProjectPath(id: number): Promise<void> {
  await apiClient.delete(`/project-paths/${id}`);
}
