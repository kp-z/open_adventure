import { useState, useEffect, useRef, useCallback } from 'react';
import { API_CONFIG } from '../../config/api';

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

  // 获取初始任务列表
  const fetchTasks = useCallback(async () => {
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/tasks?agent_id=${agentId}`);
      if (!response.ok) throw new Error('Failed to fetch tasks');
      const data = await response.json();
      setTasks(data.items || []);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  // 建立 WebSocket 连接
  useEffect(() => {
    fetchTasks();

    const wsUrl = `${API_CONFIG.WS_BASE_URL}/agents/${agentId}/tasks-ws`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('[AgentTasks] WebSocket connected');
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);

        switch (message.type) {
          case 'initial':
            setTasks(message.tasks);
            setLoading(false);
            break;

          case 'task_update':
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
            setTasks(prev => prev.filter(t => t.id !== message.task_id));
            break;
        }
      } catch (error) {
        console.error('[AgentTasks] Failed to parse message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('[AgentTasks] WebSocket error:', error);
      setError('WebSocket connection error');
    };

    ws.onclose = () => {
      console.log('[AgentTasks] WebSocket disconnected');
    };

    wsRef.current = ws;

    return () => {
      ws.close();
    };
  }, [agentId, fetchTasks]);

  return { tasks, loading, error, refetch: fetchTasks };
}
