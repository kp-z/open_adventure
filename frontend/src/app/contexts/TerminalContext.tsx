import React, { createContext, useContext, useState, useRef, useEffect, ReactNode } from 'react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { API_CONFIG } from '../../config/api';


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
  isRestoring: boolean;  // 是否正在恢复 session
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
  const [isRestoring, setIsRestoring] = useState(false);  // 是否正在恢复
  const terminalCounterRef = useRef(1);
  const hasRestoredRef = useRef(false);

  // 页面加载时尝试恢复之前的 terminal sessions
  useEffect(() => {
    if (hasRestoredRef.current) return;
    hasRestoredRef.current = true;

    const restoreSessions = async () => {
      setIsRestoring(true);  // 标记开始恢复
      console.log('[TerminalContext] Attempting to restore previous sessions...');

      // 从 localStorage 获取所有保存的 session
      const savedSessions: Array<{ id: string; sessionId: string; title: string }> = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('terminal_session_')) {
          const id = key.replace('terminal_session_', '');
          const sessionId = localStorage.getItem(key);
          const title = localStorage.getItem(`terminal_title_${id}`) || `Terminal ${terminalCounterRef.current++}`;
          if (sessionId) {
            savedSessions.push({ id, sessionId, title });
          }
        }
      }

      if (savedSessions.length === 0) {
        console.log('[TerminalContext] No previous sessions found');
        setIsRestoring(false);  // 恢复完成
        return;
      }

      console.log(`[TerminalContext] Found ${savedSessions.length} previous sessions`);
      console.log('[TerminalContext] Saved sessions:', savedSessions);

      // 恢复每个 session
      savedSessions.forEach(({ id, sessionId, title }) => {
        try {
          console.log(`[TerminalContext] Restoring session ${sessionId} with ID ${id}`);

          // 检测是否为移动设备（使用 window.innerWidth）
          const isMobile = window.innerWidth < 768;
          const fontSize = isMobile ? 11 : 13;

          // 创建 xterm 实例
          const term = new XTerm({
            cursorBlink: true,
            fontSize: fontSize,
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
            scrollback: 1000,
            fastScrollModifier: 'alt',
            fastScrollSensitivity: 5,
            scrollSensitivity: 3,
            rendererType: 'canvas',
            disableStdin: false,
            cursorStyle: 'block',
            cursorWidth: 2,
          });

          const fitAddon = new FitAddon();
          term.loadAddon(fitAddon);

          // 连接 WebSocket，带上 session_id 参数以恢复会话
          const wsUrl = `${API_CONFIG.WS_BASE_URL}/terminal/ws?session_id=${sessionId}`;
          console.log('[TerminalContext] Reconnecting to session:', wsUrl);
          const ws = new WebSocket(wsUrl);

          // 标记是否成功重连
          let reconnected = false;

          const restoredTerminal: TerminalInstance = {
            id,
            term,
            ws,
            fitAddon,
            title,
            sessionId
          };

          ws.onopen = () => {
            console.log('[TerminalContext] WebSocket reconnected for session:', sessionId);
            // 不在这里 writeln，因为 xterm 还没 open 到 DOM

            // WebSocket 连接成功后再添加到状态（检查是否已存在）
            setTerminals(prev => {
              // 检查是否已经添加过这个 terminal
              if (prev.find(t => t.id === id)) {
                console.log('[TerminalContext] Terminal already exists, skipping:', id);
                return prev;
              }
              return [...prev, restoredTerminal];
            });
            if (!activeTabId) {
              setActiveTabId(id);
            }
          };

          ws.onmessage = (event) => {
            const data = event.data;

            // 检查是否是 session ID 消息
            if (typeof data === 'string' && data.includes('SESSION_ID:')) {
              return; // 不显示这个消息
            }

            // 检查是否是重连成功消息
            if (typeof data === 'string' && data.includes('Reconnected to existing session')) {
              reconnected = true;
              console.log('[TerminalContext] Session reconnection confirmed');
              // 不显示后端的重连消息，我们已经显示了自己的
              return;
            }

            term.write(data);
          };

          ws.onerror = (error) => {
            console.error('[TerminalContext] WebSocket error during restore:', error);
            term.writeln('\x1b[31m✗ Failed to restore session\x1b[0m');
            // 清理失败的 session
            localStorage.removeItem(`terminal_session_${id}`);
            localStorage.removeItem(`terminal_title_${id}`);
          };

          ws.onclose = (event) => {
            // 只在非正常关闭且未成功重连时显示错误消息
            if (!reconnected && event.code !== 1000) {
              console.log('[TerminalContext] Connection closed unexpectedly:', event.code, event.reason);
              term.writeln('\x1b[31m✗ Connection closed\x1b[0m');
            } else if (reconnected) {
              console.log('[TerminalContext] Connection closed after successful reconnection');
            }
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

          // restoredTerminal 已在上面的 onopen 回调中添加到状态
        } catch (error) {
          console.error(`[TerminalContext] Failed to restore session ${sessionId}:`, error);
          // 清理失败的 session
          localStorage.removeItem(`terminal_session_${id}`);
          localStorage.removeItem(`terminal_title_${id}`);
        }
      });

      // 恢复逻辑完成（注意：WebSocket 连接是异步的，但我们已经启动了所有恢复）
      // 延迟 1 秒后标记恢复完成，给 WebSocket 连接时间
      setTimeout(() => {
        setIsRestoring(false);
        console.log('[TerminalContext] Restore process completed');
      }, 1000);
    };

    // 立即恢复，不延迟
    restoreSessions();
  }, []);

  const createTerminal = (projectPath?: string): TerminalInstance => {
    // 如果正在恢复，不创建新终端
    if (isRestoring) {
      console.log('[TerminalContext] ⚠️ Skipping createTerminal - restore in progress');
      // 返回一个占位符，实际不会被使用
      return null as any;
    }

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

    // 检测是否为移动设备（使用 window.innerWidth）
    const isMobile = window.innerWidth < 768;
    const fontSize = isMobile ? 11 : 13;

    // 创建 xterm 实例
    const term = new XTerm({
      cursorBlink: true,
      fontSize: fontSize,
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

    // 连接 WebSocket
    const wsUrl = projectPath
      ? `${API_CONFIG.WS_BASE_URL}/terminal/ws?project_path=${encodeURIComponent(projectPath)}`
      : `${API_CONFIG.WS_BASE_URL}/terminal/ws`;
    console.log('[TerminalContext] Creating WebSocket connection to:', wsUrl);
    const ws = new WebSocket(wsUrl);

    // 标记连接状态
    let isConnected = false;

    ws.onopen = () => {
      console.log('[TerminalContext] WebSocket connected for terminal:', id);
      isConnected = true;
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
          localStorage.setItem(`terminal_title_${id}`, title);
          return; // 不显示这个消息
        }
      }

      term.write(data);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      term.writeln('\x1b[31m✗ Connection error\x1b[0m');
    };

    ws.onclose = (event) => {
      // 只在已连接后异常关闭时显示错误消息
      if (isConnected && event.code !== 1000) {
        console.log('[TerminalContext] Connection closed unexpectedly:', event.code, event.reason);
        term.writeln('\x1b[31m✗ Connection closed\x1b[0m');
      } else if (!isConnected) {
        console.log('[TerminalContext] Connection failed to establish');
        term.writeln('\x1b[31m✗ Failed to connect\x1b[0m');
      }
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

  const closeTerminal = async (id: string) => {
    const terminal = terminals.find(t => t.id === id);
    if (terminal) {
      // 调用后端 API 关闭 PTY 进程
      if (terminal.sessionId) {
        try {
          console.log(`[TerminalContext] Closing backend session: ${terminal.sessionId}`);
          const response = await fetch(`${API_CONFIG.BASE_URL}/terminal/sessions/${terminal.sessionId}/close`, {
            method: 'POST'
          });
          if (response.ok) {
            console.log(`[TerminalContext] Backend session ${terminal.sessionId} closed successfully`);
          } else {
            console.error(`[TerminalContext] Failed to close backend session: ${response.status}`);
          }
        } catch (error) {
          console.error(`[TerminalContext] Error closing backend session:`, error);
        }
      }

      // 关闭前端资源
      terminal.term.dispose();
      terminal.ws.close();
      // 清理 localStorage 中的 session ID 和 title
      localStorage.removeItem(`terminal_session_${id}`);
      localStorage.removeItem(`terminal_title_${id}`);
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

  const cleanupAll = async () => {
    // 关闭所有后端 session
    const closePromises = terminals.map(async (terminal) => {
      if (terminal.sessionId) {
        try {
          console.log(`[TerminalContext] Closing backend session: ${terminal.sessionId}`);
          const response = await fetch(`${API_CONFIG.BASE_URL}/terminal/sessions/${terminal.sessionId}/close`, {
            method: 'POST'
          });
          if (response.ok) {
            console.log(`[TerminalContext] Backend session ${terminal.sessionId} closed successfully`);
          }
        } catch (error) {
          console.error(`[TerminalContext] Error closing backend session:`, error);
        }
      }
    });

    // 等待所有后端 session 关闭
    await Promise.all(closePromises);

    // 关闭前端资源
    terminals.forEach(terminal => {
      terminal.term.dispose();
      terminal.ws.close();
      // 清理 localStorage
      localStorage.removeItem(`terminal_session_${terminal.id}`);
      localStorage.removeItem(`terminal_title_${terminal.id}`);
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
        isRestoring,
      }}
    >
      {children}
    </TerminalContext.Provider>
  );
};

