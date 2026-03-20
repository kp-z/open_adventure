/**
 * HTTP 客户端配置
 * 基于 fetch API 实现，包含请求/响应拦截器和 IndexedDB 缓存
 */

import { API_CONFIG } from '../../config/api';
import { cache } from '../storage';

interface RequestConfig extends RequestInit {
  params?: Record<string, any>;
  cache?: boolean; // 是否启用缓存
  cacheTTL?: number; // 缓存有效期（秒）
}

interface ApiResponse<T = any> {
  data: T;
  message?: string;
  success?: boolean;
}

class ApiClient {
  private baseURL: string;
  private token: string | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    // 从 localStorage 读取 token
    this.token = localStorage.getItem('auth_token');
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  }

  private async request<T>(
    endpoint: string,
    config: RequestConfig = {}
  ): Promise<T> {
    const { params, cache: enableCache = false, cacheTTL = 300, ...fetchConfig } = config;

    // 构建 URL
    let url = `${this.baseURL}${endpoint}`;
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });
      const queryString = searchParams.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }

    // 缓存键
    const cacheKey = `api:${endpoint}:${JSON.stringify(params || {})}`;

    // 获取请求方法（默认为 GET）
    const method = (fetchConfig.method || 'GET').toUpperCase();

    // 仅对 GET 请求启用缓存
    if (enableCache && method === 'GET') {
      // 尝试从缓存读取
      const cached = await cache.get<T>(cacheKey);
      if (cached) {
        console.log('[Cache] 命中缓存:', endpoint);
        // 后台更新缓存
        this.fetchAndCache<T>(url, fetchConfig, cacheKey, cacheTTL).catch(() => {});
        return cached;
      }
    }

    // 缓存未命中或不启用缓存，直接请求
    return this.fetchAndCache<T>(url, fetchConfig, enableCache ? cacheKey : null, cacheTTL);
  }

  private async fetchAndCache<T>(
    url: string,
    fetchConfig: RequestInit,
    cacheKey: string | null,
    cacheTTL: number
  ): Promise<T> {
    // 设置默认 headers
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...fetchConfig.headers,
    };

    // 添加认证 token
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        ...fetchConfig,
        headers,
      });

      // 处理非 2xx 响应
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.detail || errorData.message || `HTTP ${response.status}: ${response.statusText}`
        );
      }

      // 处理 204 No Content
      if (response.status === 204) {
        return undefined as T;
      }

      const data = await response.json();

      // 保存到缓存
      if (cacheKey) {
        await cache.set(cacheKey, data, cacheTTL);
        console.log('[Cache] 保存缓存:', cacheKey);
      }

      return data;
    } catch (error) {
      console.error('API Request Error:', error);
      throw error;
    }
  }

  async get<T>(endpoint: string, config?: RequestConfig): Promise<T> {
    return this.request<T>(endpoint, { ...config, method: 'GET' });
  }

  async post<T>(endpoint: string, data?: any, config?: RequestConfig): Promise<T> {
    return this.request<T>(endpoint, {
      ...config,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: any, config?: RequestConfig): Promise<T> {
    return this.request<T>(endpoint, {
      ...config,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string, config?: RequestConfig): Promise<T> {
    return this.request<T>(endpoint, { ...config, method: 'DELETE' });
  }

  async patch<T>(endpoint: string, data?: any, config?: RequestConfig): Promise<T> {
    return this.request<T>(endpoint, {
      ...config,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  getBaseURL(): string {
    return this.baseURL;
  }
}

// 创建默认客户端实例
export const apiClient = new ApiClient(API_CONFIG.BASE_URL);
