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
    const wsHost = window.location.hostname;
    const wsPort = 8000;
    const wsUrl = `ws://${wsHost}:${wsPort}/ws/executions?client_id=${clientId}`;
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
        if (message.type === 'execution_update') {
          const data = message.data;
          setExecutions(prev => {
            const updated = new Map(prev);
            const existing = prev.get(data.id);
            updated.set(data.id, { ...existing, ...data } as Execution);
            
            if (existing && existing.status !== data.status) {
              if (data.status === 'succeeded') {
                toast.success(`${data.execution_type === 'agent_test' ? 'Agent 运行' : 'Workflow'} 执行成功`);
              } else if (data.status === 'failed') {
                toast.error(`${data.execution_type === 'agent_test' ? 'Agent 运行' : 'Workflow'} 执行失败`);
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
