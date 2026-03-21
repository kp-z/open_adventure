/**
 * Workspace 状态轮询：按阶段调整间隔，页签隐藏时降频。
 */
import { useCallback, useEffect, useState } from 'react';
import * as projectsApi from '../../lib/api/services/projects';
import type { WorkspaceStatus } from '../../lib/api/services/projects';

export interface UseProjectWorkspaceStatusOptions {
  enabled?: boolean;
}

export function useProjectWorkspaceStatus(
  projectId: number | null,
  options: UseProjectWorkspaceStatusOptions = {}
) {
  const { enabled = true } = options;
  const [status, setStatus] = useState<WorkspaceStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (projectId == null || !enabled) return null;
    setLoading(true);
    setError(null);
    try {
      const s = await projectsApi.getWorkspaceStatus(projectId);
      setStatus(s);
      return s;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  }, [projectId, enabled]);

  useEffect(() => {
    if (projectId == null || !enabled) {
      setStatus(null);
      return;
    }

    let stopped = false;
    let id: ReturnType<typeof setTimeout>;

    const scheduleNext = (delayMs: number) => {
      if (stopped) return;
      id = setTimeout(() => void poll(), delayMs);
    };

    const poll = async () => {
      if (stopped) return;

      if (document.visibilityState !== 'visible') {
        scheduleNext(30000);
        return;
      }

      let delay = 5000;
      try {
        const s = await projectsApi.getWorkspaceStatus(projectId);
        if (stopped) return;
        setStatus(s);
        setError(null);
        if (s.phase === 'starting' || (s.running && s.health !== 'healthy')) {
          delay = 1000;
        } else if (s.running) {
          delay = 5000;
        } else {
          delay = 8000;
        }
      } catch (e) {
        if (!stopped) {
          setError(e instanceof Error ? e.message : String(e));
          delay = 5000;
        }
      }
      scheduleNext(delay);
    };

    const onVis = () => {
      if (document.visibilityState === 'visible') {
        void poll();
      }
    };

    void poll();
    document.addEventListener('visibilitychange', onVis);

    return () => {
      stopped = true;
      clearTimeout(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [projectId, enabled]);

  return { status, loading, error, refresh };
}
