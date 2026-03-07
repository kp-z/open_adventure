import React, { createContext, useContext, useState, useRef, useEffect, ReactNode, useCallback } from 'react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { SerializeAddon } from '@xterm/addon-serialize';
import { API_CONFIG } from '../../config/api';
import { useNotifications } from './NotificationContext';

export type TerminalLifecycle = 'init' | 'opened' | 'ws_connecting' | 'ready' | 'disposed';

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
  closeTerminal: (id: string) => void;
  cleanupAll: () => void;
  sendInput: (terminalId: string, data: string) => void;
  sendResize: (terminalId: string, rows: number, cols: number) => void;
  sendRestoreReady: (terminalId: string, rows: number, cols: number) => void;
  markTerminalOpened: (terminalId: string) => void;
  syncClaudeConversations: () => Promise<ClaudeConversation[]>;
  restoreClaudeConversation: (sessionId: string) => Promise<TerminalInstance | null>;
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

interface TerminalProviderProps {
  children: ReactNode;
}

export const TerminalProvider: React.FC<TerminalProviderProps> = ({ children }) => {
  const [terminals, setTerminals] = useState<TerminalInstance[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreSettled, setRestoreSettled] = useState(false);
  const { addNotification } = useNotifications();

  const terminalCounterRef = useRef(1);
  const hasRestoredRef = useRef(false);
  const restoreTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restoreSettledRef = useRef(false);
  const restoreActiveSetRef = useRef(false);
  const queueOverflowNotifyRef = useRef<Record<string, number>>({});

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
        return [] as Array<{ id: string; sessionId: string; title: string }>;
      }

      const data = await response.json();
      const activeSessions = Array.isArray(data.active_sessions) ? data.active_sessions : [];
      return activeSessions.map((session: any, index: number) => ({
        id: `terminal-restored-${session.session_id}`,
        sessionId: session.session_id,
        title: `Terminal ${index + 1}`,
      }));
    } catch (error) {
      console.error('[TerminalContext] Failed to fetch active backend sessions:', error);
      return [] as Array<{ id: string; sessionId: string; title: string }>;
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
    mode: 'create' | 'restore';
    onSettled?: (state: 'open' | 'error' | 'close') => void;
  }): TerminalInstance => {
    const { id, title, projectPath, autoStartClaude, restoreSessionId, claudeResumeSession, mode, onSettled } = options;

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

    ws.onmessage = (event) => {
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

        if (raw.includes('Reconnected to existing session')) {
          return;
        }
      }

      // 写入终端输出
      console.log(`[TerminalContext] 📤 Writing to terminal: ${id}, length=${raw.length}, preview=${raw.substring(0, 50)}`);
      term.write(raw);
      terminal.lastOutputAt = Date.now();
      terminal.backendOutputFrames += 1;
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
      logLifecycle(terminal, 'disposed', `ws close:${event.code}`);
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
    const existing = terminals.find((terminal) => terminal.sessionId === sessionId);
    if (existing) {
      setActiveTabId(existing.id);
      addNotification({
        type: 'info',
        title: '会话已存在',
        message: `会话 ${sessionId.slice(0, 8)} 已经在运行中。`,
      });
      return existing;
    }

    // 创建新终端，使用 claudeResumeSession 参数
    const id = `terminal-claude-resume-${sessionId.slice(0, 8)}`;
    const terminal = initTerminal({
      id,
      title: `Claude Resume ${sessionId.slice(0, 8)}`,
      claudeResumeSession: sessionId,  // 传递 Claude 会话恢复参数
      mode: 'create',  // 使用 create 模式，因为这是创建新的 terminal session
    });

    setTerminals((prev) => {
      if (prev.some((item) => item.id === id)) {
        return prev;
      }
      return [...prev, terminal];
    });
    setActiveTabId(id);

    return terminal;
  }, [initTerminal, terminals, restoreSettled, isRestoring, addNotification]);

  useEffect(() => {
    if (hasRestoredRef.current) {
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

    const restoreSessions = async () => {
      setIsRestoring(true);
      setRestoreSettled(false);
      restoreSettledRef.current = false;
      restoreActiveSetRef.current = false;
      console.log('[TerminalContext] Restore process started');

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

      let pendingConnections = backendSessions.length;
      const markConnectionSettled = (sessionId: string, state: 'open' | 'error' | 'close') => {
        pendingConnections = Math.max(0, pendingConnections - 1);
        console.log(`[TerminalContext] Restore connection settled: session=${sessionId}, state=${state}, pending=${pendingConnections}`);
        if (pendingConnections === 0) {
          settleRestore('all-connections-settled');
        }
      };

      backendSessions.forEach(({ id, sessionId, title }) => {
        try {
          initTerminal({
            id,
            title,
            restoreSessionId: sessionId,
            mode: 'restore',
            onSettled: (state) => markConnectionSettled(sessionId, state),
          });
        } catch (error) {
          console.error(`[TerminalContext] Failed to restore session ${sessionId}:`, error);
          localStorage.removeItem(`terminal_session_${id}`);
          localStorage.removeItem(`terminal_title_${id}`);
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

  const createTerminal = (projectPath?: string, autoStartClaude?: boolean): TerminalInstance | null => {
    console.log('[TerminalContext] createTerminal called', { projectPath, autoStartClaude, restoreSettled, isRestoring });

    if (!restoreSettled || isRestoring) {
      console.log('[TerminalContext] Skip createTerminal - restore not settled', { isRestoring, restoreSettled });
      return null;
    }

    const id = `terminal-${Date.now()}`;
    let title = `Terminal ${terminalCounterRef.current++}`;
    if (projectPath) {
      const pathParts = projectPath.split('/').filter((p) => p);
      title = pathParts[pathParts.length - 1] || title;
    }

    console.log('[TerminalContext] Creating terminal', { id, title, projectPath, autoStartClaude });
    const terminal = initTerminal({ id, title, projectPath, autoStartClaude, mode: 'create' });
    console.log('[TerminalContext] initTerminal returned', terminal.id);

    setTerminals((prev) => {
      console.log('[TerminalContext] Adding terminal to state', { currentCount: prev.length, newId: id });
      return [...prev, terminal];
    });
    setActiveTabId(id);
    console.log('[TerminalContext] Terminal creation complete', id);
    return terminal;
  };

  const closeTerminal = async (id: string) => {
    const terminal = terminals.find((item) => item.id === id);
    if (!terminal) {
      return;
    }

    if (terminal.sessionId) {
      const closed = await closeBackendSession(terminal.sessionId);
      if (!closed) {
        console.error(`[TerminalContext] Failed to close backend session definitively: ${terminal.sessionId}`);
      }
    }

    logLifecycle(terminal, 'disposed', 'closeTerminal');
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
        isRestoring,
        restoreSettled,
      }}
    >
      {children}
    </TerminalContext.Provider>
  );
};
