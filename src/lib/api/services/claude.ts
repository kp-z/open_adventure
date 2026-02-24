/**
 * Claude API 服务
 * 提供 Claude 环境同步和健康检查接口
 */

import { apiClient } from '../client';
import type { SyncResult, ClaudeHealthResponse } from '../types';

// 同步结果类型
export interface SyncSkillsResult {
  total_scanned: number;
  created: number;
  updated: number;
  errors: string[];
}

export const claudeApi = {
  /**
   * 同步所有 Claude 数据（skills/agents/teams）到数据库
   */
  sync: () => apiClient.post<SyncResult>('/claude/sync'),

  /**
   * 仅同步技能
   */
  syncSkills: () => apiClient.post<SyncSkillsResult>('/claude/sync/skills'),

  /**
   * 仅同步智能体
   */
  syncAgents: () => apiClient.post<SyncSkillsResult>('/claude/sync/agents'),

  /**
   * 仅同步智能体队伍
   */
  syncAgentTeams: () => apiClient.post<SyncSkillsResult>('/claude/sync/agent-teams'),

  /**
   * 检查 Claude 环境健康状态
   */
  health: () => apiClient.get<ClaudeHealthResponse>('/claude/health'),
};
