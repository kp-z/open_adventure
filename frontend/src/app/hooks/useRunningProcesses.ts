/**
 * Hook for managing running Claude Code processes with real-time updates.
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  ClaudeProcessInfo,
  ProcessUpdateMessage,
  createProcessWebSocket,
  getRunningProcesses,
} from '@/lib/api/services/processes';

interface UseRunningProcessesResult {
  processes: ClaudeProcessInfo[];
  isLoading: boolean;
  error: string | null;
  isConnected: boolean;
  refresh: () => Promise<void>;
}

/**
 * Hook for managing running processes with WebSocket real-time updates.
 */
export function useRunningProcesses(): UseRunningProcessesResult {
  const [processes, setProcesses] = useState<ClaudeProcessInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);

  // Fetch initial process list
  const fetchProcesses = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await getRunningProcesses();
      setProcesses(response.processes);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch processes';
      setError(errorMessage);
      console.error('Error fetching processes:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Connect to WebSocket
  const connectWebSocket = useCallback(() => {
    // Clean up existing connection
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    try {
      const ws = createProcessWebSocket(
        (data: ProcessUpdateMessage) => {
          if (data.type === 'process_update' && data.processes) {
            setProcesses(data.processes);
            setError(null);
            reconnectAttemptsRef.current = 0; // Reset reconnect attempts on successful update
          } else if (data.type === 'error') {
            setError(data.message || 'WebSocket error');
          }
        },
        (error) => {
          console.error('WebSocket error:', error);
          setIsConnected(false);
          scheduleReconnect();
        },
        () => {
          console.log('WebSocket closed');
          setIsConnected(false);
          scheduleReconnect();
        }
      );

      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;
      };

      wsRef.current = ws;
    } catch (err) {
      console.error('Failed to create WebSocket:', err);
      setError('Failed to connect to real-time updates');
      scheduleReconnect();
    }
  }, []);

  // Schedule reconnection with exponential backoff
  const scheduleReconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    const maxAttempts = 10;
    if (reconnectAttemptsRef.current >= maxAttempts) {
      console.log('Max reconnection attempts reached');
      setError('Lost connection to real-time updates. Please refresh the page.');
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
    reconnectAttemptsRef.current += 1;

    console.log(`Scheduling reconnect attempt ${reconnectAttemptsRef.current} in ${delay}ms`);
    reconnectTimeoutRef.current = setTimeout(() => {
      connectWebSocket();
    }, delay);
  }, [connectWebSocket]);

  // Initialize: fetch initial data and connect WebSocket
  useEffect(() => {
    fetchProcesses();
    connectWebSocket();

    // Cleanup on unmount
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [fetchProcesses, connectWebSocket]);

  return {
    processes,
    isLoading,
    error,
    isConnected,
    refresh: fetchProcesses,
  };
}
