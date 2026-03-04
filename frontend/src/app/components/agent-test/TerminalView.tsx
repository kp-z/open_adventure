'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import { useUnifiedAgentSession } from '../../hooks/useUnifiedAgentSession';
import 'xterm/css/xterm.css';
import type { TestResult } from '../AgentTestPanel';

interface TerminalViewProps {
  agentId: number;
  agentName: string;
  onTestComplete: (result: TestResult) => void;
  sessionId?: string;
}

export function TerminalView({ agentId, agentName, onTestComplete, sessionId }: TerminalViewProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const [outputBuffer, setOutputBuffer] = useState('');

  // 使用统一的 WebSocket hook
  const { state, sendInput, resize } = useUnifiedAgentSession({
    agentId,
    agentName,
    mode: 'terminal',
    sessionId,
    onOutput: (output) => {
      if (xtermRef.current) {
        xtermRef.current.write(output);
        setOutputBuffer((prev) => prev + output);
      }
    },
    onError: (error) => {
      if (xtermRef.current) {
        xtermRef.current.writeln(`\r\n\x1b[31mError: ${error}\x1b[0m\r\n`);
      }
    },
  });

  // 初始化终端
  useEffect(() => {
    if (!terminalRef.current || xtermRef.current) return;

    const terminal = new Terminal({
      cursorBlink: true,
      fontSize: 12,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: 'transparent',
        foreground: '#ffffff',
        cursor: '#ffffff',
      },
      rows: 35,
      cols: 120,
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    terminal.loadAddon(fitAddon);
    terminal.loadAddon(webLinksAddon);
    terminal.open(terminalRef.current);
    fitAddon.fit();

    xtermRef.current = terminal;
    fitAddonRef.current = fitAddon;

    // 窗口大小变化时自适应
    const handleResize = () => {
      fitAddon.fit();
      // 通知后端终端尺寸变化
      resize(terminal.cols, terminal.rows);
    };

    // 使用 ResizeObserver 监听容器大小变化
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(terminalRef.current);

    // 处理用户输入
    terminal.onData((data) => {
      sendInput(data);
    });

    return () => {
      resizeObserver.disconnect();
      terminal.dispose();
      xtermRef.current = null;
    };
  }, [resize, sendInput]);

  // 移除连接状态提示，让 Claude Code CLI 自己显示欢迎信息
  // useEffect(() => {
  //   if (!xtermRef.current) return;
  //   if (state.isConnected) {
  //     xtermRef.current.writeln('$ Connected to agent session');
  //   }
  //   if (state.isReady) {
  //     xtermRef.current.writeln(`$ Agent "${agentName}" ready. Type your message and press Enter.\r\n`);
  //   }
  // }, [state.isConnected, state.isReady, agentName]);

  return (
    <div className="h-[600px] bg-black/60 rounded-xl p-4">
      <div ref={terminalRef} className="h-full" />
    </div>
  );
}
