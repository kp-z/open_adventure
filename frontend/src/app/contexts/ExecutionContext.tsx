import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { toast } from 'sonner';
import { API_CONFIG } from '../../config/api';
import { executionsApi } from '@/lib/api';
import { useNotifications } from './NotificationContext';

export interface Execution {
  id: number;
  execution_type: 'workflow' | 'agent_test' | 'agent_team' | 'terminal';
  status: 'pending' | 'running' | 'succeeded' | 'failed' | 'cancelled';
  agent_id?: number;
  workflow_id?: number;
  test_input?: string;
  test_output?: string;
  error?: string;
  error_message?: string;
  started_at?: string;
  finished_at?: string;
  created_at: string;
  updated_at?: string;
  session_id?: string;
  terminal_command?: string;
  terminal_pid?: number;
  terminal_cwd?: string;
  task?: {
    id: number;
    title?: string;
    description?: string;
    project_path?: string;
    status?: string;
  };
}

interface ExecutionContextType {
  executions: Map<number, Execution>;
  runningExecutions: Execution[];
  isConnected: boolean;
}

const ExecutionContext = createContext<ExecutionContextType | undefined>(undefined);

export const useExecutionContext = () => {
  const context = useContext(ExecutionContext);
  if (!context) {
    throw new Error('useExecutionContext must be used within ExecutionProvider');
  }
  return context;
};

interface ExecutionProviderProps {
  children: ReactNode;
}

export const ExecutionProvider: React.FC<ExecutionProviderProps> = ({ children }) => {
  const { addNotification } = useNotifications();
  const [executions, setExecutions] = useState<Map<number, Execution>>(new Map());
  const [isConnected, setIsConnected] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);
  const lastWsErrorRef = useRef<string | null>(null);

  const getExecutionSortTime = (execution: Execution) =>
    new Date(execution.updated_at || execution.created_at).getTime();

  const sortExecutionEntries = (entries: Array<[number, Execution]>) => {
    return entries.sort(([, a], [, b]) => {
      const timeDiff = getExecutionSortTime(b) - getExecutionSortTime(a);
      if (timeDiff !== 0) {
        return timeDiff;
      }

      const createdDiff = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (createdDiff !== 0) {
        return createdDiff;
      }

      return b.id - a.id;
    });
  };

  const normalizeExecutionMap = (source: Map<number, Execution>) =>
    new Map(sortExecutionEntries(Array.from(source.entries())));

  const upsertExecution = (source: Map<number, Execution>, executionId: number, patch: Partial<Execution>) => {
    const next = new Map(source);
    const existing = source.get(executionId);
    next.set(executionId, { ...existing, ...patch, id: executionId } as Execution);
    return normalizeExecutionMap(next);
  };

  const connect = () => {
    const clientId = `client-${Date.now()}`;
    const wsUrl = `${API_CONFIG.WS_BASE_URL}/ws/executions?client_id=${clientId}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);
      setReconnectAttempts(0);
      lastWsErrorRef.current = null;
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);

      if (lastWsErrorRef.current !== 'disconnected') {
        addNotification({
          type: 'error',
          title: 'Execution WebSocket 已断开',
          message: '实时执行状态连接中断，正在自动重连。',
        });
        lastWsErrorRef.current = 'disconnected';
      }

      const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
      setTimeout(() => {
        setReconnectAttempts(prev => prev + 1);
        connect();
      }, delay);
    };

    ws.onerror = () => {
      if (lastWsErrorRef.current !== 'socket_error') {
        addNotification({
          type: 'error',
          title: 'Execution WebSocket 异常',
          message: '实时执行状态连接出现异常，请检查后端服务。',
        });
        lastWsErrorRef.current = 'socket_error';
      }
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'execution_update' || message.type === 'terminal_execution_update') {
          const data = message.data;
          setExecutions(prev => {
            const executionId = Number(data.id);
            if (!Number.isFinite(executionId) || executionId <= 0) {
              if (data.error_message) {
                addNotification({
                  type: 'error',
                  title: 'Terminal 执行记录创建失败',
                  message: data.error_message,
                });
              }
              return prev;
            }

            const existing = prev.get(executionId);
            const updated = upsertExecution(prev, executionId, data as Partial<Execution>);

            // 保存到 localStorage 用于页面恢复
            if (data.session_id) {
              const activeExecutions = JSON.parse(localStorage.getItem('active_executions') || '{}');
              activeExecutions[data.session_id] = data.id;
              localStorage.setItem('active_executions', JSON.stringify(activeExecutions));
            }

            if (existing && existing.status !== data.status) {
              const executionLabel = message.type === 'terminal_execution_update'
                ? 'Terminal 执行'
                : data.execution_type === 'agent_test' ? 'Agent 运行' : 'Workflow';

              if (data.status === 'succeeded') {
                toast.success(`${executionLabel} 执行成功`);
              } else if (data.status === 'failed') {
                toast.error(`${executionLabel} 执行失败`);
              }
            }
            return updated;
          });
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
        if (lastWsErrorRef.current !== 'parse_error') {
          addNotification({
            type: 'error',
            title: 'Execution 消息解析失败',
            message: '收到异常的实时消息格式，请检查后端广播数据。',
          });
          lastWsErrorRef.current = 'parse_error';
        }
      }
    };

    wsRef.current = ws;
  };

  useEffect(() => {
    connect();

    // 页面加载时恢复最近执行记录，ExecutionContext 作为统一主数据源
    const restoreActiveExecutions = async () => {
      try {
        const MAX_RESTORE_ITEMS = 50;
        const listResponse = await executionsApi.list({ skip: 0, limit: MAX_RESTORE_ITEMS });
        const listItems = Array.isArray(listResponse?.items) ? listResponse.items : [];

        let restoredFromSessions: Execution[] = [];
        const MAX_RESTORE_SESSIONS = 6;
        const activeExecutionsRaw = JSON.parse(localStorage.getItem('active_executions') || '{}') as Record<string, number>;
        const entries = Object.entries(activeExecutionsRaw);
        const recentEntries = entries.slice(-MAX_RESTORE_SESSIONS);
        const activeExecutions = Object.fromEntries(recentEntries) as Record<string, number>;
        const sessionIds = Object.keys(activeExecutions);

        if (entries.length > recentEntries.length) {
          localStorage.setItem('active_executions', JSON.stringify(activeExecutions));
          console.log('[ExecutionContext] Pruned stale active executions:', entries.length - recentEntries.length);
        }

        if (sessionIds.length > 0) {
          console.log('[ExecutionContext] Restoring active executions by sessions:', sessionIds);

          const promises = sessionIds.map(async (sessionId) => {
            try {
              const response = await fetch(`${API_CONFIG.BASE_URL}/executions/session/${sessionId}`);
              if (response.ok) {
                const execution = await response.json();
                return execution as Execution;
              }

              delete activeExecutions[sessionId];
              console.warn(`[ExecutionContext] Drop stale session from localStorage: ${sessionId}, status=${response.status}`);
            } catch (error) {
              delete activeExecutions[sessionId];
              console.error(`Failed to restore execution for session ${sessionId}:`, error);
            }
            return null;
          });

          restoredFromSessions = (await Promise.all(promises)).filter((e): e is Execution => e !== null);
          localStorage.setItem('active_executions', JSON.stringify(activeExecutions));
        }

        const mergedMap = new Map<number, Execution>();
        listItems.forEach((execution) => mergedMap.set(execution.id, execution as Execution));
        restoredFromSessions.forEach((execution) => mergedMap.set(execution.id, execution));

        setExecutions(normalizeExecutionMap(mergedMap));
        console.log('[ExecutionContext] Restored executions:', {
          fromList: listItems.length,
          fromSessions: restoredFromSessions.length,
          merged: mergedMap.size,
        });
      } catch (error) {
        console.error('[ExecutionContext] Failed to restore active executions:', error);

        // 检查是否是网络连接错误（后端未启动）
        const isNetworkError = error instanceof TypeError &&
          (error.message.includes('Failed to fetch') || error.message.includes('NetworkError'));

        // 只在非网络错误时显示通知（网络错误说明后端未启动，这是正常情况）
        if (!isNetworkError && lastWsErrorRef.current !== 'restore_error') {
          addNotification({
            type: 'error',
            title: '恢复执行记录失败',
            message: '无法恢复活跃的 Terminal 执行记录，请刷新后重试。',
          });
          lastWsErrorRef.current = 'restore_error';
        } else if (isNetworkError) {
          console.log('[ExecutionContext] Backend not available, skipping execution restore');
        }
      }
    };

    restoreActiveExecutions();

    return () => wsRef.current?.close();
  }, []);

  const runningExecutions = Array.from(executions.values())
    .filter(e => e.status === 'running')
    .slice(0, 10);

  return (
    <ExecutionContext.Provider value={{ executions, runningExecutions, isConnected }}>
      {children}
    </ExecutionContext.Provider>
  );
};
