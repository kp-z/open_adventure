/**
 * Skills API 服务
 * 提供技能的 CRUD、搜索、生成等接口
 */

import { apiClient } from '../client';
import type { Skill, SkillCreate, SkillUpdate, SkillListResponse, SkillSource } from '../types';

// ============ 请求参数类型 ============
export interface SkillListParams {
  skip?: number;
  limit?: number;
  source?: SkillSource;
  enabled?: boolean;
}

export interface SkillSearchParams {
  q: string;
  skip?: number;
  limit?: number;
}

export interface SkillGenerateRequest {
  description: string;
  name?: string;
}

// ============ Claude AI 生成相关类型 ============
export interface ClaudeGenerateRequest {
  description: string;
  skill_name?: string;
  save_to_global?: boolean;
}

export interface SkillFileItem {
  name: string;
  content: string;
  type: string;
}

export interface ClaudeGenerateResponse {
  success: boolean;
  name: string;
  skill_md: string;
  scripts: SkillFileItem[];
  references: SkillFileItem[];
  assets: SkillFileItem[];
  saved_path: string | null;
  message: string;
}

// ============ 保存 Skill 到全局目录类型 ============
export interface SaveSkillRequest {
  name: string;
  skill_md: string;
  scripts?: SkillFileItem[];
  references?: SkillFileItem[];
  assets?: SkillFileItem[];
}

export interface SaveSkillResponse {
  success: boolean;
  saved_path: string;
  message: string;
}

// ============ 获取技能完整内容类型 ============
export interface SkillContentResponse {
  id: number;
  name: string;
  path: string | null;  // 技能目录的实际路径
  skill_md: string;
  scripts: SkillFileItem[];
  references: SkillFileItem[];
  assets: SkillFileItem[];
}

// ============ 响应类型 ============
export interface SkillGenerateResponse {
  name: string;
  full_name: string;
  type: string;
  description: string;
  tags: string[];
}

// ============ API 服务 ============
export const skillsApi = {
  /**
   * 获取技能列表
   * @param params 分页和过滤参数
   */
  list: (params?: SkillListParams) =>
    apiClient.get<SkillListResponse>('/skills', { params }),

  /**
   * 获取技能分类和子分类
   */
  getCategories: () =>
    apiClient.get<{
      counts: { builtin: number; user: number; project: number; plugin: number };
      plugins: Array<{ id: string; name: string; count: number }>;
      projects: Array<{ id: string; name: string; count: number }>;
    }>('/skills/categories'),

  /**
   * 搜索技能
   * @param params 搜索参数（q 为必填）
   */
  search: (params: SkillSearchParams) =>
    apiClient.get<SkillListResponse>('/skills/search', { params }),

  /**
   * 获取单个技能详情
   * @param id 技能 ID
   */
  get: (id: number) =>
    apiClient.get<Skill>(`/skills/${id}`),

  /**
   * 获取技能完整内容（包括文件）
   * @param id 技能 ID
   */
  getContent: (id: number) =>
    apiClient.get<SkillContentResponse>(`/skills/${id}/content`),

  /**
   * 创建新技能
   * @param data 技能数据
   */
  create: (data: SkillCreate) =>
    apiClient.post<Skill>('/skills', data),

  /**
   * 更新技能
   * @param id 技能 ID
   * @param data 更新数据
   */
  update: (id: number, data: SkillUpdate) =>
    apiClient.put<Skill>(`/skills/${id}`, data),

  /**
   * 删除技能
   * @param id 技能 ID
   */
  delete: (id: number) =>
    apiClient.delete<void>(`/skills/${id}`),

  /**
   * AI 生成技能（模板生成）
   * @param data 生成请求
   */
  generate: (data: SkillGenerateRequest) =>
    apiClient.post<SkillGenerateResponse>('/skills/generate', data),

  /**
   * 使用 Claude AI 生成完整 Skill（流式输出）
   * 返回 EventSource 用于接收实时日志
   * @param data 生成请求
   * @param onLog 日志回调
   * @param onComplete 完成回调
   * @param onError 错误回调
   */
  generateWithClaudeStream: (
    data: ClaudeGenerateRequest,
    onLog: (message: string) => void,
    onComplete: (data: ClaudeGenerateResponse) => void,
    onError: (error: string) => void
  ) => {
    const baseURL = apiClient.getBaseURL();
    const url = `${baseURL}/skills/generate-with-claude-stream`;

    // 使用 fetch 实现 SSE
    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    }).then(async (response) => {
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('Response body is null');
      }

      let buffer = ''; // 缓冲区，用于处理不完整的行

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // 将新数据添加到缓冲区
        buffer += decoder.decode(value, { stream: true });

        // 按行分割
        const lines = buffer.split('\n');

        // 保留最后一个不完整的行
        buffer = lines.pop() || '';

        // 处理完整的行
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const jsonStr = line.substring(6).trim();
              if (!jsonStr) continue;

              const event = JSON.parse(jsonStr);

              if (event.type === 'log') {
                onLog(event.message);
              } else if (event.type === 'complete') {
                onComplete(event.data);
              } else if (event.type === 'error') {
                onError(event.message);
              }
            } catch (e) {
              console.error('Failed to parse SSE event:', e, 'Line:', line);
            }
          }
        }
      }

      // 处理缓冲区中剩余的数据
      if (buffer.trim() && buffer.startsWith('data: ')) {
        try {
          const jsonStr = buffer.substring(6).trim();
          if (jsonStr) {
            const event = JSON.parse(jsonStr);
            if (event.type === 'log') {
              onLog(event.message);
            } else if (event.type === 'complete') {
              onComplete(event.data);
            } else if (event.type === 'error') {
              onError(event.message);
            }
          }
        } catch (e) {
          console.error('Failed to parse final SSE event:', e);
        }
      }
    }).catch((error) => {
      console.error('Stream error:', error);
      onError(error.message || '连接失败');
    });
  },

  /**
   * 使用 Claude AI 生成完整 Skill
   * 调用 Claude Code CLI 生成包含 SKILL.md + scripts + references 的完整结构
   * @param data 生成请求
   */
  generateWithClaude: (data: ClaudeGenerateRequest) =>
    apiClient.post<ClaudeGenerateResponse>('/skills/generate-with-claude', data),

  /**
   * 保存 Skill 到全局目录 (~/.claude/skills/)
   * @param data 技能内容（名称、SKILL.md、scripts等）
   */
  saveToGlobal: (data: SaveSkillRequest) =>
    apiClient.post<SaveSkillResponse>('/skills/save-to-global', data),

  /**
   * 切换技能启用状态
   * @param id 技能 ID
   * @param enabled 是否启用
   */
  toggleEnabled: (id: number, enabled: boolean) =>
    apiClient.put<Skill>(`/skills/${id}`, { enabled }),
};
