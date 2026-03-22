import { useState, useEffect, useCallback, useRef } from 'react';

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
  const activeSessionIdRef = useRef<string | null>(null);

  // 同步 ref 和 state
  useEffect(() => {
    activeSessionIdRef.current = activeSessionId;
  }, [activeSessionId]);

  const loadSessions = useCallback(async () => {
    if (!agentId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/agents/${agentId}/sessions`);
      const data: SessionInfo[] = await res.json();
      setSessions(prev => {
        const apiIds = new Set(data.map(s => s.session_id));
        const localOnly = prev.filter(s => s.message_count === 0 && !apiIds.has(s.session_id));
        return [...data, ...localOnly];
      });
      // 仅在初次加载且无活跃 session 时激活最新
      if (data.length > 0 && !activeSessionIdRef.current) {
        setActiveSessionId(data[0].session_id);
      }
    } catch (err) {
      console.error('Failed to load sessions:', err);
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  const createSession = useCallback(async () => {
    const newSessionId = crypto.randomUUID();
    const newSession: SessionInfo = {
      session_id: newSessionId,
      execution_id: 0,
      last_activity: new Date().toISOString(),
      message_count: 0,
      created_at: new Date().toISOString(),
    };
    setSessions(prev => [...prev, newSession]);
    setActiveSessionId(newSessionId);
  }, []);

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
    setSessions(prev => {
      const remaining = prev.filter(s => s.session_id !== sessionId);
      if (remaining.length > 0) {
        setActiveSessionId(remaining[0].session_id);
      } else {
        setActiveSessionId(null);
      }
      return remaining;
    });
  }, [agentId]);

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
