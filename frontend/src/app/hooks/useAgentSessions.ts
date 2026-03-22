import { useState, useEffect, useCallback } from 'react';

interface SessionInfo {
  session_id: string;
  execution_id: number;
  last_activity: string;
  message_count: number;
  created_at: string;
}

export function useAgentSessions(agentId: number | null) {
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadSessions = useCallback(async () => {
    if (!agentId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/agents/${agentId}/sessions`);
      const data = await res.json();
      setSessions(data);
      // 默认激活最新 session
      if (data.length > 0 && !activeSessionId) {
        setActiveSessionId(data[0].session_id);
      }
    } catch (err) {
      console.error('Failed to load sessions:', err);
    } finally {
      setLoading(false);
    }
  }, [agentId, activeSessionId]);

  const createSession = useCallback(async () => {
    // 调用后端创建新 session（或复用现有逻辑）
    setActiveSessionId(null); // 触发新建
    await loadSessions();
  }, [loadSessions]);

  const forkSession = useCallback(async (sourceSessionId: string, forkIndex?: number) => {
    if (!agentId) return;
    const res = await fetch(`/api/agents/${agentId}/sessions/fork`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source_session_id: sourceSessionId, fork_point_index: forkIndex })
    });
    const { session_id } = await res.json();
    setActiveSessionId(session_id);
    await loadSessions();
  }, [agentId, loadSessions]);

  const clearSession = useCallback(async (sessionId: string) => {
    if (!agentId) return;
    await fetch(`/api/agents/${agentId}/sessions/${sessionId}`, { method: 'DELETE' });
    await createSession(); // 清空后创建新 session
  }, [agentId, createSession]);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  return {
    sessions,
    activeSessionId,
    setActiveSessionId,
    loading,
    createSession,
    forkSession,
    clearSession,
    refreshSessions: loadSessions
  };
}
