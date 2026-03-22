/**
 * Project 索引 API（Workspace / .claude 控制面）
 */
import { apiClient } from '../client';

export interface ProjectRecord {
  id: number;
  name: string;
  path: string | null;
  description: string | null;
  has_agent: boolean;
  has_workspace: boolean;
  /** 与 has_workspace 不同：表示 .claude/config 里 workspace 已扫描（Init Workspace 完成） */
  workspace_scanned: boolean;
  workspace_port: number | null;
  git_remote: string | null;
  git_branch: string | null;
  last_sync_at: string | null;
  meta: Record<string, unknown> | null;
  agent_id: number | null;  // 关联的 Project Agent ID
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceConfig {
  enabled: boolean;
  port: number | null;
  auto_start: boolean;
  frontend_entry: string | null;
  start_command: string | null;
  framework: string | null;
  package_manager: string | null;
  scanned: boolean;
  scanned_at: string | null;
}

export interface ScanResultResponse {
  success: boolean;
  workspace_config: WorkspaceConfig;
  message: string | null;
}

export interface ScreenshotResponse {
  success: boolean;
  path: string | null;
  message: string | null;
}

export interface ProjectListResponse {
  items: ProjectRecord[];
  total: number;
  skip: number;
  limit: number;
}

export interface ProjectCreate {
  name: string;
  path?: string | null;
  description?: string | null;
  meta?: Record<string, unknown> | null;
}

export interface ProjectCreateFromPath {
  path: string;
  name?: string | null;
  description?: string | null;
}

export interface ProjectUpdate {
  name?: string;
  description?: string | null;
  workspace_port?: number | null;
  meta?: Record<string, unknown> | null;
  is_pinned?: boolean;
}

export interface WorkspaceStatus {
  running: boolean;
  url: string | null;
  port: number | null;
  pid: number | null;
  started_at: string | null;
  health: string;
  last_error: string | null;
  phase: string;
}

export interface ProjectScanRequest {
  root_path: string;
  max_depth?: number;
}

export interface ProjectScanResult {
  discovered: string[];
  created_ids: number[];
}

export async function listProjects(params?: { skip?: number; limit?: number }): Promise<ProjectListResponse> {
  return apiClient.get<ProjectListResponse>('/projects', { params });
}

export async function getProject(id: number): Promise<ProjectRecord> {
  return apiClient.get<ProjectRecord>(`/projects/${id}`);
}

export async function createProject(data: ProjectCreate): Promise<ProjectRecord> {
  return apiClient.post<ProjectRecord>('/projects', data);
}

export async function createProjectFromPath(data: ProjectCreateFromPath): Promise<ProjectRecord> {
  return apiClient.post<ProjectRecord>('/projects/from-path', data);
}

export async function updateProject(id: number, data: ProjectUpdate): Promise<ProjectRecord> {
  return apiClient.put<ProjectRecord>(`/projects/${id}`, data);
}

export async function deleteProject(id: number): Promise<void> {
  await apiClient.delete(`/projects/${id}`);
}

export async function syncProject(id: number): Promise<ProjectRecord> {
  return apiClient.post<ProjectRecord>(`/projects/${id}/sync`);
}

export async function initProjectClaude(id: number): Promise<{ agent_md_written: boolean; config_path: string }> {
  return apiClient.post(`/projects/${id}/init`);
}

export async function getProjectConfig(id: number): Promise<Record<string, unknown>> {
  return apiClient.get<Record<string, unknown>>(`/projects/${id}/config`);
}

export async function putProjectConfig(id: number, raw: Record<string, unknown>): Promise<Record<string, unknown>> {
  return apiClient.put<Record<string, unknown>>(`/projects/${id}/config`, { raw });
}

export async function getProjectAgent(id: number): Promise<{ content: string | null }> {
  return apiClient.get<{ content: string | null }>(`/projects/${id}/agent`);
}

export async function putProjectAgent(id: number, content: string): Promise<{ ok: boolean }> {
  return apiClient.put<{ ok: boolean }>(`/projects/${id}/agent`, { content });
}

export async function getWorkspaceStatus(id: number): Promise<WorkspaceStatus> {
  return apiClient.get<WorkspaceStatus>(`/projects/${id}/workspace/status`);
}

export async function startWorkspace(id: number): Promise<WorkspaceStatus> {
  return apiClient.post<WorkspaceStatus>(`/projects/${id}/workspace/start`, {});
}

export async function stopWorkspace(id: number): Promise<{ success: boolean; message: string }> {
  return apiClient.post(`/projects/${id}/workspace/stop`, {});
}

export async function restartWorkspace(id: number): Promise<WorkspaceStatus> {
  return apiClient.post<WorkspaceStatus>(`/projects/${id}/workspace/restart`, {});
}

export async function initWorkspace(id: number): Promise<{ web_path: string; message: string }> {
  return apiClient.post(`/projects/${id}/workspace/init`, {});
}

export async function getWorkspaceLogs(id: number): Promise<{ lines: string[]; note?: string }> {
  return apiClient.get(`/projects/${id}/workspace/logs`);
}

export async function scanProjects(body: ProjectScanRequest): Promise<ProjectScanResult> {
  return apiClient.post<ProjectScanResult>('/projects/scan', body);
}

export interface SyncFromPathsResult {
  synced: number;
  skipped: number;
  errors: number;
  total_paths: number;
}

/**
 * 从 project_paths 同步项目到 projects 表
 * 将 enabled 的 project_paths 自动创建为 Project（如果不存在）
 */
export async function syncFromPaths(): Promise<SyncFromPathsResult> {
  return apiClient.post<SyncFromPathsResult>('/projects/sync-from-paths', {});
}

/**
 * 绑定 Agent 到 Project
 */
export async function bindAgent(projectId: number, agentId: number): Promise<ProjectRecord> {
  return apiClient.post<ProjectRecord>(`/projects/${projectId}/bind-agent`, { agent_id: agentId });
}

/**
 * 解绑 Project 的 Agent
 */
export async function unbindAgent(projectId: number): Promise<ProjectRecord> {
  return apiClient.delete<ProjectRecord>(`/projects/${projectId}/bind-agent`);
}

/**
 * 手动触发项目扫描（由 Agent 执行）
 */
export async function scanProjectStructure(projectId: number): Promise<ScanResultResponse> {
  return apiClient.post<ScanResultResponse>(`/projects/${projectId}/scan`, {});
}

/**
 * 手动触发截图
 */
export async function captureScreenshot(projectId: number): Promise<ScreenshotResponse> {
  return apiClient.post<ScreenshotResponse>(`/projects/${projectId}/screenshot`, {});
}

/**
 * 获取项目缩略图 URL
 */
export function getThumbnailUrl(projectId: number): string {
  return `/api/projects/${projectId}/thumbnail`;
}
