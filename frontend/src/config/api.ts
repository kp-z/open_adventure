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

// 判断是否为本地/局域网地址（直连后端 38080）
const isPrivateHost = (hostname: string): boolean => {
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    /^10\./.test(hostname) ||
    /^192\.168\./.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(hostname)
  );
};

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

  const hostname = window.location.hostname;

  // 本地/局域网：直连后端 38080
  if (isPrivateHost(hostname)) {
    const protocol = window.location.protocol;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:38080/api';
    }
    return `${protocol}//${hostname}:38080/api`;
  }

  // 外网域名（ngrok/cloudflare/公网部署）：使用相对路径，同源请求，无需指定端口
  return '/api';
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

  const hostname = window.location.hostname;

  // 本地/局域网：直连后端 38080
  if (isPrivateHost(hostname)) {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'ws://localhost:38080/api';
    }
    return `${wsProtocol}//${hostname}:38080/api`;
  }

  // 外网域名：使用当前页面的 host（含端口，如有），走 443/80
  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${wsProtocol}//${window.location.host}/api`;
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
