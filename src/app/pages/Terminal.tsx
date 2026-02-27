import React, { useEffect, useRef, useState } from 'react';
import { Terminal as TerminalIcon, X, Maximize2, Minimize2 } from 'lucide-react';
import { ActionButton } from '../components/ui-shared';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';

const Terminal = () => {
  const [connected, setConnected] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  useEffect(() => {
    if (!terminalRef.current) return;

    // 创建 xterm 实例
    const term = new XTerm({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: "'Fira Code', 'Menlo', 'Monaco', 'Courier New', monospace",
      theme: {
        background: '#000000',
        foreground: '#e5e7eb',
        cursor: '#22c55e',
        black: '#1f2937',
        red: '#ef4444',
        green: '#22c55e',
        yellow: '#eab308',
        blue: '#3b82f6',
        magenta: '#a855f7',
        cyan: '#06b6d4',
        white: '#e5e7eb',
        brightBlack: '#4b5563',
        brightRed: '#f87171',
        brightGreen: '#4ade80',
        brightYellow: '#facc15',
        brightBlue: '#60a5fa',
        brightMagenta: '#c084fc',
        brightCyan: '#22d3ee',
        brightWhite: '#f9fafb',
      },
      allowProposedApi: true,
    });

    // 创建 fit addon
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);

    // 挂载到 DOM
    term.open(terminalRef.current);
    fitAddon.fit();

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    // 连接 WebSocket
    const ws = new WebSocket('ws://localhost:8000/api/terminal/ws');

    ws.onopen = () => {
      setConnected(true);
      term.writeln('\x1b[32m✓ Connected to zsh terminal\x1b[0m');
    };

    ws.onmessage = (event) => {
      term.write(event.data);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      term.writeln('\x1b[31m✗ Connection error\x1b[0m');
    };

    ws.onclose = () => {
      setConnected(false);
      term.writeln('\x1b[31m✗ Connection closed\x1b[0m');
    };

    wsRef.current = ws;

    // 监听终端输入
    term.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'input',
          data: data
        }));
      }
    });

    // 窗口大小变化时重新适配
    const handleResize = () => {
      fitAddon.fit();
      // 通知后端终端大小变化
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'resize',
          rows: term.rows,
          cols: term.cols
        }));
      }
    };

    window.addEventListener('resize', handleResize);

    // 初始化时发送终端大小
    setTimeout(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'resize',
          rows: term.rows,
          cols: term.cols
        }));
      }
    }, 100);

    return () => {
      window.removeEventListener('resize', handleResize);
      term.dispose();
      ws.close();
    };
  }, []);

  useEffect(() => {
    // 全屏模式切换时重新适配大小
    if (fitAddonRef.current) {
      setTimeout(() => {
        fitAddonRef.current?.fit();
        if (wsRef.current?.readyState === WebSocket.OPEN && xtermRef.current) {
          wsRef.current.send(JSON.stringify({
            type: 'resize',
            rows: xtermRef.current.rows,
            cols: xtermRef.current.cols
          }));
        }
      }, 100);
    }
  }, [isFullscreen]);

  const handleClear = () => {
    xtermRef.current?.clear();
  };

  return (
    <div className={`h-full flex flex-col ${isFullscreen ? 'fixed inset-0 z-50 bg-[#0a0b0f] p-6' : ''}`}>
      {/* Header */}
      <header className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
            <TerminalIcon className="text-white" size={20} />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight uppercase">ZSH TERMINAL</h1>
            <p className="text-sm text-gray-400">
              {connected ? (
                <span className="text-green-500">● Connected - Full Terminal Emulation</span>
              ) : (
                <span className="text-red-500">● Disconnected</span>
              )}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <ActionButton variant="secondary" onClick={handleClear}>
            Clear
          </ActionButton>
          <ActionButton
            variant="secondary"
            onClick={() => setIsFullscreen(!isFullscreen)}
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </ActionButton>
          {isFullscreen && (
            <ActionButton variant="secondary" onClick={() => setIsFullscreen(false)}>
              <X size={16} />
            </ActionButton>
          )}
        </div>
      </header>

      {/* Terminal Content */}
      <div
        ref={terminalRef}
        className="flex-1 rounded-xl border border-white/10 overflow-hidden"
        style={{ minHeight: 0 }}
      />

      {/* Footer Tips */}
      <div className="mt-4 text-xs text-gray-500 space-y-1 font-mono">
        <p>• Full terminal emulation with xterm.js</p>
        <p>• <span className="text-cyan-400">↑/↓</span> Navigate • <span className="text-cyan-400">Tab</span> Complete • <span className="text-cyan-400">Ctrl+C</span> Interrupt</p>
        <p>• <span className="text-green-400">Interactive mode:</span> All ANSI sequences supported</p>
      </div>
    </div>
  );
};

export default Terminal;
