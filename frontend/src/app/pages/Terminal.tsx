import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';

import { Terminal as TerminalIcon, X, Plus, RefreshCw, FolderOpen, Send, ChevronDown, Maximize2, Minimize2 } from 'lucide-react';
import { ActionButton } from '../components/ui-shared';
import { useTerminalContext, TerminalInstance } from '../contexts/TerminalContext';
import { useNotifications } from '../contexts/NotificationContext';
import { useIsMobile } from '../components/ui/use-mobile';
import { MobileScrollbar } from '../components/MobileScrollbar';
import { MobileScrollButtons } from '../components/MobileScrollButtons';
import { TmuxRestoreDialog } from '../components/TmuxRestoreDialog';
import { TerminalShortcutBar, Shortcut } from '../components/TerminalShortcutBar';
import { useVisualViewport } from '../hooks/useVisualViewport';
import { API_CONFIG } from '../../config/api';
import 'xterm/css/xterm.css';

interface ClaudeConversationOption {
  session_id: string;
  title: string;
  project_hint?: string;
  last_model?: string;
  last_updated?: string;
  source_file?: string;
}

const TerminalPane: React.FC<{
  terminal: TerminalInstance;
  onActivate?: () => boolean | void;
}> = ({ terminal, onActivate }) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const isComposingRef = useRef<boolean>(false);
  const restoreReadySentRef = useRef<boolean>(false);
  const { sendResize, sendRestoreReady, markTerminalOpened } = useTerminalContext();
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!terminalRef.current) {
      console.error('[TerminalPane] ❌ terminalRef.current is null!');
      return;
    }

    console.log('[TerminalPane] 🚀 Mounting terminal:', terminal.id);
    console.log('[TerminalPane] 📊 Terminal state:', {
      id: terminal.id,
      isOpened: terminal.isOpened,
      hasElement: !!terminal.term.element,
      rows: terminal.term.rows,
      cols: terminal.term.cols,
      lifecycle: terminal.lifecycle,
    });

    const container = terminalRef.current;
    console.log('[TerminalPane] 📦 Container info:', {
      width: container.offsetWidth,
      height: container.offsetHeight,
      display: window.getComputedStyle(container).display,
      visibility: window.getComputedStyle(container).visibility,
      childCount: container.children.length,
    });

    const attachTerminalElement = () => {
      if (!terminal.isOpened) {
        console.log('[TerminalPane] 🔧 Attempting to open terminal...');
        try {
          terminal.term.open(container);
          markTerminalOpened(terminal.id);
          console.log('[TerminalPane] ✅ Terminal opened successfully');
          console.log('[TerminalPane] 📊 After open:', {
            hasElement: !!terminal.term.element,
            elementParent: terminal.term.element?.parentElement?.tagName,
            containerChildCount: container.children.length,
            firstChildClass: container.firstChild ? (container.firstChild as HTMLElement).className : 'none',
          });
          return;
        } catch (error) {
          console.error('[TerminalPane] ❌ term.open failed:', error);
          console.warn('[TerminalPane] 🔄 Attempting fallback to existing element attach');
        }
      } else {
        console.log('[TerminalPane] ℹ️ Terminal already opened, checking element attachment');
      }

      const fallbackElement = terminal.term.element as HTMLElement | undefined;
      console.log('[TerminalPane] 🔍 Fallback element:', {
        exists: !!fallbackElement,
        parent: fallbackElement?.parentElement?.tagName,
        needsAttach: fallbackElement && fallbackElement.parentElement !== container,
      });

      if (fallbackElement && fallbackElement.parentElement !== container) {
        console.log('[TerminalPane] 🔄 Attaching existing element to container');
        while (container.firstChild) {
          container.removeChild(container.firstChild);
        }
        container.appendChild(fallbackElement);
        markTerminalOpened(terminal.id);
        console.log('[TerminalPane] ✅ Element attached successfully');
      }
    };

    attachTerminalElement();

    // 检测是否是 restore 模式（通过 terminal.id 判断）
    const isRestoreMode = terminal.id.startsWith('terminal-restored-');
    let stableSizeCount = 0;
    let lastRows = 0;
    let lastCols = 0;

    const fitAndNotify = () => {
      try {
        console.log('[TerminalPane] 📏 Fitting terminal...');
        terminal.fitAddon.fit();
        const currentRows = terminal.term.rows;
        const currentCols = terminal.term.cols;
        console.log('[TerminalPane] ✅ Fit successful:', {
          rows: currentRows,
          cols: currentCols,
        });

        // 对于 restore 模式，检测尺寸是否稳定
        if (isRestoreMode && !restoreReadySentRef.current) {
          if (currentRows === lastRows && currentCols === lastCols && currentRows > 0 && currentCols > 0) {
            stableSizeCount++;
            console.log('[TerminalPane] 📊 Stable size count:', stableSizeCount);

            // 🔧 优化：移动端和桌面端都使用相同的稳定次数
            // 确保尺寸真正稳定后再发送 restore_ready
            const requiredStableCount = 2;  // 统一为 2 次

            if (stableSizeCount >= requiredStableCount) {
              console.log(`[TerminalPane] Sending restore_ready: ${currentRows}x${currentCols}`);
              sendRestoreReady(terminal.id, currentRows, currentCols);
              restoreReadySentRef.current = true;
            }
          } else {
            // 尺寸变化，重置计数器
            stableSizeCount = 0;
          }

          lastRows = currentRows;
          lastCols = currentCols;
        }

        // 正常发送 resize
        sendResize(terminal.id, currentRows, currentCols);
      } catch (error) {
        console.error('[TerminalPane] ❌ fitAndNotify failed:', error);
      }
    };

    requestAnimationFrame(fitAndNotify);

    const fitTimer = setTimeout(fitAndNotify, 160);

    const handleCompositionStart = () => {
      isComposingRef.current = true;
    };

    const handleCompositionEnd = () => {
      isComposingRef.current = false;
    };

    const terminalElement = terminalRef.current;
    terminalElement.addEventListener('compositionstart', handleCompositionStart);
    terminalElement.addEventListener('compositionend', handleCompositionEnd);

    const handleResize = () => {
      fitAndNotify();
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(terminalElement);

    return () => {
      resizeObserver.disconnect();
      terminalElement.removeEventListener('compositionstart', handleCompositionStart);
      terminalElement.removeEventListener('compositionend', handleCompositionEnd);
      clearTimeout(fitTimer);
    };
  }, [terminal, markTerminalOpened, sendResize, sendRestoreReady, isMobile]);

  // 桌面端自动聚焦终端，确保可以直接输入
  useEffect(() => {
    if (!isMobile && terminal.isOpened) {
      // 延迟聚焦，确保终端已经完全渲染
      const timer = setTimeout(() => {
        terminal.term.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isMobile, terminal.isOpened, terminal.term]);

  return (
    <div
      ref={terminalRef}
      className="flex-1 overflow-auto relative"
      onClick={() => {
        if (isComposingRef.current) {
          return;
        }
        const shouldDeferFocus = onActivate?.() === true;
        if (isMobile) {
          if (shouldDeferFocus) {
            requestAnimationFrame(() => {
              terminal.term.scrollToBottom();
            });
          }
          return;
        }
        if (shouldDeferFocus) {
          requestAnimationFrame(() => {
            terminal.term.focus();
          });
          return;
        }
        terminal.term.focus();
      }}
      style={{
        minHeight: 0,
        touchAction: 'pan-y',
        WebkitOverflowScrolling: 'touch',
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'text',
        overscrollBehavior: 'contain',
        scrollBehavior: 'smooth',
        willChange: 'scroll-position',
        backgroundColor: '#000', // 确保有背景色
      }}
    >
      {/* 移动端滚动条 */}
      <MobileScrollbar
        terminal={terminal.term}
        containerRef={terminalRef}
        className="z-10"
      />

      {/* 移动端滚动按钮 */}
      <MobileScrollButtons
        terminal={terminal.term}
        containerRef={terminalRef}
        className="z-20"
      />
    </div>
  );
};

const Terminal = () => {
  const navigate = useNavigate();
  const {
    terminals,
    activeTabId,
    setActiveTabId,
    createTerminal,
    closeTerminal,
    cleanupAll,
    sendInput,
    isRestoring,
    restoreSettled,
    syncClaudeConversations,
    restoreClaudeConversation,
    reconnectTerminal,
    checkClaudeStatus,
    checkTmuxAlive,
    detachTerminal,
    getTmuxSettings,
    killTmuxSession,
    showRestoreDialog,
    detachedSessions,
    handleRestoreSessions,
    handleIgnoreSessions,
  } = useTerminalContext();
  const { addNotification } = useNotifications();
  const isMobile = useIsMobile();
  const [showProjectSelector, setShowProjectSelector] = useState(false);
  const [showConversationSelector, setShowConversationSelector] = useState(false);
  const [syncingConversations, setSyncingConversations] = useState(false);
  const [conversationOptions, setConversationOptions] = useState<ClaudeConversationOption[]>([]);
  const [projectPaths, setProjectPaths] = useState<Array<{ id: number; path: string; alias: string }>>([]);
  const [isCreatingTerminal, setIsCreatingTerminal] = useState(false);
  const [hasShownInitialSelector, setHasShownInitialSelector] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [isMobileInputFocused, setIsMobileInputFocused] = useState(false);
  const [lockedKeyboardHeight, setLockedKeyboardHeight] = useState<number | null>(null); // 锁定的键盘高度
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [isFullscreenInput, setIsFullscreenInput] = useState(false);
  const [debugExpanded, setDebugExpanded] = useState(false);

  // 历史命令管理
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [currentDraft, setCurrentDraft] = useState('');

  // 使用 visualViewport hook
  const { keyboardHeight: vvKeyboardHeight, isKeyboardVisible: vvIsKeyboardVisible } = useVisualViewport();
  const viewportRafRef = useRef<number | null>(null);
  const viewportBaselineRef = useRef<number>(0);
  const keyboardLockTimerRef = useRef<NodeJS.Timeout | null>(null);
  const showDebugInfo = import.meta.env.DEV && typeof window !== 'undefined' && window.localStorage.getItem('terminal_debug') === '1';
  const preserveInputFocusOnPress = useCallback((event: React.PointerEvent) => {
    event.preventDefault();
  }, []);
  const focusInputAtCursorEnd = useCallback(() => {
    requestAnimationFrame(() => {
      const activeInput = inputRef.current;
      if (!activeInput) {
        return;
      }
      activeInput.focus({ preventScroll: true });
      if (document.activeElement === activeInput) {
        activeInput.setSelectionRange(activeInput.value.length, activeInput.value.length);
      }
    });
  }, []);
  const insertTextIntoInput = useCallback((text: string) => {
    const activeInput = inputRef.current;
    if (!activeInput) {
      setInputValue((prev) => `${prev}${text}`);
      focusInputAtCursorEnd();
      return;
    }

    const selectionStart = activeInput.selectionStart ?? activeInput.value.length;
    const selectionEnd = activeInput.selectionEnd ?? activeInput.value.length;
    const nextValue = `${activeInput.value.slice(0, selectionStart)}${text}${activeInput.value.slice(selectionEnd)}`;
    const nextCursor = selectionStart + text.length;

    setInputValue(nextValue);
    requestAnimationFrame(() => {
      activeInput.focus({ preventScroll: true });
      activeInput.setSelectionRange(nextCursor, nextCursor);
    });
  }, [focusInputAtCursorEnd]);

  // 诊断函数：打印终端状态
  const diagnoseTerminal = useCallback(() => {
    console.log('=== 🔍 TERMINAL DIAGNOSIS ===');
    console.log('Terminals count:', terminals.length);
    console.log('Active tab ID:', activeTabId);
    console.log('Is restoring:', isRestoring);
    console.log('Restore settled:', restoreSettled);

    terminals.forEach((term, index) => {
      console.log(`\n--- Terminal ${index + 1} ---`);
      console.log('ID:', term.id);
      console.log('Title:', term.title);
      console.log('Is opened:', term.isOpened);
      console.log('Lifecycle:', term.lifecycle);
      console.log('Has element:', !!term.term.element);
      console.log('Element parent:', term.term.element?.parentElement?.tagName);
      console.log('Rows x Cols:', `${term.term.rows} x ${term.term.cols}`);
      console.log('WS state:', term.ws.readyState);

      if (term.term.element) {
        const el = term.term.element as HTMLElement;
        console.log('Element dimensions:', {
          width: el.offsetWidth,
          height: el.offsetHeight,
          display: window.getComputedStyle(el).display,
          visibility: window.getComputedStyle(el).visibility,
        });
      }
    });
    console.log('=== END DIAGNOSIS ===\n');
  }, [terminals, activeTabId, isRestoring, restoreSettled]);

  // 在开发环境下，每5秒自动诊断一次
  useEffect(() => {
    if (!import.meta.env.DEV) return;

    const interval = setInterval(() => {
      diagnoseTerminal();
    }, 5000);

    return () => clearInterval(interval);
  }, [diagnoseTerminal]);

  const [, setDebugTick] = useState(0);
  useEffect(() => {
    if (!showDebugInfo) {
      return;
    }
    const timer = setInterval(() => {
      setDebugTick((value) => value + 1);
    }, 500);
    return () => clearInterval(timer);
  }, [showDebugInfo]);

  const handleActivateTerminal = useCallback((terminalId: string) => {
    const didSwitchTab = activeTabId !== terminalId;
    if (didSwitchTab) {
      setActiveTabId(terminalId);
    }
    if (!isMobile) {
      return didSwitchTab;
    }
    focusInputAtCursorEnd();
    return false;
  }, [activeTabId, isMobile, setActiveTabId, focusInputAtCursorEnd]);

  const handleCloseTab = useCallback(async (terminalId: string) => {
    const terminal = terminals.find(t => t.id === terminalId);
    if (!terminal) {
      return;
    }

    // 如果使用 tmux，检查会话是否存活
    if (terminal.useTmux && terminal.tmuxSessionName) {
      const alive = await checkTmuxAlive(terminal);
      if (alive) {
        // 读取用户设置
        const settings = getTmuxSettings();

        if (settings.defaultCloseAction === 'detach') {
          // 默认 Detach：直接关闭前端连接，保持 tmux 运行
          await detachTerminal(terminal);
          return;
        } else {
          // 默认 Kill：显示确认对话框
          const confirmed = window.confirm(
            'tmux 会话仍在运行，关闭将终止会话。确定要关闭吗？'
          );
          if (!confirmed) {
            return;
          }
          // 终止 tmux 会话
          await killTmuxSession(terminal.tmuxSessionName);
        }
      }
    }

    closeTerminal(terminalId);
  }, [terminals, checkTmuxAlive, getTmuxSettings, detachTerminal, killTmuxSession, closeTerminal]);

  const notifyRestoreInProgress = useCallback(() => {
    addNotification({
      type: 'info',
      title: '终端暂不可用',
      message: '终端恢复中，请稍后重试',
    });
  }, [addNotification]);

  // 获取项目路径列表
  useEffect(() => {
    const fetchProjectPaths = async () => {
      try {
        const response = await fetch(`${API_CONFIG.BASE_URL}/project-paths?enabled=true`);
        const data = await response.json();
        setProjectPaths(data.items || []);
      } catch (error) {
        console.error('Failed to fetch project paths:', error);
      }
    };
    fetchProjectPaths();
  }, []);

  // 处理选择项目并创建新终端
  const handleSelectProject = useCallback(async (projectPath: string) => {
    setIsMobileInputFocused(false);
    console.log('[Terminal Page] handleSelectProject called', { projectPath, isCreatingTerminal });

    // 防止重复点击
    if (isCreatingTerminal) {
      console.log('[Terminal Page] Already creating terminal, ignoring duplicate request');
      return;
    }

    setShowProjectSelector(false);

    if (isRestoring) {
      console.log('[Terminal Page] Restore in progress, aborting');
      notifyRestoreInProgress();
      return;
    }

    console.log('[Terminal Page] Setting isCreatingTerminal to true');
    setIsCreatingTerminal(true);

    try {
      // 创建终端并自动启动 Claude
      console.log('[Terminal Page] Calling createTerminal');
      const terminal = createTerminal(projectPath, true);
      if (!terminal) {
        console.log('[Terminal Page] createTerminal returned null');
        notifyRestoreInProgress();
        return;
      }

      console.log('[Terminal Page] Terminal created successfully', terminal.id);
      addNotification({
        type: 'success',
        title: '终端已创建',
        message: `已在项目路径 ${projectPath} 创建新终端，Claude 正在启动...`,
      });
    } finally {
      // 延迟重置状态，防止快速重复点击
      setTimeout(() => {
        console.log('[Terminal Page] Resetting isCreatingTerminal to false');
        setIsCreatingTerminal(false);
      }, 1000);
    }
  }, [createTerminal, isRestoring, notifyRestoreInProgress, addNotification, isCreatingTerminal]);

  const handleSyncConversations = useCallback(async () => {
    setIsMobileInputFocused(false);
    setSyncingConversations(true);
    const items = await syncClaudeConversations();
    setConversationOptions(items);
    setShowConversationSelector(true);
    setSyncingConversations(false);
  }, [syncClaudeConversations]);

  const handleRestoreConversation = useCallback(async (sessionId: string) => {
    setIsMobileInputFocused(false);
    // 验证 session_id
    if (!sessionId || !sessionId.trim()) {
      addNotification({
        type: 'error',
        title: '会话恢复失败',
        message: '会话 ID 不能为空，请选择一个有效的会话。',
      });
      return;
    }

    // 验证 session_id 格式（UUID 格式）
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(sessionId)) {
      addNotification({
        type: 'error',
        title: '会话恢复失败',
        message: `无效的会话 ID 格式: ${sessionId.slice(0, 20)}...`,
      });
      return;
    }

    const restored = await restoreClaudeConversation(sessionId);
    if (!restored) {
      addNotification({
        type: 'error',
        title: '会话恢复失败',
        message: `无法恢复会话 ${sessionId.slice(0, 8)}，请检查会话是否存在。`,
      });
      return;
    }
    setShowConversationSelector(false);
    addNotification({
      type: 'success',
      title: '会话恢复成功',
      message: `已恢复会话 ${sessionId.slice(0, 8)}，正在执行 claude --resume 命令...`,
    });
  }, [restoreClaudeConversation, addNotification]);

  // 初始化第一个终端（只在恢复流程收敛后且无终端时）
  useEffect(() => {
    if (!restoreSettled || isRestoring) {
      console.log('[Terminal] Skipping initial terminal creation - restore not settled');
      return;
    }

    // 如果已经显示过初始选择器，不再自动显示
    if (hasShownInitialSelector) {
      return;
    }

    if (terminals.length > 0) {
      // 有终端时，标记已经完成初始化
      setHasShownInitialSelector(true);
      return;
    }

    // 如果没有终端，显示项目选择器让用户选择（仅初始加载时）
    console.log('[Terminal] No terminals found on initial load, showing project selector');
    setShowProjectSelector(true);
    setHasShownInitialSelector(true);
  }, [restoreSettled, isRestoring, terminals.length, hasShownInitialSelector]);

  // 监听虚拟键盘事件
  useEffect(() => {
    if (!isMobile) {
      setKeyboardHeight(0);
      setIsKeyboardVisible(false);
      setIsMobileInputFocused(false);
      viewportBaselineRef.current = 0;
      if (viewportRafRef.current !== null) {
        cancelAnimationFrame(viewportRafRef.current);
        viewportRafRef.current = null;
      }
      return;
    }

    const KEYBOARD_SHOW_THRESHOLD = 60;
    const KEYBOARD_HIDE_THRESHOLD = 40;
    const HEIGHT_JITTER_THRESHOLD = 8; // 增加抖动阈值，减少频繁更新

    const applyViewportState = () => {
      if (!window.visualViewport) return;

      const viewport = window.visualViewport;
      const currentHeight = Math.round(viewport.height + viewport.offsetTop);
      const isZooming = viewport.scale > 1.05;

      // 只在初始化时设置基准线，之后不再更新
      if (viewportBaselineRef.current === 0) {
        viewportBaselineRef.current = currentHeight;
      }

      const baseline = viewportBaselineRef.current;
      const nextKeyboardHeight = Math.max(0, baseline - currentHeight);

      // 使用更大的阈值来减少抖动，并且在键盘显示时锁定高度
      setKeyboardHeight((prev) => {
        // 如果键盘已经显示，只在高度变化超过阈值时才更新
        if (prev > KEYBOARD_SHOW_THRESHOLD && nextKeyboardHeight > KEYBOARD_SHOW_THRESHOLD) {
          // 键盘显示状态，使用更大的阈值
          return Math.abs(prev - nextKeyboardHeight) > HEIGHT_JITTER_THRESHOLD * 2 ? nextKeyboardHeight : prev;
        }
        // 键盘显示/隐藏切换时，使用正常阈值
        return Math.abs(prev - nextKeyboardHeight) > HEIGHT_JITTER_THRESHOLD ? nextKeyboardHeight : prev;
      });

      setIsKeyboardVisible((prev) => {
        if (isZooming) {
          return false;
        }
        if (prev) {
          return nextKeyboardHeight > KEYBOARD_HIDE_THRESHOLD;
        }
        return nextKeyboardHeight > KEYBOARD_SHOW_THRESHOLD;
      });

      if (showDebugInfo) {
        console.log('[Terminal] Keyboard height:', nextKeyboardHeight);
        console.log('[Terminal] Viewport height:', viewport.height);
        console.log('[Terminal] Viewport offsetTop:', viewport.offsetTop);
        console.log('[Terminal] Viewport scale:', viewport.scale);
        console.log('[Terminal] Viewport baseline:', baseline);
      }
    };

    const scheduleViewportUpdate = () => {
      if (viewportRafRef.current !== null) {
        return;
      }
      viewportRafRef.current = requestAnimationFrame(() => {
        viewportRafRef.current = null;
        applyViewportState();
      });
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', scheduleViewportUpdate);
      window.visualViewport.addEventListener('scroll', scheduleViewportUpdate);
      scheduleViewportUpdate();

      return () => {
        window.visualViewport?.removeEventListener('resize', scheduleViewportUpdate);
        window.visualViewport?.removeEventListener('scroll', scheduleViewportUpdate);
        if (viewportRafRef.current !== null) {
          cancelAnimationFrame(viewportRafRef.current);
          viewportRafRef.current = null;
        }
      };
    }

    // 降级方案：监听 window resize
    const handleWindowResize = () => {
      const nextKeyboardHeight = Math.max(0, window.screen.height - window.innerHeight - 100);
      setKeyboardHeight((prev) =>
        Math.abs(prev - nextKeyboardHeight) > HEIGHT_JITTER_THRESHOLD ? nextKeyboardHeight : prev,
      );
      setIsKeyboardVisible((prev) =>
        prev ? nextKeyboardHeight > KEYBOARD_HIDE_THRESHOLD : nextKeyboardHeight > KEYBOARD_SHOW_THRESHOLD,
      );
    };

    window.addEventListener('resize', handleWindowResize);
    handleWindowResize();
    return () => window.removeEventListener('resize', handleWindowResize);
  }, [isMobile, showDebugInfo]);

  // 在移动端输入框获得焦点时隐藏底部 dock
  useEffect(() => {
    if (!isMobile) return;

    const dock = document.getElementById('mobile-dock');
    if (!dock) return;

    if (isMobileInputFocused || isKeyboardVisible) {
      dock.style.transform = 'translateY(100%)';
      dock.style.opacity = '0';
      dock.style.pointerEvents = 'none';
    } else {
      dock.style.transform = 'translateY(0)';
      dock.style.opacity = '1';
      dock.style.pointerEvents = 'auto';
    }
  }, [isMobile, isMobileInputFocused, isKeyboardVisible]);

  // 锁定键盘高度：当输入框获得焦点且键盘显示后，锁定键盘高度
  useEffect(() => {
    if (!isMobile) return;

    // 当输入框获得焦点且键盘显示时，锁定键盘高度
    if (isMobileInputFocused && isKeyboardVisible && keyboardHeight > 60) {
      // 清除之前的定时器
      if (keyboardLockTimerRef.current) {
        clearTimeout(keyboardLockTimerRef.current);
      }

      // 延迟 300ms 后锁定高度，确保键盘完全弹出
      keyboardLockTimerRef.current = setTimeout(() => {
        setLockedKeyboardHeight(keyboardHeight);
        if (showDebugInfo) {
          console.log('[Terminal] Locked keyboard height:', keyboardHeight);
        }
      }, 300);
    }

    // 当输入框失去焦点或键盘隐藏时，解锁键盘高度
    if (!isMobileInputFocused || !isKeyboardVisible) {
      if (keyboardLockTimerRef.current) {
        clearTimeout(keyboardLockTimerRef.current);
        keyboardLockTimerRef.current = null;
      }
      setLockedKeyboardHeight(null);
      if (showDebugInfo && lockedKeyboardHeight !== null) {
        console.log('[Terminal] Unlocked keyboard height');
      }
    }

    return () => {
      if (keyboardLockTimerRef.current) {
        clearTimeout(keyboardLockTimerRef.current);
      }
    };
  }, [isMobile, isMobileInputFocused, isKeyboardVisible, keyboardHeight, showDebugInfo, lockedKeyboardHeight]);

  // 获取当前活跃的终端
  const activeTerminal = terminals.find(t => t.id === activeTabId);
  const QUICK_TOOLBAR_HEIGHT = 64;
  const MOBILE_DOCK_HEIGHT = 64;
  const MOBILE_DOCK_BOTTOM_GAP = 16;
  const SAFE_AREA_BOTTOM = 20; // 底部安全区域高度（适配 iOS 刘海屏和 Android 手势导航）
  const isMobileInputMode = isMobile && (isKeyboardVisible || isMobileInputFocused);
  const mobileToolbarOffset = isMobileInputMode ? QUICK_TOOLBAR_HEIGHT + 12 : 0;
  const keyboardOffset = isMobile && isKeyboardVisible ? Math.max(0, keyboardHeight) : 0;
  const mobileDockOffset = isMobile ? MOBILE_DOCK_HEIGHT + MOBILE_DOCK_BOTTOM_GAP + SAFE_AREA_BOTTOM : 0;
  // 内容区域需要为底部 dock、键盘和工具栏预留空间
  const terminalWorkspacePaddingBottom = isMobile
    ? Math.max(mobileDockOffset, keyboardOffset + mobileToolbarOffset + SAFE_AREA_BOTTOM)
    : 0;

  // 移动端由底部输入框作为唯一键盘宿主，不再同步聚焦 xterm

  // 移动端恢复后补充延迟 fit
  useEffect(() => {
    if (!isMobile || !activeTerminal) {
      return;
    }

    // 检测是否是 restore 模式
    const isRestoreMode = activeTerminal.id.startsWith('terminal-restored-');
    if (!isRestoreMode) {
      return;
    }

    // 延迟 fit，确保容器在底部 padding、工具栏状态、viewport 更新完成后再次同步尺寸
    const delayedFitTimer = setTimeout(() => {
      try {
        console.log('[Terminal] Mobile restore delayed fit:', activeTerminal.id);
        activeTerminal.fitAddon.fit();
        const rows = activeTerminal.term.rows;
        const cols = activeTerminal.term.cols;
        console.log('[Terminal] Mobile restore delayed fit result:', { rows, cols });
      } catch (error) {
        console.error('[Terminal] Mobile restore delayed fit failed:', error);
      }
    }, 300);

    return () => clearTimeout(delayedFitTimer);
  }, [isMobile, activeTerminal, terminalWorkspacePaddingBottom]);

  // 兜底：有终端但 activeTabId 无效时，自动激活第一个终端
  useEffect(() => {
    if (terminals.length === 0) return;

    const hasValidActive = activeTabId && terminals.some(t => t.id === activeTabId);
    if (!hasValidActive) {
      setActiveTabId(terminals[0].id);
    }
  }, [terminals, activeTabId, setActiveTabId]);



  // 移除键盘弹出时自动滚动到底部，避免意外聚焦
  // useEffect(() => {
  //   if (isKeyboardVisible && activeTerminal) {
  //     setTimeout(() => {
  //       activeTerminal.term.scrollToBottom();
  //     }, 100);
  //   }
  // }, [isKeyboardVisible, activeTerminal]);

  // 移动端：移除自动聚焦，只在用户点击键盘按钮时聚焦
  // useEffect(() => {
  //   if (isMobile && activeTerminal) {
  //     // 延迟聚焦，确保 DOM 已更新
  //     const timer = setTimeout(() => {
  //       activeTerminal.term.focus();
  //     }, 150);
  //     return () => clearTimeout(timer);
  //   }
  // }, [isMobile, activeTabId, activeTerminal]);

  const handleCloseAllAndRestart = async () => {
    setIsMobileInputFocused(false);
    // 关闭所有终端
    await cleanupAll();

    // 不自动创建新终端，让用户手动选择
    console.log('[Terminal] All terminals closed by user');
  };

  // 触觉反馈函数
  const triggerHaptic = () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(10); // 10ms 振动
    }
  };

  // 发送按键到终端
  const sendKeyToTerminal = (key: string) => {
    triggerHaptic();
    const terminal = terminals.find(t => t.id === activeTabId);
    if (!terminal) return;

    const keyMap: Record<string, string> = {
      'Enter': '\r',
      'Tab': '\t',
      'Shift+Tab': '\x1b[Z',
      'Ctrl+C': '\x03',
      'Ctrl+L': '\x0c',
      '↑': '\x1b[A',
      '↓': '\x1b[B',
      '←': '\x1b[D',
      '→': '\x1b[C',
    };

    const keyCode = keyMap[key];
    if (keyCode) {
      sendInput(terminal.id, keyCode);
    }
  };

  // 移动端输入框发送后保持作为唯一键盘宿主
  const handleSendInput = () => {
    if (!inputValue.trim()) return;
    const terminal = terminals.find(t => t.id === activeTabId);
    if (terminal) {
      // 添加到历史命令
      setCommandHistory(prev => [...prev, inputValue]);
      setHistoryIndex(-1);
      setCurrentDraft('');

      // 发送输入内容
      sendInput(terminal.id, inputValue);
      // 发送回车键（Enter）
      sendInput(terminal.id, '\r');
      setInputValue('');
      focusInputAtCursorEnd();
    }
  };

  // 处理输入框回车键
  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSendInput();
    }
  };

  // 历史命令导航
  const navigateHistory = useCallback((direction: 'up' | 'down') => {
    if (direction === 'up') {
      if (historyIndex === -1) {
        // 保存当前草稿
        setCurrentDraft(inputValue);
        if (commandHistory.length > 0) {
          setHistoryIndex(commandHistory.length - 1);
          setInputValue(commandHistory[commandHistory.length - 1]);
        }
      } else if (historyIndex > 0) {
        setHistoryIndex(historyIndex - 1);
        setInputValue(commandHistory[historyIndex - 1]);
      }
    } else {
      if (historyIndex === -1) return;
      if (historyIndex < commandHistory.length - 1) {
        setHistoryIndex(historyIndex + 1);
        setInputValue(commandHistory[historyIndex + 1]);
      } else {
        // 恢复草稿
        setInputValue(currentDraft);
        setHistoryIndex(-1);
      }
    }
    triggerHaptic();
  }, [historyIndex, commandHistory, inputValue, currentDraft]);

  // 处理快捷键点击
  const handleShortcutClick = useCallback((shortcut: Shortcut) => {
    triggerHaptic();

    switch (shortcut.type) {
      case 'history':
        // 历史命令导航
        navigateHistory(shortcut.value as 'up' | 'down');
        break;

      case 'insert':
        // 插入类：插入到光标处
        insertTextIntoInput(shortcut.value);
        break;

      case 'control':
        // 控制类：发送控制事件
        if (shortcut.value === 'tab') {
          sendKeyToTerminal('Tab');
        } else if (shortcut.value === 'ctrl-c') {
          sendKeyToTerminal('Ctrl+C');
        } else if (shortcut.value === 'ctrl-d') {
          const terminal = terminals.find(t => t.id === activeTabId);
          if (terminal) {
            sendInput(terminal.id, '\x04'); // Ctrl+D
          }
        } else if (shortcut.value === 'esc') {
          const terminal = terminals.find(t => t.id === activeTabId);
          if (terminal) {
            sendInput(terminal.id, '\x1b'); // Esc
          }
        }
        break;

      case 'command':
        // 命令类：写入输入框并执行
        setInputValue(shortcut.value);
        setTimeout(() => {
          handleSendInput();
        }, 100);
        break;
    }
  }, [navigateHistory, insertTextIntoInput, sendKeyToTerminal, terminals, activeTabId, sendInput, handleSendInput]);

  // 处理 Copy 按钮
  const handleCopy = async () => {
    triggerHaptic();
    const terminal = terminals.find(t => t.id === activeTabId);
    if (!terminal) return;

    try {
      const selection = terminal.term.getSelection();
      if (selection) {
        await navigator.clipboard.writeText(selection);
      }
    } catch (error) {
      console.error('[Terminal] Failed to copy:', error);
    }
  };

  // 处理回车按钮
  const handleEnterKey = () => {
    sendKeyToTerminal('Enter');
  };

  // 处理 Paste 按钮：优先粘贴到底部输入框
  const handlePaste = async () => {
    triggerHaptic();

    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        insertTextIntoInput(text);
      }
    } catch (error) {
      console.error('[Terminal] Failed to paste:', error);
    }
  };

  // 清理组件副作用
  useEffect(() => {
    return () => {
      if (viewportRafRef.current !== null) {
        cancelAnimationFrame(viewportRafRef.current);
      }
    };
  }, []);

  // 页面可见性检测 - 自动重连
  useEffect(() => {
    if (!isMobile) return;

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // 页面变为可见，检查所有终端连接
        console.log('[Terminal] Page became visible, checking terminal connections...');
        terminals.forEach((terminal) => {
          if (terminal.ws.readyState !== WebSocket.OPEN && !terminal.reconnecting) {
            console.log(`[Terminal] Terminal ${terminal.id} is disconnected, attempting reconnect...`);
            reconnectTerminal(terminal.id);
          }
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [terminals, isMobile, reconnectTerminal]);

  return (
    <>
      {/* tmux 恢复对话框 */}
      <TmuxRestoreDialog
        isOpen={showRestoreDialog}
        sessions={detachedSessions}
        onRestore={handleRestoreSessions}
        onIgnore={handleIgnoreSessions}
      />

      <div className="flex h-full min-h-0 flex-col gap-4 px-4 pt-4 md:gap-6 md:px-8 md:pt-6">
      {/* Header */}
      <header className="flex shrink-0 items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight uppercase">TERMINAL</h1>
            <p className="text-sm md:text-base text-gray-400 line-clamp-1 md:line-clamp-none">
              多标签终端，支持项目路径快速切换与 Claude 会话恢复
            </p>
            <div className="flex items-center gap-3 mt-1">
              <p className="text-xs text-gray-500">
                <span className="text-green-500">{terminals.length} 个终端</span>正在运行
              </p>
            </div>
          </div>
          <div className="flex gap-2 items-center">
          {/* 添加按钮 - 点击显示项目选择器 */}
          <div className="relative">
            <ActionButton
              variant="secondary"
              onClick={() => setShowProjectSelector(!showProjectSelector)}
              title="New Tab"
            >
              <Plus size={18} />
            </ActionButton>

            {/* 项目选择器下拉菜单 */}
            {showProjectSelector && (
              <>
                {/* 遮罩层 */}
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowProjectSelector(false)}
                />

                {/* 下拉菜单 */}
                <div className={`
                  ${isMobile
                    ? 'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-sm'
                    : 'absolute top-full left-1/2 -translate-x-1/2 mt-2 w-64'
                  }
                  bg-black/95 backdrop-blur-xl border border-white/20 rounded-lg shadow-2xl z-50 overflow-hidden
                `}>
                  <div className="p-3 border-b border-white/10">
                    <p className="text-sm font-medium text-white">选择项目路径</p>
                  </div>
                  <div className={`${isMobile ? 'max-h-[60vh]' : 'max-h-64'} overflow-y-auto`}>
                    {projectPaths.length > 0 ? (
                      projectPaths.map((path) => (
                        <button
                          key={path.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectProject(path.path);
                          }}
                          disabled={isCreatingTerminal}
                          className="w-full text-left px-4 py-3 hover:bg-white/10 active:bg-white/20 transition-colors flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <FolderOpen size={16} className="text-green-400 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">{path.alias}</p>
                            <p className="text-xs text-gray-400 truncate mt-0.5">{path.path}</p>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-6 text-center">
                        <p className="text-sm text-gray-400 mb-4">暂无项目路径</p>
                        <button
                          onClick={() => {
                            setShowProjectSelector(false);
                            navigate('/settings');
                          }}
                          className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded-lg text-sm font-medium text-blue-400 transition-colors"
                        >
                          前往 Settings 添加项目
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="relative">
            <ActionButton
              variant="secondary"
              onClick={handleSyncConversations}
              title="Sync Claude Conversations"
              disabled={syncingConversations}
            >
              <RefreshCw size={18} className={syncingConversations ? 'animate-spin' : ''} />
            </ActionButton>

            {showConversationSelector && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowConversationSelector(false)}
                />
                <div className={`
                  ${isMobile
                    ? 'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-md'
                    : 'absolute top-full right-0 mt-2 w-80'
                  }
                  bg-black/95 backdrop-blur-xl border border-white/20 rounded-lg shadow-2xl z-50 overflow-hidden
                `}>
                  <div className="p-3 border-b border-white/10">
                    <p className="text-sm font-medium text-white">选择 Claude 会话恢复</p>
                  </div>
                  <div className={`${isMobile ? 'max-h-[60vh]' : 'max-h-80'} overflow-y-auto`}>
                    {conversationOptions.length > 0 ? (
                      conversationOptions.map((item) => (
                        <button
                          key={item.session_id}
                          onClick={() => handleRestoreConversation(item.session_id)}
                          className="w-full text-left px-4 py-3 hover:bg-white/10 active:bg-white/20 transition-colors border-b border-white/5 last:border-b-0"
                        >
                          <p className="text-sm font-medium text-white truncate">{item.title || item.session_id}</p>
                          <p className="text-xs text-gray-400 truncate mt-1 font-mono">{item.session_id}</p>
                          <div className="flex items-center gap-2 mt-1.5 text-[10px] text-gray-500">
                            <span className="truncate">{item.project_hint || 'unknown project'}</span>
                            {item.last_updated && (
                              <>
                                <span>·</span>
                                <span className="shrink-0">{new Date(item.last_updated).toLocaleString('zh-CN', {
                                  month: 'numeric',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}</span>
                              </>
                            )}
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-6 text-center text-sm text-gray-500">未发现可恢复会话</div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
          <ActionButton variant="secondary" onClick={handleCloseAllAndRestart} title="Close All Terminals">
            <X size={18} />
          </ActionButton>
        </div>
      </header>

      {/* 调试信息（开发环境 + 本地开关） */}
      {showDebugInfo && (
        <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 font-mono text-[11px] text-yellow-200 shrink-0 mx-4 md:mx-8">
          <button
            type="button"
            className="w-full px-3 py-2 text-left hover:bg-yellow-500/10 transition-colors"
            onClick={() => setDebugExpanded((value) => !value)}
          >
            Debug 诊断条（点击{debugExpanded ? '折叠' : '展开'}）
          </button>
          {debugExpanded && (
            <div className="px-3 pb-3 space-y-1 border-t border-yellow-500/20">
              <div>activeTabId={activeTabId ?? 'null'}</div>
              <div>wsState={activeTerminal ? activeTerminal.ws.readyState : 'null'}</div>
              <div>lifecycle={activeTerminal?.lifecycle ?? 'null'}</div>
              <div>queueLength={activeTerminal?.inputQueue?.length ?? 0}</div>
              <div>lastAckSeq={activeTerminal?.lastAckSeq ?? 0}</div>
            </div>
          )}
        </div>
      )}

      {/* Main Content Area */}
      <div
        className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0"
        style={isMobile ? {
          paddingBottom: `${terminalWorkspacePaddingBottom}px`,
          transition: 'padding-bottom 0.3s ease-out'
        } : undefined}
      >
        {/* Tabs - 移动端在上方，桌面端在右侧 */}
        {terminals.length > 1 && (
          <div className={`
            ${isMobile
              ? 'flex shrink-0 flex-row gap-2 overflow-x-auto'
              : 'flex flex-col gap-2 p-3 bg-black/20 border-l border-white/5 overflow-y-auto w-48 shrink-0 order-last'
            }
          `}>
            {terminals.map(terminal => {
              // 构建 tooltip 内容
              const tooltipLines = [];
              if (terminal.projectName) {
                tooltipLines.push(`项目: ${terminal.projectName}`);
              }
              if (terminal.claudeCodeId) {
                tooltipLines.push(`Claude Code ID: ${terminal.claudeCodeId}`);
              }
              if (terminal.sessionId) {
                tooltipLines.push(`Session ID: ${terminal.sessionId}`);
              }
              const tooltipText = tooltipLines.length > 0 ? tooltipLines.join('\n') : terminal.title;

              return (
                <button
                  type="button"
                  key={terminal.id}
                  onClick={() => handleActivateTerminal(terminal.id)}
                  title={tooltipText}
                  className={`
                    flex items-center justify-between gap-2 px-3 py-2 rounded-md text-sm font-mono transition-colors
                    ${isMobile ? 'whitespace-nowrap' : ''}
                    ${activeTabId === terminal.id
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                      : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                    }
                  `}
                >
                  <span className="truncate text-xs sm:text-sm flex items-center gap-1">
                    {terminal.useTmux && terminal.tmuxSessionName && (
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          reconnectTerminal(terminal.id);
                        }}
                        className="w-5 h-5 flex items-center justify-center rounded bg-white/10 hover:bg-blue-500/30 hover:text-blue-400 transition-colors cursor-pointer shrink-0"
                        title="刷新 tmux 会话连接"
                      >
                        <RefreshCw size={10} />
                      </span>
                    )}
                    {terminal.title}
                  </span>
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCloseTab(terminal.id);
                    }}
                    className="hover:text-red-400 transition-colors shrink-0 cursor-pointer"
                  >
                    <X size={14} />
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Terminal Content */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* Main Terminal */}
          {activeTerminal && (
            <div className="flex-1 flex flex-col overflow-hidden relative terminal-mobile-pane">
              <TerminalPane
                key={activeTerminal.id}
                terminal={activeTerminal}
                onActivate={() => handleActivateTerminal(activeTerminal.id)}
              />

            </div>
          )}

          {/* Split Terminal */}
        </div>
      </div>

      <style>{`
        @media (max-width: 767px) {
          .terminal-mobile-pane {
            overscroll-behavior: contain;
          }

          .terminal-mobile-pane .xterm,
          .terminal-mobile-pane .xterm-screen,
          .terminal-mobile-pane .xterm-viewport {
            height: 100% !important;
          }

          .terminal-mobile-pane .xterm-viewport {
            overflow-y: auto !important;
            overflow-x: hidden !important;
            -webkit-overflow-scrolling: touch;
            /* 隐藏滚动条，保留滚动能力 */
            scrollbar-width: none; /* Firefox */
            -ms-overflow-style: none; /* IE/Edge */
          }

          /* Chrome/Safari 隐藏滚动条 */
          .terminal-mobile-pane .xterm-viewport::-webkit-scrollbar {
            display: none;
          }
        }
      `}</style>

      {/* 移动端输入工具栏 */}
      {isMobile && (
        <div
          className={`fixed left-0 right-0 z-50 transition-opacity duration-200 ease-out ${
            isMobileInputMode ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          style={{
            // 使用锁定的键盘高度，如果没有锁定则使用实时高度
            bottom: `${lockedKeyboardHeight !== null ? lockedKeyboardHeight : keyboardHeight}px`,
            transform: isMobileInputMode ? 'translateY(0)' : 'translateY(8px)',
            // 只在没有锁定时才过渡 bottom 属性
            transition: lockedKeyboardHeight !== null
              ? 'opacity 0.2s ease-out, transform 0.2s ease-out'
              : 'bottom 0.2s ease-out, opacity 0.2s ease-out, transform 0.2s ease-out',
          }}
        >
          <div className="px-4 pb-3">
            <div className="space-y-2 rounded-[22px] border border-white/12 bg-slate-950/78 px-3 py-3 shadow-[0_-12px_40px_rgba(15,23,42,0.4)] backdrop-blur-xl supports-[backdrop-filter]:bg-slate-950/65">
              {/* 快捷键栏 - 移动端始终显示 */}
              <div className="rounded-2xl bg-white/8 border border-white/12 overflow-hidden shadow-inner">
                <TerminalShortcutBar onShortcutClick={handleShortcutClick} />
              </div>

              {/* 输入框区域 - 无左侧按钮 */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1 min-w-0">
                  <textarea
                    ref={inputRef}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleInputKeyDown}
                    onFocus={() => setIsMobileInputFocused(true)}
                    onBlur={() => setIsMobileInputFocused(false)}
                    rows={1}
                    className="w-full pl-3 pr-24 py-2.5 bg-white/8 border border-white/16 rounded-xl text-white placeholder-gray-400 transition-colors focus:outline-none focus:border-blue-400/70 focus:bg-white/10 resize-none overflow-hidden"
                    placeholder="输入 prompt..."
                    style={{
                      minHeight: '44px',
                      maxHeight: '120px',
                    }}
                    onInput={(e) => {
                      const target = e.target as HTMLTextAreaElement;
                      target.style.height = 'auto';
                      target.style.height = Math.min(target.scrollHeight, 120) + 'px';
                    }}
                  />
                  <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <button
                      type="button"
                      onPointerDown={(event) => {
                        preserveInputFocusOnPress(event);
                        setIsFullscreenInput(true);
                      }}
                      className="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 bg-white/8 hover:bg-white/12 border border-white/16"
                      aria-label="放大输入框"
                    >
                      <Maximize2 size={16} className="text-white" />
                    </button>
                    <button
                      type="button"
                      onPointerDown={(event) => {
                        preserveInputFocusOnPress(event);
                        handleSendInput();
                      }}
                      className="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 bg-blue-500 hover:bg-blue-600 shadow-[0_6px_18px_rgba(59,130,246,0.35)] disabled:bg-white/12 disabled:text-gray-500 disabled:shadow-none"
                      disabled={!inputValue.trim()}
                      aria-label="发送输入"
                    >
                      <Send size={18} className="text-white" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 全屏输入框模态框 */}
      {isFullscreenInput && isMobile && (
        <div
          className="fixed inset-0 z-[9999] flex items-end"
          onClick={() => setIsFullscreenInput(false)}
          style={{
            paddingBottom: keyboardHeight > 0 ? `${keyboardHeight}px` : 'env(safe-area-inset-bottom)',
          }}
        >
          {/* 漂浮卡片 */}
          <div
            className="w-full bg-slate-900/95 backdrop-blur-xl border-t border-white/10 rounded-t-3xl shadow-2xl flex flex-col"
            style={{
              maxHeight: keyboardHeight > 0 ? `calc(100vh - ${keyboardHeight}px - 60px)` : 'calc(100vh - 120px)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 顶部工具栏 */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
              <h3 className="text-white font-medium">输入 Prompt</h3>
              <button
                type="button"
                onClick={() => setIsFullscreenInput(false)}
                className="w-10 h-10 rounded-full flex items-center justify-center bg-white/8 hover:bg-white/12 transition-colors"
                aria-label="关闭"
              >
                <Minimize2 size={20} className="text-white" />
              </button>
            </div>

            {/* 可滚动的输入区域 */}
            <div className="flex-1 overflow-y-auto p-4 min-h-0">
              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    handleSendInput();
                    setIsFullscreenInput(false);
                  }
                }}
                className="w-full h-full min-h-[200px] p-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-400 resize-none focus:outline-none focus:border-blue-400/70 focus:bg-white/8"
                placeholder="输入 prompt...&#10;&#10;提示：按 Cmd/Ctrl + Enter 发送"
                autoFocus
              />
            </div>

            {/* 底部操作栏 */}
            <div className="px-4 py-3 border-t border-white/10 flex items-center justify-end shrink-0">
              <button
                type="button"
                onClick={() => {
                  handleSendInput();
                  setIsFullscreenInput(false);
                }}
                className="px-6 py-2.5 rounded-full flex items-center gap-2 transition-all duration-200 bg-blue-500 hover:bg-blue-600 shadow-[0_6px_18px_rgba(59,130,246,0.35)] disabled:bg-white/12 disabled:text-gray-500 disabled:shadow-none"
                disabled={!inputValue.trim()}
              >
                <Send size={18} className="text-white" />
                <span className="text-white font-medium">发送</span>
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </>
  );
};

export default Terminal;
