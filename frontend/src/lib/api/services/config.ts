/**
 * Configuration API 服务
 * 提供配置文件读取和更新接口
 */

import { apiClient } from '../client';

export interface AppConfig {
  APP_NAME?: string;
  APP_VERSION?: string;
  DEBUG?: string;
  ENV?: string;
  API_PREFIX?: string;
  SECRET_KEY?: string;
  ANTHROPIC_API_KEY?: string;
  CLAUDE_CLI_PATH?: string;
  DEFAULT_MODEL_PROVIDER?: string;
  LOG_LEVEL?: string;
  CORS_ORIGIN_REGEX?: string;
}

export interface ConfigResponse {
  config: AppConfig;
  config_file: string;
}

export interface ConfigUpdateResponse {
  success: boolean;
  config: AppConfig;
  config_file: string;
}

export interface ModelConfig {
  alias: string;
  full_name: string;
  description: string;
}

export interface ModelsConfigResponse {
  default_models: ModelConfig[];
  custom_models: ModelConfig[];
  default_file: string;
  custom_file: string;
}

export interface ModelsConfigUpdateResponse {
  success: boolean;
  message: string;
  custom_models: ModelConfig[];
  custom_file: string;
}

export const configApi = {
  /**
   * 获取当前配置
   */
  getConfig: () => apiClient.get<ConfigResponse>('/config'),

  /**
   * 更新配置
   */
  updateConfig: (config: Partial<AppConfig>) =>
    apiClient.put<ConfigUpdateResponse>('/config', config),

  /**
   * 重置配置为默认值
   */
  resetConfig: () => apiClient.post<ConfigUpdateResponse>('/config/reset'),

  /**
   * 获取模型配置列表
   */
  getModels: () => apiClient.get<ModelsConfigResponse>('/config/models'),

  /**
   * 更新模型配置列表
   */
  updateModels: (models: ModelConfig[]) =>
    apiClient.put<ModelsConfigUpdateResponse>('/config/models', { models }),

  /**
   * 重置模型配置为默认值
   */
  resetModels: () => apiClient.post<ModelsConfigUpdateResponse>('/config/models/reset'),
};
