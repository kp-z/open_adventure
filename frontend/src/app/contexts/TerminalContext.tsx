import React, { createContext, useContext, useState, useRef, useEffect, ReactNode, useCallback } from 'react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { SerializeAddon } from '@xterm/addon-serialize';
import { API_CONFIG } from '../../config/api';
import { useNotifications } from './NotificationContext';

export type TerminalLifecycle = 'init' | 'opened' | 'ws_connecting' | 'ready' | 'disposed';

// tmux 会话状态类型
export type TmuxSessionState = 'detached' | 'attached' | 'killed';

export interface TmuxSessionInfo {
  sessionName: string;
  state: TmuxSessionState;
  lastDetachTime?: number;
  projectPath?: string;
}

export interface TmuxSettings {
  defaultCloseAction: 'detach' | 'kill';  // 默认关闭行为
  autoRestoreOnRefresh: boolean;          // 刷新时自动恢复
}

interface TerminalInputPacket {
  seq: number;
  data: string;
  ts: number;
}

export interface TerminalInstance {
  id: string;
  term: XTerm;
  ws: WebSocket;
  fitAddon: FitAddon;
  serializeAddon: SerializeAddon;
  title: string;
  sessionId?: string;
  claudeCodeId?: string;  // Claude Code 的 session ID
  projectName?: string;    // 项目名称
  lifecycle: TerminalLifecycle;
  isOpened: boolean;
  inputQueue: TerminalInputPacket[];
  seqCounter: number;
  lastAckSeq: number;
  lastInputAt: number;
  lastOutputAt: number;
  promptNudgeScheduled: boolean;
  lastBackendInputSeq: number;
  backendOutputFrames: number;
  backendProcessAlive: boolean;
  backendPid: number;
  reconnecting: boolean;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
  heartbeatInterval?: ReturnType<typeof setInterval>; // 心跳定时器
  lastHeartbeat: number; // 最后心跳时间
  useTmux: boolean; // 是否使用 tmux
  tmuxSessionName?: string; // tmux 会话名称
  tmuxAlive: boolean; // tmux 会话是否存活
  kicked?: boolean;           // 是否被踢出
  kickedReason?: string;      // 被踢出原因
  kickedAt?: number;          // 被踢出时间戳
}

interface ClaudeConversation {
  session_id: string;
  title: string;
  project_hint?: string;
  last_model?: string;
  last_updated?: string;
  source_file?: string;
}

interface TerminalContextType {
  terminals: TerminalInstance[];
  activeTabId: string | null;
  setActiveTabId: (id: string | null) => void;
  createTerminal: (projectPath?: string, autoStartClaude?: boolean) => TerminalInstance | null;
  closeTerminal: (id: string, action?: 'detach' | 'kill') => void;
  cleanupAll: () => void;
  sendInput: (terminalId: string, data: string) => void;
  sendResize: (terminalId: string, rows: number, cols: number) => void;
  sendRestoreReady: (terminalId: string, rows: number, cols: number) => void;
  markTerminalOpened: (terminalId: string) => void;
  syncClaudeConversations: () => Promise<ClaudeConversation[]>;
  restoreClaudeConversation: (sessionId: string) => Promise<TerminalInstance | null>;
  reconnectTerminal: (terminalId: string) => Promise<boolean>;
  checkClaudeStatus: (sessionId: string) => Promise<{ running: boolean; session_exists: boolean; process_alive: boolean; claude_resume_session: string | null }>;
  checkTmuxAlive: (terminal: TerminalInstance) => Promise<boolean>;
  killTmuxSession: (sessionName: string) => Promise<boolean>;
  detachTerminal: (terminal: TerminalInstance) => Promise<void>;
  getTmuxSettings: () => TmuxSettings;
  restoreTmuxSession: (sessionName: string) => Promise<void>;
  showRestoreDialog: boolean;
  detachedSessions: Array<{
    sessionName: string;
    projectPath?: string;
    lastDetachTime?: number;
  }>;
  handleRestoreSessions: (sessionNames: string[]) => void;
  handleIgnoreSessions: (sessionNames: string[]) => void;
  isRestoring: boolean;
  restoreSettled: boolean;
}

const TerminalContext = createContext<TerminalContextType | undefined>(undefined);

const MAX_INPUT_QUEUE_ITEMS = 500;
const MAX_INPUT_QUEUE_BYTES = 256 * 1024;

export const useTerminalContext = () => {
  const context = useContext(TerminalContext);
  if (!context) {
    throw new Error('useTerminalContext must be used within TerminalProvider');
  }
  return context;
};

// tmux 会话管理工具函数
const TMUX_SESSIONS_KEY = 'tmux_sessions';
const TMUX_SETTINGS_KEY = 'tmux_settings';

const getTmuxSessionsFromStorage = (): Record<string, TmuxSessionInfo> => {
  try {
    const data = localStorage.getItem(TMUX_SESSIONS_KEY);
    return data ? JSON.parse(data) : {};
  } catch (error) {
    console.error('[TerminalContext] Failed to parse tmux sessions from localStorage:', error);
    return {};
  }
};

const saveTmuxSessionState = (sessionName: string, info: TmuxSessionInfo): void => {
  try {
    const sessions = getTmuxSessionsFromStorage();
    sessions[sessionName] = info;
    localStorage.setItem(TMUX_SESSIONS_KEY, JSON.stringify(sessions));
    console.log('[TerminalContext] Saved tmux session state:', sessionName, info);
  } catch (error) {
    console.error('[TerminalContext] Failed to save tmux session state:', error);
  }
};

const removeTmuxSessionState = (sessionName: string): void => {
  try {
    const sessions = getTmuxSessionsFromStorage();
    delete sessions[sessionName];
    localStorage.setItem(TMUX_SESSIONS_KEY, JSON.stringify(sessions));
    console.log('[TerminalContext] Removed tmux session state:', sessionName);
  } catch (error) {
    console.error('[TerminalContext] Failed to remove tmux session state:', error);
  }
};

const getTmuxSettings = (): TmuxSettings => {
  try {
    const data = localStorage.getItem(TMUX_SETTINGS_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('[TerminalContext] Failed to parse tmux settings from localStorage:', error);
  }
  // 默认设置
  return {
    defaultCloseAction: 'detach',
    autoRestoreOnRefresh: false
  };
};

const saveTmuxSettings = (settings: TmuxSettings): void => {
  try {
    localStorage.setItem(TMUX_SETTINGS_KEY, JSON.stringify(settings));
    console.log('[TerminalContext] Saved tmux settings:', settings);
  } catch (error) {
    console.error('[TerminalContext] Failed to save tmux settings:', error);
  }
};

interface TerminalProviderProps {
  children: ReactNode;
}

export const TerminalProvider: React.FC<TerminalProviderProps> = ({ children }) => {
  const [terminals, setTerminals] = useState<TerminalInstance[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreSettled, setRestoreSettled] = useState(false);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [detachedSessions, setDetachedSessions] = useState<Array<{
    sessionName: string;
    projectPath?: string;
    lastDetachTime?: number;
  }>>([]);
  const { addNotification } = useNotifications();

  const terminalCounterRef = useRef(1);
  const hasRestoredRef = useRef(false);
  const restoreTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restoreSettledRef = useRef(false);
  const restoreActiveSetRef = useRef(false);
  const queueOverflowNotifyRef = useRef<Record<string, number>>({});

  const getTerminalTitle = (projectPath?: string, claudeCodeId?: string, terminalIndex?: number, tmuxSessionName?: string): string => {
    console.log('[TerminalContext] getTerminalTitle called', { projectPath, claudeCodeId, terminalIndex, tmuxSessionName });

    // 如果有 tmux session name，直接使用它作为标题
    if (tmuxSessionName) {
      console.log('[TerminalContext] Using tmux session name as title:', tmuxSessionName);
      return tmuxSessionName;
    }

    // 没有 tmux session name 时，返回空字符串
    // UI 层会根据空字符串和 lifecycle 状态显示 loading 状态
    console.log('[TerminalContext] No tmux session name yet, returning empty string for loading state');
    return '';
  };

  const collectSavedSessions = () => {
    const savedSessions: Array<{ id: string; sessionId: string; title: string }> = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith('terminal_session_')) {
        continue;
      }
      const id = key.replace('terminal_session_', '');
      const sessionId = localStorage.getItem(key);
      const title = localStorage.getItem(`terminal_title_${id}`) || `Terminal ${terminalCounterRef.current++}`;
      if (sessionId) {
        savedSessions.push({ id, sessionId, title });
      }
    }
    return savedSessions;
  };

  const fetchActiveSessions = async () => {
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/terminal/status`);
      if (!response.ok) {
        return [] as Array<{ id: string; sessionId: string; title: string; claudeCodeId?: string; useTmux?: boolean; tmuxSessionName?: string }>;
      }

      const data = await response.json();
      const activeSessions = Array.isArray(data.active_sessions) ? data.active_sessions : [];
      return activeSessions.map((session: any, index: number) => {
        // 优先使用 tmux session name 作为标题
        const title = getTerminalTitle(session.initial_dir, session.claude_code_id, index, session.tmux_session_name);
        return {
          id: `terminal-restored-${session.session_id}`,
          sessionId: session.session_id,
          claudeCodeId: session.claude_code_id,
          useTmux: session.use_tmux || false,
          tmuxSessionName: session.tmux_session_name,
          title,
        };
      });
    } catch (error) {
      console.error('[TerminalContext] Failed to fetch active backend sessions:', error);
      return [] as Array<{ id: string; sessionId: string; title: string; claudeCodeId?: string; useTmux?: boolean; tmuxSessionName?: string }>;
    }
  };

  const closeBackendSession = async (sessionId: string) => {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await fetch(`${API_CONFIG.BASE_URL}/terminal/sessions/${sessionId}/close`, {
          method: 'POST',
        });
        if (response.ok || response.status === 404) {
          return true;
        }
      } catch (error) {
        console.error(`[TerminalContext] Error closing backend session ${sessionId}, attempt ${attempt + 1}:`, error);
      }
    }
    return false;
  };

  const extractSessionId = (data: string): string | null => {
    const match = data.match(/SESSION_ID:([^\x07\r\n]+)/);
    return match?.[1]?.trim() || null;
  };

  const notifyTerminalConnectionIssue = (title: string, message: string) => {
    addNotification({ type: 'error', title, message });
  };

  const notifyQueueOverflow = useCallback((terminalId: string) => {
    const now = Date.now();
    const lastNotified = queueOverflowNotifyRef.current[terminalId] || 0;
    if (now - lastNotified < 5000) {
      return;
    }
    queueOverflowNotifyRef.current[terminalId] = now;
    addNotification({
      type: 'warning',
      title: '终端输入队列溢出',
      message: '输入过快导致队列超限，已丢弃最旧输入。请确认网络与终端连接状态。',
    });
  }, [addNotification]);

  const logLifecycle = (terminal: TerminalInstance, next: TerminalLifecycle, reason: string) => {
    if (terminal.lifecycle === next) {
      return;
    }
    console.log(`[TerminalContext] lifecycle transition: ${terminal.id} ${terminal.lifecycle} -> ${next} (${reason})`);
    terminal.lifecycle = next;
  };

  const getTerminalById = useCallback((id: string) => terminals.find((item) => item.id === id), [terminals]);

  const syncReadyLifecycle = (terminal: TerminalInstance, reason: string) => {
    const isWsOpen = terminal.ws.readyState === WebSocket.OPEN;
    if (terminal.isOpened && isWsOpen) {
      logLifecycle(terminal, 'ready', reason);
      return;
    }
    if (terminal.isOpened) {
      logLifecycle(terminal, 'opened', reason);
      return;
    }
    if (isWsOpen) {
      logLifecycle(terminal, 'ws_connecting', reason);
    }
  };

  const flushInputQueue = useCallback((terminal: TerminalInstance) => {
    if (terminal.lifecycle === 'disposed' || terminal.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    while (terminal.inputQueue.length > 0) {
      const packet = terminal.inputQueue.shift();
      if (!packet) {
        break;
      }
      const payload = { type: 'input', data: packet.data, seq: packet.seq };
      terminal.ws.send(JSON.stringify(payload));
      console.log(`[TerminalContext] send(seq): terminal=${terminal.id}, seq=${packet.seq}, bytes=${packet.data.length}`);
    }

    console.log(`[TerminalContext] flush queue: terminal=${terminal.id}, remaining=${terminal.inputQueue.length}`);
  }, []);

  const enqueueInput = useCallback((terminal: TerminalInstance, data: string) => {
    if (terminal.lifecycle === 'disposed') {
      return;
    }

    const packet: TerminalInputPacket = {
      seq: ++terminal.seqCounter,
      data,
      ts: Date.now(),
    };
    terminal.lastInputAt = packet.ts;
    terminal.inputQueue.push(packet);
    console.log(`[TerminalContext] enqueue: terminal=${terminal.id}, seq=${packet.seq}, queue=${terminal.inputQueue.length}`);

    let queueBytes = terminal.inputQueue.reduce((sum, item) => sum + item.data.length, 0);
    let dropped = false;
    while (terminal.inputQueue.length > MAX_INPUT_QUEUE_ITEMS || queueBytes > MAX_INPUT_QUEUE_BYTES) {
      const removed = terminal.inputQueue.shift();
      if (!removed) {
        break;
      }
      queueBytes -= removed.data.length;
      dropped = true;
    }

    if (dropped) {
      console.warn(`[TerminalContext] queue overflow: terminal=${terminal.id}, queue=${terminal.inputQueue.length}, bytes=${queueBytes}`);
      notifyQueueOverflow(terminal.id);
    }

    flushInputQueue(terminal);
  }, [flushInputQueue, notifyQueueOverflow]);

  const sendResize = useCallback((terminalId: string, rows: number, cols: number) => {
    const terminal = getTerminalById(terminalId);
    if (!terminal || terminal.lifecycle === 'disposed') {
      return;
    }
    if (terminal.ws.readyState !== WebSocket.OPEN) {
      return;
    }
    terminal.ws.send(JSON.stringify({ type: 'resize', rows, cols }));
  }, [getTerminalById]);

  const sendRestoreReady = useCallback((terminalId: string, rows: number, cols: number) => {
    const terminal = getTerminalById(terminalId);
    if (!terminal || terminal.lifecycle === 'disposed') {
      return;
    }
    if (terminal.ws.readyState !== WebSocket.OPEN) {
      return;
    }
    console.log(`[TerminalContext] Sending restore_ready: terminal=${terminalId}, rows=${rows}, cols=${cols}`);
    terminal.ws.send(JSON.stringify({ type: 'restore_ready', rows, cols }));
  }, [getTerminalById]);

  const markTerminalOpened = useCallback((terminalId: string) => {
    const terminal = getTerminalById(terminalId);
    if (!terminal || terminal.isOpened) {
      return;
    }
    terminal.isOpened = true;
    syncReadyLifecycle(terminal, 'term.open called');
    flushInputQueue(terminal);
  }, [flushInputQueue, getTerminalById]);

  const sendInput = useCallback((terminalId: string, data: string) => {
    const terminal = getTerminalById(terminalId);
    if (!terminal) {
      return;
    }
    enqueueInput(terminal, data);
  }, [enqueueInput, getTerminalById]);

  const initTerminal = useCallback((options: {
    id: string;
    title: string;
    projectPath?: string;
    autoStartClaude?: boolean;
    restoreSessionId?: string;
    claudeResumeSession?: string;  // Claude 会话恢复的 session ID
    useTmux?: boolean;  // 是否使用 tmux
    tmuxSessionName?: string;  // 🔧 新增：tmux session 名称
    mode: 'create' | 'restore';
    onSettled?: (state: 'open' | 'error' | 'close') => void;
  }): TerminalInstance => {
    const { id, title, projectPath, autoStartClaude, restoreSessionId, claudeResumeSession, useTmux = true, tmuxSessionName, mode, onSettled } = options;

    const isMobile = window.innerWidth < 768;
    const fontSize = isMobile ? 11 : 13;

    const term = new XTerm({
      cursorBlink: true,
      fontSize,
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
      // 移除 rendererType，让 xterm 自动选择最佳渲染器
      // rendererType: 'canvas',
      disableStdin: false,
      cursorStyle: 'block',
      cursorWidth: 2,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);

    const serializeAddon = new SerializeAddon();
    term.loadAddon(serializeAddon);

    // 构建 WebSocket URL
    let wsUrl: string;
    if (mode === 'restore' && restoreSessionId) {
      wsUrl = `${API_CONFIG.WS_BASE_URL}/terminal/ws?session_id=${restoreSessionId}`;
    } else {
      // 创建新终端
      const params = new URLSearchParams();
      if (projectPath) {
        params.append('project_path', projectPath);
      }
      if (autoStartClaude) {
        params.append('auto_start_claude', 'true');
      }
      if (claudeResumeSession) {
        params.append('claude_resume_session', claudeResumeSession);
      }
      if (useTmux !== undefined) {
        params.append('use_tmux', useTmux.toString());
      }
      // 🔧 新增：如果有 tmux session 名称，添加到 URL 参数
      if (tmuxSessionName) {
        params.append('tmux_session_name', tmuxSessionName);
        console.log('[TerminalContext] Adding tmux_session_name to WebSocket URL:', tmuxSessionName);
      }
      const queryString = params.toString();
      wsUrl = `${API_CONFIG.WS_BASE_URL}/terminal/ws${queryString ? `?${queryString}` : ''}`;
    }

    const ws = new WebSocket(wsUrl);

    const terminal: TerminalInstance = {
      id,
      term,
      ws,
      fitAddon,
      serializeAddon,
      title,
      sessionId: restoreSessionId,
      claudeCodeId: claudeResumeSession,  // 保存 Claude Code 的 session ID
      projectName: projectPath ? projectPath.split('/').filter(p => p).pop() : undefined,  // 提取项目名称
      lifecycle: 'init',
      isOpened: false,
      inputQueue: [],
      seqCounter: 0,
      lastAckSeq: 0,
      lastInputAt: 0,
      lastOutputAt: Date.now(),
      promptNudgeScheduled: false,
      lastBackendInputSeq: 0,
      backendOutputFrames: 0,
      backendProcessAlive: true,
      backendPid: 0,
      reconnecting: false,
      reconnectAttempts: 0,
      maxReconnectAttempts: 50, // 增加重连次数，支持长时间保持连接
      heartbeatInterval: undefined,
      lastHeartbeat: Date.now(),
      useTmux: useTmux ?? true,
      tmuxSessionName,
      tmuxAlive: false,
    };

    logLifecycle(terminal, 'ws_connecting', `${mode}:ws create`);

    let sessionIdTimeout: ReturnType<typeof setTimeout> | null = null;
    let settled = false;
    const settleOnce = (state: 'open' | 'error' | 'close') => {
      if (settled) {
        return;
      }
      settled = true;
      onSettled?.(state);
    };

    ws.onopen = () => {
      console.log(`[TerminalContext] ws opened: terminal=${id}, mode=${mode}`);
      syncReadyLifecycle(terminal, 'ws open');

      // 启动心跳保活机制
      terminal.heartbeatInterval = setInterval(() => {
        if (terminal.ws.readyState === WebSocket.OPEN) {
          try {
            terminal.ws.send(JSON.stringify({ type: 'ping' }));
            terminal.lastHeartbeat = Date.now();
            console.log(`[TerminalContext] Heartbeat sent: terminal=${id}`);
          } catch (error) {
            console.error(`[TerminalContext] Failed to send heartbeat: terminal=${id}`, error);
          }
        }
      }, 30000); // 每30秒发送一次心跳

      if (mode === 'restore' && restoreSessionId) {
        localStorage.setItem(`terminal_session_${id}`, restoreSessionId);
        localStorage.setItem(`terminal_title_${id}`, title);
        setTerminals((prev) => {
          if (prev.find((item) => item.id === id || item.sessionId === restoreSessionId)) {
            return prev;
          }
          return [...prev, terminal];
        });
        setActiveTabId((prev) => {
          if (restoreActiveSetRef.current) {
            return prev;
          }
          restoreActiveSetRef.current = true;
          return prev ?? id;
        });
      }

      setTimeout(() => {
        sendResize(id, term.rows, term.cols);
      }, 120);

      flushInputQueue(terminal);
      settleOnce('open');
    };

    ws.onmessage = async (event) => {
      const raw = event.data;

      // 处理 Blob 类型数据（通常是 scrollback 回放）
      if (raw instanceof Blob) {
        try {
          const arrayBuffer = await raw.arrayBuffer();
          const uint8Array = new Uint8Array(arrayBuffer);
          console.log(`[TerminalContext] 📦 Received Blob data: ${id}, size=${raw.size}`);

          // 直接写入二进制数据到终端，保留 ANSI 序列
          term.write(uint8Array);
          terminal.lastOutputAt = Date.now();
          terminal.backendOutputFrames += 1;
        } catch (error) {
          console.error('[TerminalContext] Failed to read Blob data:', error);
        }
        return;
      }

      if (typeof raw === 'string') {
        let parsed: any = null;
        if (raw.startsWith('{')) {
          try {
            parsed = JSON.parse(raw);
          } catch {
            parsed = null;
          }
        }

        if (parsed?.type === 'ack') {
          const ackSeq = Number(parsed.seq || 0);
          if (Number.isFinite(ackSeq) && ackSeq > 0) {
            terminal.lastAckSeq = ackSeq;
            console.log(`[TerminalContext] ack(seq): terminal=${id}, seq=${ackSeq}`);
          }
          return;
        }

        if (parsed?.type === 'debug_input_accepted') {
          const inputSeq = Number(parsed.seq || 0);
          if (Number.isFinite(inputSeq) && inputSeq > 0) {
            terminal.lastBackendInputSeq = inputSeq;
            terminal.backendProcessAlive = Boolean(parsed.process_alive);
            terminal.backendPid = Number(parsed.pid || 0);
            console.log(`[TerminalContext] backend_input_accepted(seq): terminal=${id}, seq=${inputSeq}`);
          }
          return;
        }

        if (parsed?.type === 'debug_output_forwarded') {
          terminal.backendOutputFrames = Number(parsed.frame || terminal.backendOutputFrames + 1);
          return;
        }

        if (parsed?.type === 'pong') {
          // 收到心跳响应，更新最后心跳时间
          terminal.lastHeartbeat = Date.now();
          console.log(`[TerminalContext] Heartbeat pong received: terminal=${id}`);
          return;
        }

        // 处理 kicked 消息
        if (parsed?.type === 'kicked') {
          console.warn(`[TerminalContext] ⚠️ Terminal kicked: ${id}`, parsed);

          // 1. 显示通知
          addNotification({
            type: 'warning',
            title: '终端已在其他设备打开',
            message: parsed.message || '此终端已在其他设备上打开',
            duration: 0  // 持久显示
          });

          // 2. 标记终端为被踢出状态
          terminal.kicked = true;
          terminal.kickedReason = parsed.reason;
          terminal.kickedAt = Date.now();

          // 3. 禁用输入
          term.options.disableStdin = true;

          // 4. 在终端显示提示信息
          term.write('\r\n\x1b[33m⚠️  此终端已在其他设备上打开\x1b[0m\r\n');
          term.write('\x1b[36m提示：点击右上角"重新连接"按钮恢复连接\x1b[0m\r\n');

          // 5. 触发 UI 更新（显示重连按钮）
          setTerminals((currentTerminals) => [...currentTerminals]);

          // 6. 不自动重连，等待用户手动操作
          return;
        }

        if (raw.includes('SESSION_ID:')) {
          const extracted = extractSessionId(raw);
          if (extracted) {
            terminal.sessionId = extracted;
            localStorage.setItem(`terminal_session_${id}`, extracted);
            localStorage.setItem(`terminal_title_${id}`, title);
            if (sessionIdTimeout) {
              clearTimeout(sessionIdTimeout);
              sessionIdTimeout = null;
            }
          }
          return;
        }

        // 处理 tmux 会话信息
        if (raw.includes('TMUX_INFO:')) {
          try {
            const match = raw.match(/TMUX_INFO:({.*?})/);
            if (match && match[1]) {
              const tmuxInfo = JSON.parse(match[1]);
              if (tmuxInfo.type === 'tmux_created' && tmuxInfo.session_name) {
                terminal.tmuxSessionName = tmuxInfo.session_name;
                terminal.tmuxAlive = true;
                // 更新 terminal 标题为 tmux session name
                terminal.title = tmuxInfo.session_name;
                localStorage.setItem(`terminal_title_${id}`, terminal.title);
                localStorage.setItem(`terminal_tmux_${id}`, JSON.stringify({
                  sessionName: tmuxInfo.session_name,
                  useTmux: terminal.useTmux,
                  createdAt: Date.now()
                }));
                console.log(`[TerminalContext] tmux session created: ${tmuxInfo.session_name}, title updated`);
                // 使用 map 创建新对象引用，确保 React 检测到变化并重新渲染
                setTerminals((prev) => prev.map(t => 
                  t.id === id 
                    ? { ...t, title: tmuxInfo.session_name, tmuxSessionName: tmuxInfo.session_name, tmuxAlive: true }
                    : t
                ));
              }
            }
          } catch (error) {
            console.error('[TerminalContext] Failed to parse tmux info:', error);
          }
          return;
        }

        if (raw.includes('Reconnected to existing session')) {
          return;
        }

        // 检测 Claude 启动成功的标志
        if (raw.includes('Claude Code') || raw.includes('claude-code') || raw.includes('Resuming session')) {
          // 延迟检测 Claude 会话 ID（等待 Claude 完全启动）
          setTimeout(async () => {
            if (terminal.sessionId && !terminal.claudeCodeId) {
              try {
                const claudeStatus = await checkClaudeStatus(terminal.sessionId);
                if (claudeStatus.running && claudeStatus.claude_resume_session) {
                  console.log(`[TerminalContext] Detected Claude session ID: ${claudeStatus.claude_resume_session}`);

                  // 更新 terminal 的 claudeCodeId 和标题
                  setTerminals((currentTerminals) => {
                    const termIndex = currentTerminals.findIndex(t => t.id === id);
                    const term = currentTerminals[termIndex];
                    if (term) {
                      term.claudeCodeId = claudeStatus.claude_resume_session;
                      // 如果已经有 tmux session name（由 TMUX_INFO 设置），保留它作为标题
                      if (!term.tmuxSessionName) {
                        term.title = getTerminalTitle(claudeStatus.initial_dir, claudeStatus.claude_resume_session, termIndex);
                        localStorage.setItem(`terminal_title_${id}`, term.title);
                      }
                      // 否则保持 TMUX_INFO 设置的标题不变
                    }
                    return [...currentTerminals];
                  });
                }
              } catch (error) {
                console.error('[TerminalContext] Failed to detect Claude session ID:', error);
              }
            }
          }, 2000);
        }

        // 写入终端输出
        console.log(`[TerminalContext] 📤 Writing to terminal: ${id}, length=${raw.length}, preview=${raw.substring(0, 50)}`);
        term.write(raw);
        terminal.lastOutputAt = Date.now();
        terminal.backendOutputFrames += 1;
      }
    };

    ws.onerror = () => {
      logLifecycle(terminal, 'disposed', 'ws error');
      term.writeln('\x1b[31m✗ Connection error\x1b[0m');
      notifyTerminalConnectionIssue('终端连接失败', mode === 'restore' ? 'Terminal 会话恢复失败，请重试或重建终端' : 'Terminal WebSocket 连接失败，请检查后端状态');
      localStorage.removeItem(`terminal_session_${id}`);
      localStorage.removeItem(`terminal_title_${id}`);
      settleOnce('error');
    };

    ws.onclose = (event) => {
      console.log(`[TerminalContext] WebSocket closed: ${id}, code=${event.code}, reason=${event.reason}`);
      logLifecycle(terminal, 'disposed', `ws close:${event.code}`);

      // 清理心跳定时器
      if (terminal.heartbeatInterval) {
        clearInterval(terminal.heartbeatInterval);
        terminal.heartbeatInterval = undefined;
        console.log(`[TerminalContext] Heartbeat cleared: terminal=${id}`);
      }

      // 区分被踢出和其他关闭原因
      if (event.code === 4001 || terminal.kicked) {
        // 被踢出，不自动重连
        console.log(`[TerminalContext] Terminal was kicked, not auto-reconnecting`);
        terminal.lifecycle = 'disposed';
        settleOnce('close');
        return;
      }

      if (event.code !== 1000) {
        term.writeln('\x1b[31m✗ Connection closed\x1b[0m');
      }
      settleOnce('close');
    };

    term.onData((data) => {
      enqueueInput(terminal, data);
    });

    if (mode === 'create') {
      sessionIdTimeout = setTimeout(() => {
        if (!terminal.sessionId) {
          const message = 'Terminal 会话未返回 SESSION_ID，刷新后可能无法恢复。建议稍后重建终端。';
          console.error('[TerminalContext] SESSION_ID timeout:', { terminalId: id });
          term.writeln(`\x1b[33mℹ ${message}\x1b[0m`);
          notifyTerminalConnectionIssue('终端会话告警', message);
        }
      }, 3000);
    }

    return terminal;
  }, [enqueueInput, flushInputQueue, sendResize]);

  const syncClaudeConversations = useCallback(async (): Promise<ClaudeConversation[]> => {
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/terminal/claude-conversations?limit=80`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      const items = Array.isArray(data?.items) ? data.items : [];
      return items.map((item: any) => ({
        session_id: item.session_id,
        title: item.title || item.session_id,
        project_hint: item.project_hint,
        last_model: item.last_model,
        last_updated: item.last_updated,
        source_file: item.source_file,
      }));
    } catch (error) {
      console.error('[TerminalContext] Failed to sync claude conversations:', error);
      addNotification({
        type: 'error',
        title: '同步会话失败',
        message: '无法读取本机 Claude Code 会话列表，请检查后端状态。',
      });
      return [];
    }
  }, [addNotification]);

  const checkTmuxAlive = useCallback(async (terminal: TerminalInstance): Promise<boolean> => {
    if (!terminal.useTmux || !terminal.tmuxSessionName) {
      return true;
    }

    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/terminal/tmux/sessions`);
      if (!response.ok) {
        return false;
      }
      const data = await response.json();
      const sessions = data.sessions || [];
      return sessions.includes(terminal.tmuxSessionName);
    } catch (error) {
      console.error('[TerminalContext] Failed to check tmux alive:', error);
      return false;
    }
  }, []);

  const killTmuxSession = useCallback(async (sessionName: string): Promise<boolean> => {
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/terminal/tmux/kill/${sessionName}`, {
        method: 'POST'
      });
      return response.ok;
    } catch (error) {
      console.error('[TerminalContext] Failed to kill tmux session:', error);
      return false;
    }
  }, []);

  const detachTerminal = useCallback(async (terminal: TerminalInstance): Promise<void> => {
    if (!terminal.useTmux || !terminal.tmuxSessionName) {
      console.warn('[TerminalContext] Cannot detach non-tmux terminal');
      return;
    }

    console.log('[TerminalContext] Detaching terminal:', terminal.id, terminal.tmuxSessionName);

    // 1. 保存 detached 状态到 localStorage
    saveTmuxSessionState(terminal.tmuxSessionName, {
      sessionName: terminal.tmuxSessionName,
      state: 'detached',
      lastDetachTime: Date.now(),
      projectPath: terminal.projectName
    });

    // 2. 关闭前端连接（不 kill tmux）
    terminal.term.dispose();
    terminal.ws.close();

    // 3. 清理前端状态
    localStorage.removeItem(`terminal_session_${terminal.id}`);
    localStorage.removeItem(`terminal_title_${terminal.id}`);

    // 4. 从 terminals 列表移除
    setTerminals(prev => prev.filter(t => t.id !== terminal.id));

    // 5. 显示通知
    addNotification({
      type: 'info',
      title: 'tmux 会话已暂离',
      message: `会话 ${terminal.tmuxSessionName} 仍在后台运行，刷新页面可恢复连接`
    });

    console.log('[TerminalContext] Terminal detached successfully');
  }, [addNotification]);


  const checkClaudeStatus = useCallback(async (sessionId: string) => {
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/terminal/session/${sessionId}/claude-status`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('[TerminalContext] Failed to check Claude status:', error);
      return {
        running: false,
        session_exists: false,
        process_alive: false,
        claude_resume_session: null,
        initial_dir: null,
      };
    }
  }, []);

  const restoreClaudeConversation = useCallback(async (sessionId: string): Promise<TerminalInstance | null> => {
    if (!sessionId) {
      return null;
    }

    if (!restoreSettled || isRestoring) {
      addNotification({
        type: 'info',
        title: '终端恢复中',
        message: '请等待当前恢复流程完成后再切换会话。',
      });
      return null;
    }

    // 检查是否已经有这个会话的终端
    const existing = terminals.find((terminal) => terminal.claudeCodeId === sessionId);
    if (existing) {
      setActiveTabId(existing.id);
      addNotification({
        type: 'info',
        title: '会话已存在',
        message: `会话 ${sessionId.slice(0, 8)} 已经在运行中。`,
      });
      return existing;
    }

    // 从 Claude 会话列表中获取会话信息
    try {
      const conversations = await syncClaudeConversations();
      const conversation = conversations.find(c => c.session_id === sessionId);

      // 从 project_hint 或 cwd 中提取项目路径
      let projectPath: string | undefined;
      if (conversation?.cwd) {
        // 直接使用 cwd，并转换为相对于 home 的路径
        projectPath = conversation.cwd;
        // 将绝对路径转换为 ~ 路径
        const homeDir = '/Users/kp';
        if (projectPath.startsWith(homeDir)) {
          projectPath = projectPath.replace(homeDir, '~');
        }
        console.log('[TerminalContext] Using cwd as project path:', projectPath);
      } else if (conversation?.project_hint) {
        // 备用：如果有 project_hint，尝试转换
        // 但优先使用 cwd，因为它更准确
        console.log('[TerminalContext] project_hint available but using cwd instead');
      }

      // 使用当前 terminals 数量作为索引
      const terminalIndex = terminals.length;
      // 使用 projectPath 和 sessionId 生成标题
      const title = getTerminalTitle(projectPath, sessionId, terminalIndex);

      console.log('[TerminalContext] restoreClaudeConversation - title:', title, 'projectPath:', projectPath, 'sessionId:', sessionId);

      // 创建新终端，使用 claudeResumeSession 参数
      const id = `terminal-claude-resume-${sessionId.slice(0, 8)}`;
      const terminal = initTerminal({
        id,
        title,
        projectPath,  // 传递项目路径
        claudeResumeSession: sessionId,  // 传递 Claude 会话恢复参数
        mode: 'create',  // 使用 create 模式，因为这是创建新的 terminal session
      });

      // 更新 terminal 的 claudeCodeId
      terminal.claudeCodeId = sessionId;

      setTerminals((prev) => {
        if (prev.some((item) => item.id === id)) {
          return prev;
        }
        return [...prev, terminal];
      });
      setActiveTabId(id);

      return terminal;
    } catch (error) {
      console.error('[TerminalContext] Failed to restore Claude conversation:', error);
      addNotification({
        type: 'error',
        title: '恢复失败',
        message: '无法获取 Claude 会话信息，请重试。',
      });
      return null;
    }
  }, [initTerminal, terminals, restoreSettled, isRestoring, addNotification, syncClaudeConversations, getTerminalTitle]);

  const reconnectTerminal = useCallback(async (terminalId: string): Promise<boolean> => {
    const terminal = terminals.find((t) => t.id === terminalId);
    if (!terminal) {
      console.error('[TerminalContext] Terminal not found:', terminalId);
      return false;
    }

    if (!terminal.sessionId) {
      console.error('[TerminalContext] Terminal has no session ID:', terminalId);
      addNotification({
        type: 'error',
        title: '重连失败',
        message: '终端没有会话 ID，无法重连。',
      });
      return false;
    }

    if (terminal.reconnecting) {
      console.log('[TerminalContext] Terminal is already reconnecting:', terminalId);
      return false;
    }

    if (terminal.ws.readyState === WebSocket.OPEN) {
      console.log('[TerminalContext] Terminal is already connected:', terminalId);
      return true;
    }

    // 标记为重连中
    terminal.reconnecting = true;
    terminal.reconnectAttempts += 1;
    setTerminals((prev) => [...prev]);

    console.log(`[TerminalContext] Reconnecting terminal ${terminalId}, attempt ${terminal.reconnectAttempts}/${terminal.maxReconnectAttempts}`);

    try {
      // 关闭旧的 WebSocket
      if (terminal.ws.readyState !== WebSocket.CLOSED) {
        terminal.ws.close();
      }

      // 创建新的 WebSocket 连接
      const wsUrl = `${API_CONFIG.WS_BASE_URL}/terminal/ws?session_id=${terminal.sessionId}`;
      const newWs = new WebSocket(wsUrl);

      // 等待连接建立或失败
      const connected = await new Promise<boolean>((resolve) => {
        const timeout = setTimeout(() => {
          console.error('[TerminalContext] Reconnect timeout');
          resolve(false);
        }, 5000);

        newWs.onopen = () => {
          clearTimeout(timeout);
          console.log('[TerminalContext] Reconnect successful:', terminalId);
          resolve(true);
        };

        newWs.onerror = () => {
          clearTimeout(timeout);
          console.error('[TerminalContext] Reconnect error:', terminalId);
          resolve(false);
        };
      });

      if (!connected) {
        throw new Error('WebSocket connection failed');
      }

      // 更新 terminal 的 WebSocket
      terminal.ws = newWs;
      terminal.reconnecting = false;
      terminal.reconnectAttempts = 0;

      // 重新设置 WebSocket 事件处理
      newWs.onmessage = (event) => {
        const raw = event.data;

        if (typeof raw === 'string') {
          let parsed: any = null;
          if (raw.startsWith('{')) {
            try {
              parsed = JSON.parse(raw);
            } catch {
              parsed = null;
            }
          }

          if (parsed?.type === 'ack') {
            const ackSeq = Number(parsed.seq || 0);
            if (Number.isFinite(ackSeq) && ackSeq > 0) {
              terminal.lastAckSeq = ackSeq;
              console.log(`[TerminalContext] ack(seq): terminal=${terminal.id}, seq=${ackSeq}`);
            }
            return;
          }

          if (parsed?.type === 'debug_input_accepted') {
            const inputSeq = Number(parsed.seq || 0);
            if (Number.isFinite(inputSeq) && inputSeq > 0) {
              terminal.lastBackendInputSeq = inputSeq;
              terminal.backendProcessAlive = Boolean(parsed.process_alive);
              terminal.backendPid = Number(parsed.pid || 0);
              console.log(`[TerminalContext] backend_input_accepted(seq): terminal=${terminal.id}, seq=${inputSeq}`);
            }
            return;
          }

          if (parsed?.type === 'debug_output_forwarded') {
            terminal.backendOutputFrames = Number(parsed.frame || terminal.backendOutputFrames + 1);
            return;
          }

          if (raw.includes('SESSION_ID:')) {
            const extracted = extractSessionId(raw);
            if (extracted) {
              terminal.sessionId = extracted;
              localStorage.setItem(`terminal_session_${terminal.id}`, extracted);
              localStorage.setItem(`terminal_title_${terminal.id}`, terminal.title);
            }
            return;
          }

          if (raw.includes('Reconnected to existing session')) {
            return;
          }
        }

        // 写入终端输出
        console.log(`[TerminalContext] 📤 Writing to terminal: ${terminal.id}, length=${raw.length}, preview=${raw.substring(0, 50)}`);
        terminal.term.write(raw);
        terminal.lastOutputAt = Date.now();
        terminal.backendOutputFrames += 1;
      };

      newWs.onerror = () => {
        logLifecycle(terminal, 'disposed', 'ws error');
        terminal.term.writeln('\x1b[31m✗ Connection error\x1b[0m');
        notifyTerminalConnectionIssue('终端连接失败', 'Terminal WebSocket 连接失败，正在尝试重连...');
      };

      newWs.onclose = (event) => {
        logLifecycle(terminal, 'disposed', `ws close:${event.code}`);
        if (event.code !== 1000) {
          terminal.term.writeln('\x1b[31m✗ Connection closed\x1b[0m');
          // 自动重连
          if (!terminal.reconnecting && terminal.reconnectAttempts < terminal.maxReconnectAttempts) {
            console.log('[TerminalContext] WebSocket closed, attempting reconnect...');
            setTimeout(() => {
              reconnectTerminal(terminal.id);
            }, 1000);
          }
        }
      };

      // 发送 restore_ready 消息
      setTimeout(() => {
        sendRestoreReady(terminalId, terminal.term.rows, terminal.term.cols);
      }, 100);

      // 检查 Claude 状态
      const claudeStatus = await checkClaudeStatus(terminal.sessionId!);
      if (!claudeStatus.running && claudeStatus.claude_resume_session) {
        // Claude 进程已退出，但有会话可以恢复
        addNotification({
          type: 'info',
          title: 'Claude 会话已断开',
          message: '检测到 Claude 会话已断开，是否恢复？',
        });
      }

      addNotification({
        type: 'success',
        title: '重连成功',
        message: '终端已重新连接。',
      });

      setTerminals((prev) => [...prev]);
      return true;
    } catch (error) {
      console.error('[TerminalContext] Reconnect failed:', error);
      terminal.reconnecting = false;

      // 如果未超过最大重连次数，延迟后重试
      if (terminal.reconnectAttempts < terminal.maxReconnectAttempts) {
        const delay = Math.min(Math.pow(2, terminal.reconnectAttempts - 1) * 1000, 30000); // 指数退避，最大30秒
        console.log(`[TerminalContext] Retrying reconnect in ${delay}ms...`);
        setTimeout(() => {
          reconnectTerminal(terminalId);
        }, delay);
      } else {
        // 超过最大重连次数
        addNotification({
          type: 'error',
          title: '重连失败',
          message: '终端重连失败，已达到最大重试次数。请尝试重新创建终端。',
        });
        terminal.reconnectAttempts = 0;
      }

      setTerminals((prev) => [...prev]);
      return false;
    }
  }, [terminals, addNotification, sendRestoreReady, checkClaudeStatus, logLifecycle, notifyTerminalConnectionIssue, extractSessionId]);

  useEffect(() => {
    // 移除 sessionStorage 检查，改用 hasRestoredRef
    if (hasRestoredRef.current) {
      console.log('[TerminalContext] Restore already completed, skipping');
      // 如果已经恢复过，直接标记为 settled
      if (!restoreSettledRef.current) {
        restoreSettledRef.current = true;
        setIsRestoring(false);
        setRestoreSettled(true);
      }
      return;
    }

    hasRestoredRef.current = true;

    const settleRestore = (reason: string) => {
      if (restoreSettledRef.current) {
        return;
      }
      restoreSettledRef.current = true;
      if (restoreTimeoutRef.current) {
        clearTimeout(restoreTimeoutRef.current);
        restoreTimeoutRef.current = null;
      }
      setIsRestoring(false);
      setRestoreSettled(true);
      console.log(`[TerminalContext] Restore process settled (${reason})`);
    };

    const autoRestoreClaudeSessions = async (backendSessions: Array<{ id: string; sessionId: string; title: string }>) => {
      console.log('[TerminalContext] Auto-restore Claude sessions started');

      // 等待一小段时间，确保 WebSocket 连接已经稳定
      await new Promise(resolve => setTimeout(resolve, 1500));

      let restoredCount = 0;

      for (const { sessionId } of backendSessions) {
        try {
          console.log(`[TerminalContext] Checking Claude status for session: ${sessionId}`);
          const claudeStatus = await checkClaudeStatus(sessionId);

          console.log(`[TerminalContext] Claude status for ${sessionId}:`, claudeStatus);

          // 如果检测到 Claude 进程在运行，且有 claude_resume_session
          if (claudeStatus.running && claudeStatus.claude_resume_session) {
            console.log(`[TerminalContext] Found running Claude session: ${claudeStatus.claude_resume_session}`);

            // 使用 setTerminals 的回调形式获取最新的 terminals 状态
            setTerminals((currentTerminals) => {
              const terminalIndex = currentTerminals.findIndex(t => t.sessionId === sessionId);
              const terminal = currentTerminals[terminalIndex];
              if (terminal && terminal.ws && terminal.ws.readyState === WebSocket.OPEN) {
                // 更新 terminal 的 claudeCodeId
                terminal.claudeCodeId = claudeStatus.claude_resume_session;
                // 如果已经有 tmux session name（由 TMUX_INFO 设置），保留它作为标题
                if (!terminal.tmuxSessionName) {
                  terminal.title = getTerminalTitle(claudeStatus.initial_dir, claudeStatus.claude_resume_session, terminalIndex);
                  // 保存到 localStorage
                  localStorage.setItem(`terminal_title_${terminal.id}`, terminal.title);
                }
                // 否则保持 TMUX_INFO 设置的标题不变

                // 发送 claude --resume 命令
                const resumeCommand = `claude --resume ${claudeStatus.claude_resume_session}\n`;
                console.log(`[TerminalContext] Sending auto-resume command: ${resumeCommand.trim()}`);

                terminal.ws.send(JSON.stringify({
                  type: 'input',
                  data: resumeCommand,
                }));

                restoredCount++;

                // 显示通知
                addNotification({
                  type: 'success',
                  title: 'Claude 会话自动恢复',
                  message: `已自动恢复会话 ${claudeStatus.claude_resume_session.slice(0, 8)}`,
                });
              } else {
                console.warn(`[TerminalContext] Terminal not found or WebSocket not ready for session: ${sessionId}`);
              }
              return [...currentTerminals]; // 返回新数组触发更新
            });
          }
        } catch (error) {
          console.error(`[TerminalContext] Failed to auto-restore Claude session for ${sessionId}:`, error);
        }
      }

      console.log(`[TerminalContext] Auto-restore Claude sessions completed. Restored: ${restoredCount}/${backendSessions.length}`);
    };

    const restoreSessions = async () => {
      setIsRestoring(true);
      setRestoreSettled(false);
      restoreSettledRef.current = false;
      restoreActiveSetRef.current = false;
      console.log('[TerminalContext] Restore process started');

      // 检查 localStorage 中的 tmux 会话信息
      const tmuxSessions = getTmuxSessionsFromStorage();
      const settings = getTmuxSettings();

      // 找出所有 detached 状态的会话
      const detachedFromStorage = Object.entries(tmuxSessions)
        .filter(([_, info]) => info.state === 'detached')
        .map(([sessionName, info]) => ({
          sessionName,
          projectPath: info.projectPath,
          lastDetachTime: info.lastDetachTime
        }));

      console.log('[TerminalContext] Found detached tmux sessions in localStorage:', detachedFromStorage);

      // 🔧 关键修复：验证这些 detached 会话是否真的还在 tmux 中运行
      let validDetached: typeof detachedFromStorage = [];
      if (detachedFromStorage.length > 0) {
        try {
          const response = await fetch(`${API_CONFIG.BASE_URL}/terminal/tmux/sessions`);
          if (response.ok) {
            const data = await response.json();
            const runningTmuxSessions = new Set<string>(data.sessions || []);
            console.log('[TerminalContext] Running tmux sessions from backend:', Array.from(runningTmuxSessions));

            // 过滤出真正还在运行的会话
            validDetached = detachedFromStorage.filter(session => {
              const isRunning = runningTmuxSessions.has(session.sessionName);
              if (!isRunning) {
                // 会话已不存在，从 localStorage 中清理
                console.log(`[TerminalContext] Removing stale tmux session from localStorage: ${session.sessionName}`);
                removeTmuxSessionState(session.sessionName);
              }
              return isRunning;
            });
            console.log('[TerminalContext] Validated detached sessions:', validDetached);
          } else {
            console.warn('[TerminalContext] Failed to fetch tmux sessions, using localStorage data');
            validDetached = detachedFromStorage;
          }
        } catch (error) {
          console.error('[TerminalContext] Error validating tmux sessions:', error);
          validDetached = detachedFromStorage;
        }
      }

      // 如果有有效的 detached 会话
      if (validDetached.length > 0) {
        if (settings.autoRestoreOnRefresh) {
          // 自动恢复所有 detached 会话
          console.log('[TerminalContext] Auto-restoring detached sessions');
          validDetached.forEach(session => {
            restoreTmuxSession(session.sessionName);
          });
        } else {
          // 显示恢复对话框
          console.log('[TerminalContext] Showing restore dialog');
          setDetachedSessions(validDetached);
          setShowRestoreDialog(true);
        }
      }

      if (restoreTimeoutRef.current) {
        clearTimeout(restoreTimeoutRef.current);
      }
      restoreTimeoutRef.current = setTimeout(() => settleRestore('timeout-fallback'), 3500);

      const savedSessions = collectSavedSessions();
      const backendSessions = await fetchActiveSessions();

      const backendSessionIds = new Set(backendSessions.map((session) => session.sessionId));
      savedSessions.forEach((session) => {
        if (!backendSessionIds.has(session.sessionId)) {
          localStorage.removeItem(`terminal_session_${session.id}`);
          localStorage.removeItem(`terminal_title_${session.id}`);
        }
      });

      if (backendSessions.length === 0) {
        settleRestore('no-sessions');
        return;
      }

      // 🔧 关键修复：按 tmuxSessionName 去重，避免同一个 tmux session 创建多个 tab
      const seenTmuxSessions = new Set<string>();
      const deduplicatedSessions = backendSessions.filter(session => {
        // 如果没有 tmuxSessionName，直接保留（非 tmux session）
        if (!session.tmuxSessionName) {
          return true;
        }
        // 如果已经见过这个 tmuxSessionName，跳过
        if (seenTmuxSessions.has(session.tmuxSessionName)) {
          console.log(`[TerminalContext] Skipping duplicate tmux session: ${session.tmuxSessionName} (sessionId: ${session.sessionId})`);
          return false;
        }
        seenTmuxSessions.add(session.tmuxSessionName);
        return true;
      });

      let pendingConnections = deduplicatedSessions.length;
      const markConnectionSettled = (sessionId: string, state: 'open' | 'error' | 'close') => {
        pendingConnections = Math.max(0, pendingConnections - 1);
        console.log(`[TerminalContext] Restore connection settled: session=${sessionId}, state=${state}, pending=${pendingConnections}`);
        if (pendingConnections === 0) {
          settleRestore('all-connections-settled');
          // 所有连接恢复完成后，自动检测并恢复 Claude 会话
          autoRestoreClaudeSessions(deduplicatedSessions);
        }
      };

      deduplicatedSessions.forEach(({ id, sessionId, title, useTmux, tmuxSessionName }) => {
        // 🔧 关键修复：如果这个 session 的 tmuxSessionName 在 validDetached 中，跳过自动恢复
        // 让用户通过对话框选择恢复
        if (tmuxSessionName && validDetached.some(d => d.sessionName === tmuxSessionName)) {
          console.log(`[TerminalContext] Skipping auto-restore for ${tmuxSessionName} - waiting for user selection in dialog`);
          markConnectionSettled(sessionId, 'close'); // 标记为已处理，避免超时
          return;
        }

        try {
          // 从 localStorage 读取 tmux 信息作为 fallback
          let finalUseTmux = useTmux || false;
          let finalTmuxSessionName = tmuxSessionName;

          if (!finalUseTmux) {
            const tmuxInfo = localStorage.getItem(`terminal_tmux_${id}`);
            if (tmuxInfo) {
              try {
                const parsed = JSON.parse(tmuxInfo);
                finalUseTmux = parsed.useTmux || false;
                finalTmuxSessionName = parsed.sessionName;
                console.log(`[TerminalContext] Restored tmux info from localStorage for ${id}:`, parsed);
              } catch (e) {
                console.error('[TerminalContext] Failed to parse tmux info from localStorage:', e);
              }
            }
          }

          const terminal = initTerminal({
            id,
            title,
            restoreSessionId: sessionId,
            mode: 'restore',
            onSettled: (state) => markConnectionSettled(sessionId, state),
          });

          // 恢复 tmux 状态
          if (finalUseTmux && finalTmuxSessionName) {
            console.log(`[TerminalContext] Restoring tmux state for ${id}: ${finalTmuxSessionName}`);
            terminal.useTmux = finalUseTmux;
            terminal.tmuxSessionName = finalTmuxSessionName;

            // 异步检查 tmux 会话是否存活
            checkTmuxAlive(terminal).then(alive => {
              console.log(`[TerminalContext] tmux session ${finalTmuxSessionName} alive: ${alive}`);
              terminal.tmuxAlive = alive;

              // 如果 tmux 会话存活，优化 resize 策略
              if (alive && terminal.ws.readyState === WebSocket.OPEN) {
                console.log('[TerminalContext] tmux session alive, optimizing resize strategy');

                // 🔧 关键修复：只在 restore_ready 之后发送 resize
                // 避免与 scrollback 回放冲突

                // 第一次 resize：500ms 后发送（给 scrollback 回放留出时间）
                setTimeout(() => {
                  const rows = terminal.term.rows;
                  const cols = terminal.term.cols;
                  console.log(`[TerminalContext] Sending first post-restore resize: ${rows}x${cols}`);
                  sendResize(terminal.id, rows, cols);
                }, 500);

                // 第二次 resize：1200ms 后发送，确保 tmux 已处理完第一次
                setTimeout(() => {
                  const rows = terminal.term.rows;
                  const cols = terminal.term.cols;
                  console.log(`[TerminalContext] Sending second post-restore resize: ${rows}x${cols}`);
                  sendResize(terminal.id, rows, cols);
                }, 1200);

                // 移除第三次 resize，两次足够
                // 减少不必要的 resize，避免显示错乱
              }

              // 触发 UI 更新
              setTerminals(prev => [...prev]);
            }).catch(error => {
              console.error('[TerminalContext] Failed to check tmux alive:', error);
            });
          }
        } catch (error) {
          console.error(`[TerminalContext] Failed to restore session ${sessionId}:`, error);
          localStorage.removeItem(`terminal_session_${id}`);
          localStorage.removeItem(`terminal_title_${id}`);
          localStorage.removeItem(`terminal_tmux_${id}`);
          markConnectionSettled(sessionId, 'error');
        }
      });
    };

    restoreSessions();

    return () => {
      if (restoreTimeoutRef.current) {
        clearTimeout(restoreTimeoutRef.current);
        restoreTimeoutRef.current = null;
      }
    };
  }, [initTerminal]);

  // 页面卸载时自动 detach tmux sessions
  useEffect(() => {
    const handleBeforeUnload = async (e: BeforeUnloadEvent) => {
      console.log('[TerminalContext] Page unloading, detaching tmux sessions...');

      // 遍历所有使用 tmux 的 terminal
      for (const terminal of terminals) {
        if (terminal.useTmux && terminal.tmuxSessionName && terminal.sessionId) {
          console.log(`[TerminalContext] Detaching tmux session on unload: ${terminal.tmuxSessionName}`);

          // 使用 sendBeacon 发送 detach 请求（在页面卸载时更可靠）
          const detachUrl = `${API_CONFIG.BASE_URL}/terminal/sessions/${terminal.sessionId}/detach`;
          try {
            // 使用 fetch with keepalive 选项（比 sendBeacon 更灵活）
            fetch(detachUrl, {
              method: 'POST',
              keepalive: true,  // 确保请求在页面卸载后仍能完成
              headers: {
                'Content-Type': 'application/json'
              }
            }).catch(err => {
              console.error('[TerminalContext] Failed to detach on unload:', err);
            });

            // 保存 detached 状态到 localStorage
            saveTmuxSessionState(terminal.tmuxSessionName, {
              sessionName: terminal.tmuxSessionName,
              state: 'detached',
              lastDetachTime: Date.now(),
              projectPath: terminal.projectName
            });
          } catch (error) {
            console.error('[TerminalContext] Error detaching on unload:', error);
          }
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [terminals]);

  const createTerminal = (
    projectPath?: string,
    autoStartClaude?: boolean,
    tmuxSessionName?: string  // 🔧 新增：tmux session 名称参数
  ): TerminalInstance | null => {
    console.log('[TerminalContext] createTerminal called', { projectPath, autoStartClaude, tmuxSessionName, restoreSettled, isRestoring });

    // 🔧 关键修复：如果指定了 tmuxSessionName 且已存在同名的 tab，直接返回 null
    const existingTmux = tmuxSessionName ? terminals.find(t => t.tmuxSessionName === tmuxSessionName) : null;
    if (existingTmux) {
      console.log(`[TerminalContext] createTerminal: tmux session ${tmuxSessionName} already exists in tab ${existingTmux.id}, skipping creation`);
      setActiveTabId(existingTmux.id);
      return null;
    }

    if (!restoreSettled || isRestoring) {
      console.log('[TerminalContext] Skip createTerminal - restore not settled', { isRestoring, restoreSettled });
      return null;
    }

    const id = `terminal-${Date.now()}`;
    // 使用当前 terminals 数量作为索引
    const terminalIndex = terminals.length;
    // 如果有 tmuxSessionName（恢复 tmux 会话时），使用它作为标题
    const title = getTerminalTitle(projectPath, undefined, terminalIndex, tmuxSessionName);

    console.log('[TerminalContext] Creating terminal', { id, title, projectPath, autoStartClaude, tmuxSessionName, terminalIndex });
    const terminal = initTerminal({ id, title, projectPath, autoStartClaude, tmuxSessionName, mode: 'create' });
    console.log('[TerminalContext] initTerminal returned', terminal.id);

    setTerminals((prev) => {
      console.log('[TerminalContext] Adding terminal to state', { currentCount: prev.length, newId: id });
      return [...prev, terminal];
    });
    setActiveTabId(id);
    console.log('[TerminalContext] Terminal creation complete', id);
    return terminal;
  };

  const closeTerminal = async (id: string, action: 'detach' | 'kill' = 'detach') => {
    const terminal = terminals.find((item) => item.id === id);
    if (!terminal) {
      return;
    }

    // 如果使用 tmux，根据 action 决定是 detach 还是 kill
    if (terminal.useTmux && terminal.tmuxSessionName) {
      if (action === 'detach') {
        console.log(`[TerminalContext] Detaching from tmux session: ${terminal.tmuxSessionName}`);
        // 调用 detach endpoint
        try {
          const response = await fetch(`${API_CONFIG.BASE_URL}/terminal/sessions/${terminal.sessionId}/detach`, {
            method: 'POST'
          });
          if (response.ok) {
            const data = await response.json();
            console.log('[TerminalContext] Detach response:', data);

            // 保存 detached 状态到 localStorage
            saveTmuxSessionState(terminal.tmuxSessionName, {
              sessionName: terminal.tmuxSessionName,
              state: 'detached',
              lastDetachTime: Date.now(),
              projectPath: terminal.projectName
            });

            // 显示通知
            addNotification({
              type: 'info',
              title: 'tmux 会话已暂离',
              message: `会话 ${terminal.tmuxSessionName} 仍在后台运行，刷新页面可恢复连接`
            });
          } else {
            console.error('[TerminalContext] Failed to detach session:', response.status);
          }
        } catch (error) {
          console.error('[TerminalContext] Error detaching session:', error);
        }
      } else {
        // Kill tmux session
        console.log(`[TerminalContext] Killing tmux session: ${terminal.tmuxSessionName}`);
        await killTmuxSession(terminal.tmuxSessionName);
        localStorage.removeItem(`terminal_tmux_${id}`);
        // 从 tmux sessions 状态中移除
        removeTmuxSessionState(terminal.tmuxSessionName);
      }
    }

    if (terminal.sessionId) {
      const closed = await closeBackendSession(terminal.sessionId);
      if (!closed) {
        console.error(`[TerminalContext] Failed to close backend session definitively: ${terminal.sessionId}`);
      }
    }

    logLifecycle(terminal, 'disposed', 'closeTerminal');

    // 清理心跳定时器
    if (terminal.heartbeatInterval) {
      clearInterval(terminal.heartbeatInterval);
      terminal.heartbeatInterval = undefined;
      console.log(`[TerminalContext] Heartbeat cleared on close: terminal=${id}`);
    }

    terminal.term.dispose();
    terminal.ws.close();

    localStorage.removeItem(`terminal_session_${id}`);
    localStorage.removeItem(`terminal_title_${id}`);

    if (terminal.sessionId) {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key?.startsWith('terminal_session_') && localStorage.getItem(key) === terminal.sessionId) {
          const tabId = key.replace('terminal_session_', '');
          localStorage.removeItem(`terminal_session_${tabId}`);
          localStorage.removeItem(`terminal_title_${tabId}`);
        }
      }
    }

    setTerminals((prev) => {
      const next = prev.filter((item) => item.id !== id);
      if (activeTabId === id && next.length > 0) {
        setActiveTabId(next[0].id);
      } else if (next.length === 0) {
        setActiveTabId(null);
      }
      return next;
    });
  };

  const cleanupAll = async () => {
    setIsRestoring(false);
    setRestoreSettled(true);
    restoreSettledRef.current = true;

    await Promise.all(terminals.map(async (terminal) => {
      if (terminal.sessionId) {
        const closed = await closeBackendSession(terminal.sessionId);
        if (!closed) {
          console.error(`[TerminalContext] Failed to close backend session definitively: ${terminal.sessionId}`);
        }
      }
    }));

    terminals.forEach((terminal) => {
      logLifecycle(terminal, 'disposed', 'cleanupAll');
      terminal.term.dispose();
      terminal.ws.close();
      localStorage.removeItem(`terminal_session_${terminal.id}`);
      localStorage.removeItem(`terminal_title_${terminal.id}`);
      if (terminal.sessionId) {
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const key = localStorage.key(i);
          if (key?.startsWith('terminal_session_') && localStorage.getItem(key) === terminal.sessionId) {
            const tabId = key.replace('terminal_session_', '');
            localStorage.removeItem(`terminal_session_${tabId}`);
            localStorage.removeItem(`terminal_title_${tabId}`);
          }
        }
      }
    });

    setTerminals([]);
    setActiveTabId(null);
  };

  const restoreTmuxSession = useCallback(async (sessionName: string): Promise<void> => {
    console.log('[TerminalContext] Restoring tmux session:', sessionName);

    // 🔧 关键修复：检查是否已存在同名的 tmux session tab
    // 使用 Promise 来获取最新的 terminals 状态
    const existingTerminal = await new Promise<TerminalInstance | undefined>((resolve) => {
      setTerminals((prev) => {
        const found = prev.find(t => t.tmuxSessionName === sessionName);
        resolve(found);
        return prev; // 不修改状态
      });
    });

    if (existingTerminal) {
      console.log(`[TerminalContext] tmux session ${sessionName} already exists in tab ${existingTerminal.id}, activating it`);
      setActiveTabId(existingTerminal.id);
      return;
    }

    try {
      // 1. 检查 tmux 会话是否存在
      const response = await fetch(`${API_CONFIG.BASE_URL}/terminal/tmux/check/${sessionName}`);
      if (!response.ok) {
        throw new Error('tmux session not found');
      }

      // 2. 获取会话信息
      const sessions = getTmuxSessionsFromStorage();
      const sessionInfo = sessions[sessionName];
      const projectPath = sessionInfo?.projectPath;

      // 🔧 关键修复：直接创建终端，不通过 createTerminal（因为 createTerminal 有 restoreSettled 检查会阻止恢复）
      const id = `terminal-restored-${sessionName.replace('oa_', '')}-${Date.now()}`;
      // 获取当前 terminals 数量作为 index
      const terminalIndex = await new Promise<number>((resolve) => {
        setTerminals((prev) => {
          resolve(prev.length);
          return prev; // 不修改状态
        });
      });
      const title = getTerminalTitle(projectPath, undefined, terminalIndex, sessionName);

      console.log('[TerminalContext] Creating terminal for tmux restore', { id, title, projectPath, sessionName, terminalIndex });
      // 🔧 修复：使用 mode: 'create' 而不是 'restore'，因为我们是创建新的 WebSocket 连接到现有 tmux session
      const terminal = initTerminal({ id, title, projectPath, autoStartClaude: false, tmuxSessionName: sessionName, mode: 'create' });

      setTerminals((prev) => {
        console.log('[TerminalContext] Adding restored terminal to state', { currentCount: prev.length, newId: id });
        return [...prev, terminal];
      });
      setActiveTabId(id);

      // 3. 更新会话状态为 attached
      saveTmuxSessionState(sessionName, {
        ...sessionInfo,
        sessionName,
        state: 'attached'
      });

      console.log('[TerminalContext] tmux session restored successfully:', sessionName);
    } catch (error) {
      console.error('[TerminalContext] Failed to restore tmux session:', error);

      // 清理无效的会话信息
      removeTmuxSessionState(sessionName);

      addNotification({
        type: 'error',
        title: '恢复失败',
        message: `无法恢复 tmux 会话 ${sessionName}，会话可能已被终止`
      });
    }
  }, [initTerminal, addNotification]);

  const handleRestoreSessions = useCallback((sessionNames: string[]) => {
    console.log('[TerminalContext] handleRestoreSessions ENTERED with:', sessionNames);

    // 关闭对话框
    setShowRestoreDialog(false);

    // 恢复选中的会话
    sessionNames.forEach(sessionName => {
      restoreTmuxSession(sessionName);
    });

    // 清空 detachedSessions
    setDetachedSessions([]);
  }, [restoreTmuxSession, detachedSessions]);

  const handleIgnoreSessions = useCallback(async (sessionNames: string[]) => {
    console.log('[TerminalContext] Ignoring and killing sessions:', sessionNames);

    // 1. Kill 这些 tmux sessions 并清理 localStorage
    for (const sessionName of sessionNames) {
      try {
        const response = await fetch(`${API_CONFIG.BASE_URL}/terminal/tmux/kill/${sessionName}`, { method: 'POST' });
        if (response.ok) {
          console.log(`[TerminalContext] Killed tmux session: ${sessionName}`);
        } else {
          console.warn(`[TerminalContext] Failed to kill tmux session ${sessionName}: ${response.status}`);
        }
      } catch (error) {
        console.error(`[TerminalContext] Failed to kill tmux session ${sessionName}:`, error);
      }

      // 2. 清理 localStorage
      removeTmuxSessionState(sessionName);
    }

    // 3. 关闭对话框
    setShowRestoreDialog(false);

    // 4. 清空 detachedSessions
    setDetachedSessions([]);
  }, []);


  return (
    <TerminalContext.Provider
      value={{
        terminals,
        activeTabId,
        setActiveTabId,
        createTerminal,
        closeTerminal,
        cleanupAll,
        sendInput,
        sendResize,
        sendRestoreReady,
        markTerminalOpened,
        syncClaudeConversations,
        restoreClaudeConversation,
        reconnectTerminal,
        checkClaudeStatus,
        checkTmuxAlive,
        killTmuxSession,
        detachTerminal,
        getTmuxSettings,
        restoreTmuxSession,
        showRestoreDialog,
        detachedSessions,
        handleRestoreSessions,
        handleIgnoreSessions,
        isRestoring,
        restoreSettled,
      }}
    >
      {children}
    </TerminalContext.Provider>
  );
};
