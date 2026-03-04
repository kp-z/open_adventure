'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { API_CONFIG } from '../../config/api';
import type { ChatMessage, ViewMode, UnifiedSessionState } from '../components/agent-test/types';

interface UseUnifiedAgentSessionProps {
  agentId: number;
  agentName: string;
  mode: ViewMode;
  sessionId?: string;
  onMessage?: (message: ChatMessage) => void;
  onOutput?: (output: string) => void;
  onError?: (error: string) => void;
}

export function useUnifiedAgentSession({
  agentId,
  agentName,
  mode,
  sessionId,
  onMessage,
  onOutput,
  onError,
}: UseUnifiedAgentSessionProps) {
  const [state, setState] = useState<UnifiedSessionState>({
    ws: null,
    isConnected: false,
    isReady: false,
    sessionId: null,
    executionId: null,
    mode,
  });

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const isConnectingRef = useRef(false);

  const MAX_RECONNECT_ATTEMPTS = 3;

  // 建立 WebSocket 连接
  const connect = useCallback(() => {
    // 防止重复连接
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('[UnifiedSession] WebSocket already connected, skipping');
      return;
    }

    if (isConnectingRef.current) {
      console.log('[UnifiedSession] WebSocket connection already in progress, skipping');
      return;
    }

    console.log('[UnifiedSession] Creating new WebSocket connection', { agentId, mode, sessionId });
    isConnectingRef.current = true;

    // 构建 WebSocket URL
    let wsUrl = `${API_CONFIG.WS_BASE_URL}/agents/${agentId}/session-ws?mode=${mode}`;
    if (sessionId) {
      wsUrl += `&session_id=${sessionId}`;
    }

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('[UnifiedSession] WebSocket connected');
      isConnectingRef.current = false;
      setState((prev) => ({ ...prev, isConnected: true }));
      reconnectAttemptsRef.current = 0;
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log('[UnifiedSession] Received message:', message.type);

        switch (message.type) {
          case 'ready':
            setState((prev) => ({
              ...prev,
              isReady: true,
              sessionId: message.session_id,
              executionId: message.execution_id,
            }));

            // 如果是对话模式，恢复聊天历史
            if (mode === 'chat' && message.chat_history) {
              message.chat_history.forEach((msg: ChatMessage) => {
                onMessage?.(msg);
              });
            }

            // 如果是 Terminal 模式，恢复原始输出
            if (mode === 'terminal' && message.raw_output) {
              onOutput?.(message.raw_output);
            }
            break;

          case 'chat_message':
            if (mode === 'chat' && onMessage) {
              onMessage(message.message);
            }
            break;

          case 'user_message':
            if (mode === 'chat' && onMessage) {
              onMessage(message.message);
            }
            break;

          case 'output':
            if (mode === 'terminal' && onOutput) {
              onOutput(message.data);
            }
            break;

          case 'error':
            onError?.(message.message);
            break;

          case 'stopped':
            setState((prev) => ({ ...prev, isReady: false }));
            break;

          case 'restarted':
            setState((prev) => ({
              ...prev,
              isReady: true,
              sessionId: message.session_id,
            }));
            break;
        }
      } catch (error) {
        console.error('[UnifiedSession] Failed to parse WebSocket message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('[UnifiedSession] WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('[UnifiedSession] WebSocket disconnected');
      isConnectingRef.current = false;
      setState((prev) => ({ ...prev, isConnected: false, isReady: false }));
      wsRef.current = null;

      // 尝试重连
      if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
        console.log(`[UnifiedSession] Scheduling reconnect attempt ${reconnectAttemptsRef.current + 1}/${MAX_RECONNECT_ATTEMPTS}`);
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectAttemptsRef.current += 1;
          connect();
        }, 2000);
      } else {
        console.log('[UnifiedSession] Max reconnect attempts reached');
      }
    };

    wsRef.current = ws;
    setState((prev) => ({ ...prev, ws }));
  }, [agentId, mode, sessionId, onMessage, onOutput, onError]);

  // 发送输入
  const sendInput = useCallback((input: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'input',
        data: input
      }));
    }
  }, []);

  // 停止进程
  const stop = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'stop'
      }));
    }
  }, []);

  // 重启进程
  const restart = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'restart'
      }));
    }
  }, []);

  // 调整终端尺寸
  const resize = useCallback((cols: number, rows: number) => {
    if (wsRef.current?.readyState === WebSocket.OPEN && mode === 'terminal') {
      wsRef.current.send(JSON.stringify({
        type: 'resize',
        cols,
        rows
      }));
    }
  }, [mode]);

  // 组件挂载时建立连接
  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    state,
    sendInput,
    stop,
    restart,
    resize,
  };
}
