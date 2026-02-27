import React, { createContext, useContext, useState, useRef, useEffect, ReactNode } from 'react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';

export interface TerminalInstance {
  id: string;
  term: XTerm;
  ws: WebSocket;
  fitAddon: FitAddon;
  title: string;
}

interface TerminalContextType {
  terminals: TerminalInstance[];
  activeTabId: string | null;
  setActiveTabId: (id: string | null) => void;
  createTerminal: () => TerminalInstance;
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

// 超时时间：15 分钟
const INACTIVITY_TIMEOUT = 15 * 60 * 1000;

export const TerminalProvider: React.FC<TerminalProviderProps> = ({ children }) => {
  const [terminals, setTerminals] = useState<TerminalInstance[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const terminalCounterRef = useRef(1);
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);

  const createTerminal = (): TerminalInstance => {
    const id = `terminal-${Date.now()}`;
    const title = `Terminal ${terminalCounterRef.current++}`;

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
      // 移动端支持配置
      screenReaderMode: false,
      // 确保可以接收输入
      convertEol: true,
    });

    // 创建 fit addon
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);

    // 连接 WebSocket - 使用动态主机名支持局域网访问
    const wsHost = window.location.hostname;
    const wsPort = 8000;
    const ws = new WebSocket(`ws://${wsHost}:${wsPort}/api/terminal/ws`);

    ws.onopen = () => {
      // 连接成功后不显示提示，直接等待 shell 的提示符
    };

    ws.onmessage = (event) => {
      term.write(event.data);
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

    return newTerminal;
  };

  const closeTerminal = (id: string) => {
    const terminal = terminals.find(t => t.id === id);
    if (terminal) {
      terminal.term.dispose();
      terminal.ws.close();
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
    });
    setTerminals([]);
    setActiveTabId(null);
  };

  // 页面可见性监听
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // 页面隐藏，启动 15 分钟倒计时
        console.log('Page hidden, starting inactivity timer (15 minutes)');
        inactivityTimerRef.current = setTimeout(() => {
          console.log('Terminal sessions timed out, cleaning up...');
          cleanupAll();
        }, INACTIVITY_TIMEOUT);
      } else {
        // 页面显示，取消倒计时
        console.log('Page visible, clearing inactivity timer');
        if (inactivityTimerRef.current) {
          clearTimeout(inactivityTimerRef.current);
          inactivityTimerRef.current = null;
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
    };
  }, [terminals]);

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

