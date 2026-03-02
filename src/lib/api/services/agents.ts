/**
 * Agents API 服务 - Claude Code Subagent 管理
 *
 * 提供子代理的完整生命周期管理：
 * - 同步本地 agents
 * - CRUD 操作
 * - 使用 Claude 生成
 * - 文件内容读写
 */

import { apiClient } from '../client';
import type {
  Agent,
  AgentCreate,
  AgentUpdate,
  AgentListResponse,
  AgentScope,
  AgentSyncRequest,
  AgentSyncResponse,
  AgentGenerateRequest,
  AgentGenerateResponse,
  AgentFileContent
} from '../types';

export const agentsApi = {
  /**
   * 同步本地子代理到数据库
   *
   * 扫描范围：用户级、项目级、插件级、内置
   */
  sync: (request?: AgentSyncRequest) =>
    apiClient.post<AgentSyncResponse>('/agents/sync', request || {}),

  /**
   * 获取子代理列表
   *
   * @param params.skip - 跳过数量
   * @param params.limit - 返回数量
   * @param params.scope - 过滤作用域
   * @param params.active_only - 仅返回激活的（未被覆盖的）
   */
  list: (params?: {
    skip?: number;
    limit?: number;
    scope?: AgentScope;
    active_only?: boolean;
  }) =>
    apiClient.get<AgentListResponse>('/agents', { params }),

  /**
   * 获取代理分类和子分类
   */
  getCategories: () =>
    apiClient.get<{
      counts: { builtin: number; user: number; project: number; plugin: number };
      plugins: Array<{ id: string; name: string; count: number }>;
      projects: Array<{ id: string; name: string; count: number }>;
    }>('/agents/categories'),

  /**
   * 搜索子代理
   */
  search: (params: {
    q: string;
    skip?: number;
    limit?: number;
  }) =>
    apiClient.get<AgentListResponse>('/agents/search', { params }),

  /**
   * 获取作用域统计
   */
  getScopeStats: () =>
    apiClient.get<Record<string, number>>('/agents/scopes'),

  /**
   * 获取单个子代理详情
   */
  get: (id: number) =>
    apiClient.get<Agent>(`/agents/${id}`),

  /**
   * 获取子代理文件内容（用于编辑）
   */
  getContent: (id: number) =>
    apiClient.get<AgentFileContent>(`/agents/${id}/content`),

  /**
   * 创建新子代理
   *
   * 会在对应作用域目录下创建 Markdown 文件
   */
  create: (data: AgentCreate) =>
    apiClient.post<Agent>('/agents', data),

  /**
   * 更新子代理配置
   */
  update: (id: number, data: AgentUpdate) =>
    apiClient.put<Agent>(`/agents/${id}`, data),

  /**
   * 更新子代理文件内容
   *
   * 直接覆盖原始 Markdown 文件
   */
  updateContent: (id: number, content: AgentFileContent) =>
    apiClient.put<Agent>(`/agents/${id}/content`, content),

  /**
   * 删除子代理
   *
   * @param id - 子代理 ID
   * @param deleteFile - 是否同时删除文件，默认 true
   */
  delete: (id: number, deleteFile: boolean = true) =>
    apiClient.delete<void>(`/agents/${id}`, {
      params: { delete_file: deleteFile }
    }),

  /**
   * 测试子代理
   *
   * 使用 Claude CLI 运行指定的子代理处理提示
   */
  test: (id: number, prompt: string) =>
    apiClient.post<{
      success: boolean;
      output: string;
      duration: number;
      model: string;
    }>(`/agents/${id}/test`, null, { params: { prompt } }),

  /**
   * 测试子代理（流式输出）
   *
   * 实时接收 shell 日志输出
   * @param id Agent ID
   * @param prompt 测试提示
   * @param onLog 日志回调
   * @param onComplete 完成回调
   * @param onError 错误回调
   */
  testStream: (
    id: number,
    prompt: string,
    onLog: (message: string) => void,
    onComplete: (data: { success: boolean; output: string; duration: number; model: string }) => void,
    onError: (error: string) => void
  ) => {
    const baseURL = apiClient.getBaseURL();
    const url = `${baseURL}/agents/${id}/test-stream?prompt=${encodeURIComponent(prompt)}`;

    // 使用 fetch 实现 SSE
    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
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

      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

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
   * 使用 Claude 生成子代理配置
   *
   * 类似 /agents 命令的 "Generate with Claude" 功能
   */
  generate: (request: AgentGenerateRequest) =>
    apiClient.post<AgentGenerateResponse>('/agents/generate', request),

  /**
   * 保存生成的子代理到文件
   */
  saveGenerated: (params: {
    content: string;
    scope?: AgentScope;
    project_path?: string;
  }) =>
    apiClient.post<Agent>('/agents/generate/save', null, {
      params: {
        content: params.content,
        scope: params.scope || 'user',
        project_path: params.project_path
      }
    }),

  /**
   * 查询 Agent 运行状态
   */
  getStatus: (id: number) =>
    apiClient.get<{
      status: 'idle' | 'running';
      execution_id: number | null;
      session_id: string | null;
      last_activity_at: string | null;
    }>(`/agents/${id}/status`),

  /**
   * 停止 Agent 运行
   */
  stop: (id: number) =>
    apiClient.post<{
      success: boolean;
      message: string;
    }>(`/agents/${id}/stop`),
};
