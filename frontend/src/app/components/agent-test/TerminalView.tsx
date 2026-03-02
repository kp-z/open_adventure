'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import { API_CONFIG } from '../../../config/api';
import 'xterm/css/xterm.css';
import type { TerminalSession } from './types';

export interface TestResult {
  id: string;
  input: string;
  output: string;
  success: boolean;
  duration: number;
  timestamp: string;
  model: string;
  agentId: number;
}

interface TerminalViewProps {
  agentId: number;
  agentName: string;
  onTestComplete: (result: TestResult) => void;
}

export function TerminalView({ agentId, agentName, onTestComplete }: TerminalViewProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const [session, setSession] = useState<TerminalSession>({
    ws: null,
    isConnected: false,
    isReady: false,
  });
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const MAX_RECONNECT_ATTEMPTS = 3;

  // 初始化终端
  useEffect(() => {
    if (!terminalRef.current || xtermRef.current) return;

    const terminal = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: 'transparent',
        foreground: '#ffffff',
        cursor: '#ffffff',
      },
      rows: 24,
      cols: 80,
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    terminal.loadAddon(fitAddon);
    terminal.loadAddon(webLinksAddon);
    terminal.open(terminalRef.current);
    fitAddon.fit();

    xtermRef.current = terminal;
    fitAddonRef.current = fitAddon;

    terminal.writeln('$ Initializing terminal...');

    // 窗口大小变化时自适应
    const handleResize = () => {
      fitAddon.fit();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      terminal.dispose();
      xtermRef.current = null;
      // 清理重连定时器
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  // 建立 WebSocket 连接
  useEffect(() => {
    if (!xtermRef.current) return;

    // 检查是否已经有连接
    if (session.ws && session.ws.readyState === WebSocket.OPEN) {
      console.log('[TerminalView] WebSocket already connected, skipping');
      return;
    }

    console.log('[TerminalView] Creating new WebSocket connection');
    const terminal = xtermRef.current;
    const wsUrl = `${API_CONFIG.WS_BASE_URL}/terminal/ws`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('[TerminalView] WebSocket connected');
      terminal.writeln('$ Connected to agent session');
      setSession({ ws, isConnected: true, isReady: false });
      setReconnectAttempts(0); // 连接成功后重置重连计数

      // 发送终端尺寸
      if (fitAddonRef.current) {
        ws.send(JSON.stringify({
          type: 'resize',
          cols: terminal.cols,
          rows: terminal.rows,
        }));
      }
    };

    ws.onmessage = (event) => {
      try {
        const data = event.data;

        // 尝试解析为 JSON（控制消息）
        try {
          const message = JSON.parse(data);
          console.log('[TerminalView] Received JSON message:', message.type);

          switch (message.type) {
            case 'output':
              terminal.write(message.data);
              break;

            case 'ready':
              terminal.writeln(`\r\n$ ${message.message}`);
              terminal.writeln(`$ Agent "${agentName}" ready. Type your message and press Enter.\r\n`);
              setSession(prev => ({ ...prev, isReady: true }));
              break;

            case 'exit':
              terminal.writeln(`\r\n$ Session ended (exit code: ${message.code})`);
              setSession(prev => ({ ...prev, isReady: false }));

              // 保存到测试历史
              onTestComplete({
                id: `test-${Date.now()}`,
                input: 'Terminal session',
                output: message.output || '',
                success: message.code === 0,
                duration: 0,
                timestamp: new Date().toISOString(),
                model: 'terminal',
                agentId,
              });
              break;

            case 'error':
              terminal.writeln(`\r\n\x1b[31mError: ${message.message}\x1b[0m\r\n`);
              break;
          }
        } catch (parseError) {
          // 不是 JSON，直接作为原始终端输出处理
          terminal.write(data);
        }
      } catch (error) {
        console.error('[TerminalView] Failed to handle WebSocket message:', error);
      }
    };

    ws.onerror = (error) => {
      terminal.writeln('\r\n\x1b[31m$ Connection error\x1b[0m\r\n');
      console.error('[TerminalView] WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('[TerminalView] WebSocket disconnected');
      terminal.writeln('\r\n$ Connection closed\r\n');
      setSession({ ws: null, isConnected: false, isReady: false });

      // 重连逻辑
      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        const nextAttempt = reconnectAttempts + 1;
        terminal.writeln(`$ Reconnecting in 2 seconds... (${nextAttempt}/${MAX_RECONNECT_ATTEMPTS})\r\n`);
        console.log(`[TerminalView] Scheduling reconnect attempt ${nextAttempt}/${MAX_RECONNECT_ATTEMPTS}`);

        reconnectTimeoutRef.current = setTimeout(() => {
          setReconnectAttempts(nextAttempt);
        }, 2000);
      } else {
        terminal.writeln(`\x1b[31m$ Failed to reconnect after ${MAX_RECONNECT_ATTEMPTS} attempts\x1b[0m\r\n`);
        terminal.writeln('$ Please refresh the page to try again\r\n');
        console.log('[TerminalView] Max reconnect attempts reached');
        setReconnectAttempts(0);
      }
    };

    // 处理用户输入
    const dataHandler = (data: string) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'input',
          data,
        }));
      }
    };
    terminal.onData(dataHandler);

    return () => {
      console.log('[TerminalView] Cleaning up WebSocket connection');
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
      // 清理重连定时器
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [agentId, agentName, reconnectAttempts, onTestComplete]);

  return (
    <div className="h-[500px] bg-black/60 rounded-xl p-4">
      <div ref={terminalRef} className="h-full" />
    </div>
  );
}
