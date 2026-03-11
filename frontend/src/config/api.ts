/**
 * API 配置
 * 统一管理所有 API 和 WebSocket 地址
 */

// 检查是否有运行时配置（二进制版本动态生成）
declare global {
  interface Window {
    __RUNTIME_CONFIG__?: {
      API_BASE_URL: string;
      WS_BASE_URL: string;
      PORT: number;
    };
  }
}

// 自动检测 API 地址
const getDefaultApiBaseUrl = () => {
  // 优先使用运行时配置（二进制版本）
  if (typeof window !== 'undefined' && window.__RUNTIME_CONFIG__) {
    return window.__RUNTIME_CONFIG__.API_BASE_URL;
  }

  // 如果有环境变量，优先使用
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }

  // 云端部署：使用当前主机地址
  // 本地开发：使用 localhost
  const protocol = window.location.protocol;
  const hostname = window.location.hostname;

  // 如果是 localhost 或 127.0.0.1，使用 localhost:38080
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:38080/api';
  }

  // 否则使用当前主机的 38080 端口
  return `${protocol}//${hostname}:38080/api`;
};

const getDefaultWsBaseUrl = () => {
  // 优先使用运行时配置（二进制版本）
  if (typeof window !== 'undefined' && window.__RUNTIME_CONFIG__) {
    return window.__RUNTIME_CONFIG__.WS_BASE_URL;
  }

  // 如果有环境变量，优先使用
  if (import.meta.env.VITE_WS_BASE_URL) {
    return import.meta.env.VITE_WS_BASE_URL;
  }

  // 云端部署：使用当前主机地址
  // 本地开发：使用 localhost
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const hostname = window.location.hostname;

  // 如果是 localhost 或 127.0.0.1，使用 localhost:38080
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'ws://localhost:38080/api';
  }

  // 否则使用当前主机的 38080 端口
  return `${protocol}//${hostname}:38080/api`;
};

// 从环境变量读取配置，如果没有则自动检测
const API_BASE_URL = getDefaultApiBaseUrl();
const WS_BASE_URL = getDefaultWsBaseUrl();

// 提取 HTTP 基础 URL（不含 /api 后缀）
const getHttpBaseUrl = () => {
  return API_BASE_URL.replace(/\/api$/, '');
};

// 提取 WebSocket 基础 URL（不含 /api 后缀）
const getWsBaseUrl = () => {
  return WS_BASE_URL.replace(/\/api$/, '');
};

export const API_CONFIG = {
  // HTTP API 基础 URL
  BASE_URL: API_BASE_URL,

  // WebSocket 基础 URL
  WS_BASE_URL: WS_BASE_URL,

  // HTTP 服务器地址（不含 /api）
  HTTP_SERVER: getHttpBaseUrl(),

  // WebSocket 服务器地址（不含 /api）
  WS_SERVER: getWsBaseUrl(),

  // 完整的 WebSocket 端点
  WS_ENDPOINTS: {
    TERMINAL: `${WS_BASE_URL}/terminal/ws`,
    EXECUTION: `${WS_BASE_URL}/executions/ws`,
  },
};

// 导出便捷函数
export const getApiUrl = (path: string) => {
  return `${API_CONFIG.BASE_URL}${path}`;
};

export const getWsUrl = (path: string) => {
  return `${API_CONFIG.WS_BASE_URL}${path}`;
};
