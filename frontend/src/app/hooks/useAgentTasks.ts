/**
 * useAgentTasks Hook
 * 获取和管理 Agent 任务，支持 WebSocket 实时更新
 */
import { useState, useEffect, useRef, useCallback } from 'react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:38080';
const WS_BASE_URL = API_BASE_URL.replace('http', 'ws');

export interface AgentTask {
  id: number;
  title: string;
  description: string;
  status: string;
  agent_id: number;
  depends_on: number[];
  blocks: number[];
  related_plan_ids: number[];
  related_progress_ids: number[];
  priority: number;
  created_at: string;
  updated_at: string;
}

export function useAgentTasks(agentId: number) {
  const [tasks, setTasks] = useState<AgentTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  // 获取初始任务列表
  const fetchTasks = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/tasks?agent_id=${agentId}`);
      if (!response.ok) throw new Error('Failed to fetch tasks');
      const data = await response.json();
      setTasks(data.items || []);
      setError(null);
    } catch (err) {
      console.error('[useAgentTasks] Failed to fetch tasks:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  // 建立 WebSocket 连接
  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    const wsUrl = `${WS_BASE_URL}/api/ws/agents/${agentId}/tasks-ws`;
    console.log('[useAgentTasks] Connecting to WebSocket:', wsUrl);

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('[useAgentTasks] WebSocket connected');
      reconnectAttemptsRef.current = 0;
      setError(null);
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);

        switch (message.type) {
          case 'initial':
            console.log('[useAgentTasks] Received initial tasks:', message.tasks.length);
            setTasks(message.tasks);
            setLoading(false);
            break;

          case 'task_update':
            console.log('[useAgentTasks] Task updated:', message.task.id);
            setTasks(prev => {
              const index = prev.findIndex(t => t.id === message.task.id);
              if (index >= 0) {
                // 更新现有任务
                const updated = [...prev];
                updated[index] = message.task;
                return updated;
              } else {
                // 添加新任务
                return [...prev, message.task];
              }
            });
            break;

          case 'task_delete':
            console.log('[useAgentTasks] Task deleted:', message.task_id);
            setTasks(prev => prev.filter(t => t.id !== message.task_id));
            break;

          case 'pong':
            // 心跳响应
            break;

          default:
            console.warn('[useAgentTasks] Unknown message type:', message.type);
        }
      } catch (error) {
        console.error('[useAgentTasks] Failed to parse message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('[useAgentTasks] WebSocket error:', error);
      setError('WebSocket connection error');
    };

    ws.onclose = () => {
      console.log('[useAgentTasks] WebSocket disconnected');
      wsRef.current = null;

      // 尝试重连
      if (reconnectAttemptsRef.current < maxReconnectAttempts) {
        reconnectAttemptsRef.current++;
        const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
        console.log(`[useAgentTasks] Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`);

        reconnectTimeoutRef.current = setTimeout(() => {
          connectWebSocket();
        }, delay);
      } else {
        console.error('[useAgentTasks] Max reconnect attempts reached');
        setError('Connection lost. Please refresh the page.');
      }
    };

    wsRef.current = ws;
  }, [agentId]);

  // 发送心跳
  useEffect(() => {
    const pingInterval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000); // 每 30 秒发送一次心跳

    return () => clearInterval(pingInterval);
  }, []);

  // 初始化
  useEffect(() => {
    fetchTasks();
    connectWebSocket();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [agentId, fetchTasks, connectWebSocket]);

  return { tasks, loading, error, refetch: fetchTasks };
}
