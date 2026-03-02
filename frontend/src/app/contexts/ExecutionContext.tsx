import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { toast } from 'sonner';
import { API_CONFIG } from '../../config/api';


export interface Execution {
  id: number;
  execution_type: 'workflow' | 'agent_test';
  status: 'pending' | 'running' | 'succeeded' | 'failed' | 'cancelled';
  agent_id?: number;
  workflow_id?: number;
  test_input?: string;
  test_output?: string;
  error?: string;
  started_at?: string;
  finished_at?: string;
  created_at: string;
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
  const [executions, setExecutions] = useState<Map<number, Execution>>(new Map());
  const [isConnected, setIsConnected] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);

  const connect = () => {
    const clientId = `client-${Date.now()}`;
    const wsUrl = `${API_CONFIG.WS_BASE_URL}/ws/executions?client_id=${clientId}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);
      setReconnectAttempts(0);
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
      const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
      setTimeout(() => {
        setReconnectAttempts(prev => prev + 1);
        connect();
      }, delay);
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'execution_update' || message.type === 'terminal_execution_update') {
          const data = message.data;
          setExecutions(prev => {
            const updated = new Map(prev);
            const existing = prev.get(data.id);
            updated.set(data.id, { ...existing, ...data } as Execution);

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
      }
    };

    wsRef.current = ws;
  };

  useEffect(() => {
    connect();

    // 页面加载时恢复活跃的执行记录
    const restoreActiveExecutions = async () => {
      try {
        const activeExecutions = JSON.parse(localStorage.getItem('active_executions') || '{}');
        const sessionIds = Object.keys(activeExecutions);

        if (sessionIds.length > 0) {
          console.log('[ExecutionContext] Restoring active executions:', sessionIds);

          // 并行获取所有活跃 session 的执行记录
          const promises = sessionIds.map(async (sessionId) => {
            try {
              const response = await fetch(`${API_CONFIG.BASE_URL}/executions/session/${sessionId}`);
              if (response.ok) {
                const execution = await response.json();
                return execution;
              }
            } catch (error) {
              console.error(`Failed to restore execution for session ${sessionId}:`, error);
            }
            return null;
          });

          const restoredExecutions = (await Promise.all(promises)).filter(e => e !== null);

          if (restoredExecutions.length > 0) {
            setExecutions(prev => {
              const updated = new Map(prev);
              restoredExecutions.forEach(execution => {
                updated.set(execution.id, execution);
              });
              return updated;
            });
            console.log('[ExecutionContext] Restored', restoredExecutions.length, 'executions');
          }
        }
      } catch (error) {
        console.error('[ExecutionContext] Failed to restore active executions:', error);
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
