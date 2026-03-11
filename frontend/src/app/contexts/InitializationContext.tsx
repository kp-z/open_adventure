import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { claudeApi, dashboardApi, projectPathsApi } from '@/lib/api';

interface InitializationState {
  isInitialized: boolean;
  isLoading: boolean;
  progress: number;
  currentStep: string;
  logs: string[];
  error: string | null;
}

interface InitializationContextType extends InitializationState {
  startInitialization: () => Promise<void>;
  resetInitialization: () => void;
}

const InitializationContext = createContext<InitializationContextType | undefined>(undefined);

const STORAGE_KEY = 'open-adventure-initialized';
const VERSION_KEY = 'open-adventure-version';
const CACHE_KEY = 'open-adventure-cache';
const CURRENT_VERSION = '1.3.5'; // 从 package.json 读取

export function InitializationProvider({ children }: { children: React.ReactNode }) {
  // 立即检查 localStorage，避免闪烁
  const checkInitialState = () => {
    const initialized = localStorage.getItem(STORAGE_KEY) === 'true';
    const version = localStorage.getItem(VERSION_KEY);
    return initialized && version === CURRENT_VERSION;
  };

  const [state, setState] = useState<InitializationState>({
    isInitialized: checkInitialState(), // 立即检查
    isLoading: false,
    progress: 0,
    currentStep: '',
    logs: [],
    error: null,
  });

  const addLog = useCallback((message: string) => {
    setState(prev => ({
      ...prev,
      logs: [...prev.logs.slice(-9), message], // 保留最近 10 条，不添加时间戳
    }));
  }, []);

  const startInitialization = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, progress: 0, error: null }));
    addLog('开始初始化系统...');

    try {
      setState(prev => ({ ...prev, currentStep: '正在连接服务器...', progress: 5 }));

      const result = await claudeApi.initialize();

      if (!result.success) {
        throw new Error(result.error || '初始化失败');
      }

      // 处理每个步骤的日志
      let currentProgress = 10;
      const progressStep = 85 / result.steps.length;

      for (const step of result.steps) {
        // 根据步骤名称显示友好的消息
        let message = step.message;
        if (step.count !== undefined) {
          message = `${step.message} (${step.count})`;
        }

        addLog(`✓ ${message}`);
        currentProgress += progressStep;
        setState(prev => ({
          ...prev,
          progress: Math.round(currentProgress),
          currentStep: message
        }));

        // 添加短暂延迟，让用户看到进度变化
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      addLog(`✓ 初始化完成 (${result.duration_ms}ms)`);
      setState(prev => ({ ...prev, progress: 100, currentStep: '初始化完成' }));

      // 预加载 Dashboard 数据并缓存
      try {
        addLog('正在预加载 Dashboard 数据...');
        const [statsData, healthData, projectPathsData] = await Promise.all([
          dashboardApi.getStats().catch(() => null),
          claudeApi.health().catch(() => null),
          projectPathsApi.listProjectPaths({ enabled: true }).catch(() => ({ items: [] }))
        ]);

        // 缓存数据到 localStorage
        const cacheData = {
          stats: statsData,
          health: healthData,
          projectPaths: projectPathsData?.items || [],
          timestamp: Date.now()
        };
        localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
        addLog('✓ Dashboard 数据已缓存');
      } catch (err) {
        console.warn('Failed to preload dashboard data:', err);
        // 预加载失败不影响初始化流程
      }

      // 标记为已初始化
      localStorage.setItem(STORAGE_KEY, 'true');
      localStorage.setItem(VERSION_KEY, CURRENT_VERSION);

      // 延迟 800ms 后隐藏 loading
      setTimeout(() => {
        setState(prev => ({ ...prev, isInitialized: true, isLoading: false }));
      }, 800);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      addLog(`✗ 初始化失败: ${errorMessage}`);
      setState(prev => ({
        ...prev,
        error: errorMessage,
        isLoading: false,
        currentStep: '初始化失败',
      }));
    }
  }, [addLog]);

  const resetInitialization = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(VERSION_KEY);
    setState({
      isInitialized: false,
      isLoading: false,
      progress: 0,
      currentStep: '',
      logs: [],
      error: null,
    });
  }, []);

  // 检查是否需要初始化
  useEffect(() => {
    // 检查是否有清除缓存标记
    const checkClearCache = async () => {
      try {
        const response = await fetch('/.clear-cache');
        if (response.ok) {
          console.log('🧹 Clear cache flag detected, clearing localStorage...');
          localStorage.clear();
          // 删除标记文件（通过后端 API）
          // 注意：这里只是尝试，如果失败也不影响
          fetch('/.clear-cache', { method: 'DELETE' }).catch(() => {});
        }
      } catch (error) {
        // 文件不存在或网络错误，忽略
      }
    };

    checkClearCache().then(() => {
      const initialized = localStorage.getItem(STORAGE_KEY) === 'true';
      const version = localStorage.getItem(VERSION_KEY);

      if (initialized && version === CURRENT_VERSION) {
        // 已初始化且版本匹配，直接标记为已完成
        setState(prev => ({ ...prev, isInitialized: true }));
      } else {
        // 未初始化或版本不匹配，自动开始初始化
        startInitialization();
      }
    });
  }, [startInitialization]);

  return (
    <InitializationContext.Provider value={{ ...state, startInitialization, resetInitialization }}>
      {children}
    </InitializationContext.Provider>
  );
}

export function useInitialization() {
  const context = useContext(InitializationContext);
  if (!context) {
    throw new Error('useInitialization must be used within InitializationProvider');
  }
  return context;
}
