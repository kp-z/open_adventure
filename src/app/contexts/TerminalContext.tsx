import React, { createContext, useContext, useState, useRef, useEffect, ReactNode } from 'react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';

export interface TerminalInstance {
  id: string;
  term: XTerm;
  ws: WebSocket;
  fitAddon: FitAddon;
  title: string;
  sessionId?: string;  // 后端的 session ID
}

interface TerminalContextType {
  terminals: TerminalInstance[];
  activeTabId: string | null;
  setActiveTabId: (id: string | null) => void;
  createTerminal: (projectPath?: string) => TerminalInstance;
  closeTerminal: (id: string) => void;
  cleanupAll: () => void;
}

const TerminalContext = createContext<TerminalContextType | undefined>(undefined);

export const useTerminalContext = () => {
  const context = useContext(TerminalContext);
  if (!context) {
    throw new Error('useTerminalContext must be used within TerminalProvider');
  }
  return context;
};

interface TerminalProviderProps {
  children: ReactNode;
}

export const TerminalProvider: React.FC<TerminalProviderProps> = ({ children }) => {
  const [terminals, setTerminals] = useState<TerminalInstance[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const terminalCounterRef = useRef(1);

  const createTerminal = (projectPath?: string): TerminalInstance => {
    const id = `terminal-${Date.now()}`;

    // 根据项目路径生成 title
    let title = `Terminal ${terminalCounterRef.current++}`;
    if (projectPath) {
      // 从路径中提取项目名（最后一个目录名）
      const pathParts = projectPath.split('/').filter(p => p);
      const projectName = pathParts[pathParts.length - 1] || 'Terminal';
      title = projectName;
    }

    console.log('[TerminalContext] createTerminal called');
    console.log('[TerminalContext] Project path:', projectPath);
    console.log('[TerminalContext] Terminal title:', title);
    console.log('[TerminalContext] New terminal ID:', id);
    console.log('[TerminalContext] Current terminals count:', terminals.length);

    // 创建 xterm 实例
    const term = new XTerm({
      cursorBlink: true,
      fontSize: 13,
      fontFamily: "'Fira Code', 'Menlo', 'Monaco', 'Courier New', monospace",
      theme: {
        background: '#0f111a',
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
      screenReaderMode: false,
      convertEol: true,

      // 移动端优化配置
      scrollback: 1000,  // 限制滚动缓冲区，提升性能
      fastScrollModifier: 'alt',  // 快速滚动修饰键
      fastScrollSensitivity: 5,   // 快速滚动灵敏度
      scrollSensitivity: 3,       // 普通滚动灵敏度

      // 移动端渲染优化
      rendererType: 'canvas',     // 使用 canvas 渲染，性能更好
      disableStdin: false,        // 确保可以输入

      // 光标和选择优化
      cursorStyle: 'block',       // 块状光标在移动端更明显
      cursorWidth: 2,             // 光标宽度
    });

    // 创建 fit addon
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);

    // 连接 WebSocket - 使用动态主机名支持局域网访问
    const wsHost = window.location.hostname;
    const wsPort = 8000;
    // 如果指定了项目路径，添加到 URL 参数中
    const wsUrl = projectPath
      ? `ws://${wsHost}:${wsPort}/api/terminal/ws?project_path=${encodeURIComponent(projectPath)}`
      : `ws://${wsHost}:${wsPort}/api/terminal/ws`;
    console.log('[TerminalContext] Creating WebSocket connection to:', wsUrl);
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('[TerminalContext] WebSocket connected for terminal:', id);
    };

    ws.onmessage = (event) => {
      const data = event.data;

      // 检查是否是 session ID 消息（OSC 序列）
      if (typeof data === 'string' && data.includes('SESSION_ID:')) {
        const match = data.match(/SESSION_ID:([a-f0-9-]+)/);
        if (match) {
          const sessionId = match[1];
          console.log('[TerminalContext] Received session ID:', sessionId);
          // 保存 session ID 到 terminal 实例
          newTerminal.sessionId = sessionId;
          // 保存到 localStorage
          localStorage.setItem(`terminal_session_${id}`, sessionId);
          return; // 不显示这个消息
        }
      }

      term.write(data);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      term.writeln('\x1b[31m✗ Connection error\x1b[0m');
    };

    ws.onclose = () => {
      term.writeln('\x1b[31m✗ Connection closed\x1b[0m');
    };

    // 监听终端输入
    term.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'input',
          data: data
        }));
      }
    });

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

    const newTerminal: TerminalInstance = {
      id,
      term,
      ws,
      fitAddon,
      title
    };

    setTerminals(prev => [...prev, newTerminal]);
    setActiveTabId(id);
    console.log('[TerminalContext] Terminal added to state, new count:', terminals.length + 1);
    console.log('[TerminalContext] Active tab set to:', id);

    return newTerminal;
  };

  const closeTerminal = (id: string) => {
    const terminal = terminals.find(t => t.id === id);
    if (terminal) {
      terminal.term.dispose();
      terminal.ws.close();
      // 清理 localStorage 中的 session ID
      localStorage.removeItem(`terminal_session_${id}`);
    }

    setTerminals(prev => {
      const newTerminals = prev.filter(t => t.id !== id);

      // 如果关闭的是当前活跃的终端，切换到第一个
      if (activeTabId === id && newTerminals.length > 0) {
        setActiveTabId(newTerminals[0].id);
      } else if (newTerminals.length === 0) {
        setActiveTabId(null);
      }

      return newTerminals;
    });
  };

  const cleanupAll = () => {
    terminals.forEach(terminal => {
      terminal.term.dispose();
      terminal.ws.close();
      // 清理 localStorage
      localStorage.removeItem(`terminal_session_${terminal.id}`);
    });
    setTerminals([]);
    setActiveTabId(null);
  };

  return (
    <TerminalContext.Provider
      value={{
        terminals,
        activeTabId,
        setActiveTabId,
        createTerminal,
        closeTerminal,
        cleanupAll,
      }}
    >
      {children}
    </TerminalContext.Provider>
  );
};

