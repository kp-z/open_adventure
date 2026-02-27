import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { toast } from 'sonner';

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
  connect: () => void;
  disconnect: () => void;
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
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);

  const connect = () => {
    const clientId = `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const wsUrl = `ws://localhost:8000/ws/executions?client_id=${clientId}`;

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);
      setReconnectAttempts(0);

      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
      }
      heartbeatRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send('ping');
        }
      }, 30000);
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);

      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }

      const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
      console.log(`Reconnecting in ${delay}ms...`);
      setTimeout(() => {
        setReconnectAttempts(prev => prev + 1);
        connect();
      }, delay);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'execution_update') {
          handleExecutionUpdate(message.data);
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    wsRef.current = ws;
  };

  const disconnect = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
  };

  const handleExecutionUpdate = (data: Partial<Execution>) => {
    setExecutions(prev => {
      const updated = new Map(prev);
      const existing = prev.get(data.id!);

      updated.set(data.id!, {
        ...existing,
        ...data,
      } as Execution);

      if (existing && existing.status !== data.status) {
        if (data.status === 'succeeded') {
          toast.success(
            `${data.execution_type === 'agent_test' ? 'Agent 运行' : 'Workflow'} 执行成功`,
            {
              description: `执行 #${data.id} 已完成`,
            }
          );
        } else if (data.status === 'failed') {
          toast.error(
            `${data.execution_type === 'agent_test' ? 'Agent 运行' : 'Workflow'} 执行失败`,
            {
              description: data.error || '未知错误',
            }
          );
        }
      }

      return updated;
    });
  };

  useEffect(() => {
    connect();
    return () => disconnect();
  }, []);

  const runningExecutions = Array.from(executions.values())
    .filter(e => e.status === 'running')
    .slice(0, 10);

  return (
    <ExecutionContext.Provider
      value={{
        executions,
        runningExecutions,
        isConnected,
        connect,
        disconnect,
      }}
    >
      {children}
    </ExecutionContext.Provider>
  );
};
