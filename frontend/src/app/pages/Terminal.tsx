import React, { useCallback, useEffect, useRef, useState } from 'react';

import { Terminal as TerminalIcon, X, Plus, RefreshCw, Keyboard, FolderOpen } from 'lucide-react';
import { ActionButton } from '../components/ui-shared';
import { useTerminalContext, TerminalInstance } from '../contexts/TerminalContext';
import { useNotifications } from '../contexts/NotificationContext';
import { useIsMobile } from '../components/ui/use-mobile';
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
  onActivate?: () => void;
}> = ({ terminal, onActivate }) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const isComposingRef = useRef<boolean>(false);
  const { sendResize, markTerminalOpened } = useTerminalContext();

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

    const fitAndNotify = () => {
      try {
        console.log('[TerminalPane] 📏 Fitting terminal...');
        terminal.fitAddon.fit();
        console.log('[TerminalPane] ✅ Fit successful:', {
          rows: terminal.term.rows,
          cols: terminal.term.cols,
        });
        sendResize(terminal.id, terminal.term.rows, terminal.term.cols);
      } catch (error) {
        console.error('[TerminalPane] ❌ fitAndNotify failed:', error);
      }
    };

    requestAnimationFrame(() => {
      fitAndNotify();
      requestAnimationFrame(fitAndNotify);
    });

    const fitTimer1 = setTimeout(fitAndNotify, 60);
    const fitTimer2 = setTimeout(fitAndNotify, 260);

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
      clearTimeout(fitTimer1);
      clearTimeout(fitTimer2);
    };
  }, [terminal, markTerminalOpened, sendResize]);

  return (
    <div
      ref={terminalRef}
      className="flex-1 overflow-auto relative"
      onClick={() => {
        if (isComposingRef.current) {
          return;
        }
        onActivate?.();
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
    </div>
  );
};

const Terminal = () => {
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
  } = useTerminalContext();
  const { addNotification } = useNotifications();
  const isMobile = useIsMobile();
  const [showProjectSelector, setShowProjectSelector] = useState(false);
  const [showConversationSelector, setShowConversationSelector] = useState(false);
  const [syncingConversations, setSyncingConversations] = useState(false);
  const [conversationOptions, setConversationOptions] = useState<ClaudeConversationOption[]>([]);
  const [projectPaths, setProjectPaths] = useState<Array<{ id: number; path: string; alias: string }>>([]);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [isShiftPressed, setIsShiftPressed] = useState(false);
  const [showMoreKeys, setShowMoreKeys] = useState(false);
  const [longPressKey, setLongPressKey] = useState<string | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [debugExpanded, setDebugExpanded] = useState(false);
  const showDebugInfo = import.meta.env.DEV && typeof window !== 'undefined' && window.localStorage.getItem('terminal_debug') === '1';

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
    if (activeTabId !== terminalId) {
      setActiveTabId(terminalId);
    }
  }, [activeTabId, setActiveTabId]);

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
    setShowProjectSelector(false);

    if (isRestoring) {
      notifyRestoreInProgress();
      return;
    }

    // 创建终端并自动启动 Claude
    const terminal = createTerminal(projectPath, true);
    if (!terminal) {
      notifyRestoreInProgress();
      return;
    }

    addNotification({
      type: 'success',
      title: '终端已创建',
      message: `已在项目路径 ${projectPath} 创建新终端，Claude 正在启动...`,
    });
  }, [createTerminal, isRestoring, notifyRestoreInProgress, addNotification]);

  const handleSyncConversations = useCallback(async () => {
    setSyncingConversations(true);
    const items = await syncClaudeConversations();
    setConversationOptions(items);
    setShowConversationSelector(true);
    setSyncingConversations(false);
  }, [syncClaudeConversations]);

  const handleRestoreConversation = useCallback(async (sessionId: string) => {
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

    if (terminals.length > 0) {
      return;
    }

    // 如果没有终端，显示项目选择器让用户选择
    console.log('[Terminal] No terminals found, showing project selector');
    setShowProjectSelector(true);
  }, [restoreSettled, isRestoring, terminals.length]);

  // 监听虚拟键盘事件
  useEffect(() => {
    if (!isMobile) return;

    // 使用 Visual Viewport API 监听键盘
    const handleViewportResize = () => {
      if (!window.visualViewport) return;

      const viewport = window.visualViewport;
      const keyboardHeight = window.innerHeight - viewport.height;

      setKeyboardHeight(keyboardHeight);
      setIsKeyboardVisible(keyboardHeight > 100); // 键盘高度超过 100px 认为是弹出状态

      console.log('[Terminal] Keyboard height:', keyboardHeight);
      console.log('[Terminal] Viewport height:', viewport.height);
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleViewportResize);
      window.visualViewport.addEventListener('scroll', handleViewportResize);

      return () => {
        window.visualViewport?.removeEventListener('resize', handleViewportResize);
        window.visualViewport?.removeEventListener('scroll', handleViewportResize);
      };
    } else {
      // 降级方案：监听 window resize
      const handleWindowResize = () => {
        const keyboardHeight = Math.max(0, window.screen.height - window.innerHeight - 100);
        setKeyboardHeight(keyboardHeight);
        setIsKeyboardVisible(keyboardHeight > 100);
      };

      window.addEventListener('resize', handleWindowResize);
      return () => window.removeEventListener('resize', handleWindowResize);
    }
  }, [isMobile]);

  // 获取当前活跃的终端
  const activeTerminal = terminals.find(t => t.id === activeTabId);

  // 兜底：有终端但 activeTabId 无效时，自动激活第一个终端
  useEffect(() => {
    if (terminals.length === 0) return;

    const hasValidActive = activeTabId && terminals.some(t => t.id === activeTabId);
    if (!hasValidActive) {
      setActiveTabId(terminals[0].id);
    }
  }, [terminals, activeTabId, setActiveTabId]);

  // 滚动到底部函数
  const scrollToBottom = () => {
    if (activeTerminal) {
      activeTerminal.term.scrollToBottom();
      setShowScrollToBottom(false);
    }
  };

  // 监听终端滚动位置，显示/隐藏"滚动到底部"按钮
  useEffect(() => {
    if (!isMobile || !activeTerminal) return;

    const checkScrollPosition = () => {
      const terminal = activeTerminal.term;
      const buffer = terminal.buffer.active;
      const viewport = terminal.rows;
      const scrollback = buffer.length;
      const scrollTop = terminal.buffer.active.viewportY;

      // 如果不在底部（距离底部超过 3 行），显示按钮
      const isAtBottom = scrollTop >= scrollback - viewport - 3;
      setShowScrollToBottom(!isAtBottom);
    };

    // 监听终端滚动事件
    const disposable = activeTerminal.term.onScroll(() => {
      checkScrollPosition();
    });

    // 初始检查
    checkScrollPosition();

    return () => {
      disposable.dispose();
    };
  }, [isMobile, activeTerminal]);

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
    // 关闭所有终端
    await cleanupAll();

    // 恢复流程未收敛时不重启终端
    const terminal = createTerminal();
    if (!terminal) {
      notifyRestoreInProgress();
    }
  };

  const handleFocusTerminal = () => {
    const terminal = terminals.find(t => t.id === activeTabId);
    if (terminal) {
      terminal.term.focus();
    }
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
      'Tab': '\t',
      'Esc': '\x1b',
      'Ctrl+C': '\x03',
      'Ctrl+D': '\x04',
      'Ctrl+Z': '\x1a',
      'Ctrl+L': '\x0c',
      'Ctrl+A': '\x01',
      'Ctrl+E': '\x05',
      'Ctrl+W': '\x17',
      'Ctrl+U': '\x15',
      'Ctrl+K': '\x0b',
      'Ctrl+R': '\x12',
      '↑': '\x1b[A',
      '↓': '\x1b[B',
      '←': '\x1b[D',
      '→': '\x1b[C',
      'Shift+↑': '\x1b[1;2A',
      'Shift+↓': '\x1b[1;2B',
      'Shift+←': '\x1b[1;2D',
      'Shift+→': '\x1b[1;2C',
    };

    const keyCode = keyMap[key];
    if (keyCode) {
      sendInput(terminal.id, keyCode);

      if (key.startsWith('Shift+')) {
        setIsShiftPressed(false);
      }
    }
  };

  // 长按开始
  const handleLongPressStart = (key: string, description: string) => {
    longPressTimerRef.current = setTimeout(() => {
      setLongPressKey(`${key}: ${description}`);
      triggerHaptic();
    }, 500); // 500ms 触发长按
  };

  // 长按结束
  const handleLongPressEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    setLongPressKey(null);
  };

  // 清理长按定时器
  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, []);

  return (
    <div
      className="h-full flex flex-col p-4 md:p-8 space-y-4 md:space-y-6"
      style={{
        // 移动端键盘弹出时调整高度
        height: isMobile && isKeyboardVisible
          ? `calc(100vh - ${keyboardHeight}px)`
          : '100%',
        transition: 'height 0.2s ease-out',  // 平滑过渡
      }}
    >
      {/* Header */}
      <header className="flex justify-between items-start gap-3">
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
                          onClick={() => handleSelectProject(path.path)}
                          className="w-full text-left px-4 py-3 hover:bg-white/10 active:bg-white/20 transition-colors flex items-center gap-3"
                        >
                          <FolderOpen size={16} className="text-green-400 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">{path.alias}</p>
                            <p className="text-xs text-gray-400 truncate mt-0.5">{path.path}</p>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-6 text-center text-sm text-gray-500">
                        暂无项目路径
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
          {isMobile && (
            <ActionButton
              variant="secondary"
              onClick={handleFocusTerminal}
              title="Focus Terminal (Show Keyboard)"
              disabled={!activeTabId}
            >
              <Keyboard size={18} />
            </ActionButton>
          )}
          <ActionButton variant="secondary" onClick={handleCloseAllAndRestart} title="Close All & Restart">
            <X size={18} />
          </ActionButton>
        </div>
      </header>

      {/* 调试信息（开发环境 + 本地开关） */}
      {showDebugInfo && (
        <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 font-mono text-[11px] text-yellow-200">
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

      {/* 移动端虚拟键盘工具栏 */}
      {isMobile && isKeyboardVisible && (
        <div className="bg-black/60 border-b border-white/10">
          {/* 长按提示 */}
          {longPressKey && (
            <div className="px-4 py-2 bg-blue-500/20 border-b border-blue-500/30 text-xs text-blue-300">
              {longPressKey}
            </div>
          )}

          {/* 主工具栏 */}
          <div className="flex items-center gap-2 px-4 py-2 overflow-x-auto">
            {/* 编辑组 */}
            <div className="flex items-center gap-2 pr-2 border-r border-white/10">
              <button
                onClick={async () => {
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

                  // 恢复焦点
                  setTimeout(() => {
                    terminal.term.focus();
                  }, 50);
                }}
                onTouchStart={() => handleLongPressStart('Copy', '复制选中文本到剪贴板')}
                onTouchEnd={handleLongPressEnd}
                className="px-3 py-1.5 bg-green-500/20 hover:bg-green-500/30 rounded text-xs font-mono text-green-400 whitespace-nowrap transition-colors border border-green-500/30"
              >
                Copy
              </button>

              <button
                onClick={async () => {
                  triggerHaptic();
                  const terminal = terminals.find(t => t.id === activeTabId);
                  if (!terminal) return;

                  try {
                    const text = await navigator.clipboard.readText();
                    if (text) {
                      sendInput(terminal.id, text);
                    }
                  } catch (error) {
                    console.error('[Terminal] Failed to paste:', error);
                  }

                  // 恢复焦点
                  setTimeout(() => {
                    terminal.term.focus();
                  }, 50);
                }}
                onTouchStart={() => handleLongPressStart('Paste', '从剪贴板粘贴文本')}
                onTouchEnd={handleLongPressEnd}
                className="px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 rounded text-xs font-mono text-blue-400 whitespace-nowrap transition-colors border border-blue-500/30"
              >
                Paste
              </button>
            </div>

            {/* 特殊按键组 */}
            <div className="flex items-center gap-2 pr-2 border-r border-white/10">
              <button
                onClick={() => {
                  setIsShiftPressed(!isShiftPressed);
                  triggerHaptic();
                }}
                onTouchStart={() => handleLongPressStart('Shift', '切换大小写或组合键')}
                onTouchEnd={handleLongPressEnd}
                className={`px-3 py-1.5 rounded text-xs font-mono whitespace-nowrap transition-colors ${isShiftPressed
                  ? 'bg-yellow-500/30 text-yellow-300 border border-yellow-500/50'
                  : 'bg-white/10 text-gray-300 hover:bg-white/20'
                  }`}
              >
                Shift
              </button>

              <button
                onClick={() => sendKeyToTerminal('Tab')}
                onTouchStart={() => handleLongPressStart('Tab', '制表符，用于自动补全')}
                onTouchEnd={handleLongPressEnd}
                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded text-xs font-mono text-gray-300 whitespace-nowrap transition-colors"
              >
                Tab
              </button>

              <button
                onClick={() => sendKeyToTerminal('Esc')}
                onTouchStart={() => handleLongPressStart('Esc', '退出当前模式或取消操作')}
                onTouchEnd={handleLongPressEnd}
                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded text-xs font-mono text-gray-300 whitespace-nowrap transition-colors"
              >
                Esc
              </button>
            </div>

            {/* 导航组 */}
            <div className="flex items-center gap-2 pr-2 border-r border-white/10">
              {['↑', '↓', '←', '→'].map((key) => (
                <button
                  key={key}
                  onClick={() => sendKeyToTerminal(isShiftPressed ? `Shift+${key}` : key)}
                  onTouchStart={() => handleLongPressStart(key, isShiftPressed ? '选择文本' : '移动光标')}
                  onTouchEnd={handleLongPressEnd}
                  className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded text-xs font-mono text-gray-300 whitespace-nowrap transition-colors"
                >
                  {key}
                </button>
              ))}
            </div>

            {/* 控制组 */}
            <div className="flex items-center gap-2 pr-2 border-r border-white/10">
              <button
                onClick={() => sendKeyToTerminal('Ctrl+C')}
                onTouchStart={() => handleLongPressStart('Ctrl+C', '中断当前命令')}
                onTouchEnd={handleLongPressEnd}
                className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 rounded text-xs font-mono text-red-400 whitespace-nowrap transition-colors border border-red-500/30"
              >
                Ctrl+C
              </button>

              <button
                onClick={() => sendKeyToTerminal('Ctrl+D')}
                onTouchStart={() => handleLongPressStart('Ctrl+D', '退出当前 shell 或发送 EOF')}
                onTouchEnd={handleLongPressEnd}
                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded text-xs font-mono text-gray-300 whitespace-nowrap transition-colors"
              >
                Ctrl+D
              </button>

              <button
                onClick={() => sendKeyToTerminal('Ctrl+L')}
                onTouchStart={() => handleLongPressStart('Ctrl+L', '清屏')}
                onTouchEnd={handleLongPressEnd}
                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded text-xs font-mono text-gray-300 whitespace-nowrap transition-colors"
              >
                Ctrl+L
              </button>
            </div>

            {/* 更多按钮 */}
            <button
              onClick={() => {
                setShowMoreKeys(!showMoreKeys);
                triggerHaptic();
              }}
              className="px-3 py-1.5 bg-purple-500/20 hover:bg-purple-500/30 rounded text-xs font-mono text-purple-400 whitespace-nowrap transition-colors border border-purple-500/30"
            >
              {showMoreKeys ? '收起' : '更多'}
            </button>
          </div>

          {/* 扩展工具栏 */}
          {showMoreKeys && (
            <div className="flex items-center gap-2 px-4 py-2 overflow-x-auto border-t border-white/10">
              <button
                onClick={() => sendKeyToTerminal('Ctrl+Z')}
                onTouchStart={() => handleLongPressStart('Ctrl+Z', '挂起当前进程')}
                onTouchEnd={handleLongPressEnd}
                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded text-xs font-mono text-gray-300 whitespace-nowrap transition-colors"
              >
                Ctrl+Z
              </button>

              <button
                onClick={() => sendKeyToTerminal('Ctrl+A')}
                onTouchStart={() => handleLongPressStart('Ctrl+A', '移动到行首')}
                onTouchEnd={handleLongPressEnd}
                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded text-xs font-mono text-gray-300 whitespace-nowrap transition-colors"
              >
                Ctrl+A
              </button>

              <button
                onClick={() => sendKeyToTerminal('Ctrl+E')}
                onTouchStart={() => handleLongPressStart('Ctrl+E', '移动到行尾')}
                onTouchEnd={handleLongPressEnd}
                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded text-xs font-mono text-gray-300 whitespace-nowrap transition-colors"
              >
                Ctrl+E
              </button>

              <button
                onClick={() => sendKeyToTerminal('Ctrl+W')}
                onTouchStart={() => handleLongPressStart('Ctrl+W', '删除光标前的单词')}
                onTouchEnd={handleLongPressEnd}
                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded text-xs font-mono text-gray-300 whitespace-nowrap transition-colors"
              >
                Ctrl+W
              </button>

              <button
                onClick={() => sendKeyToTerminal('Ctrl+U')}
                onTouchStart={() => handleLongPressStart('Ctrl+U', '删除光标前的整行')}
                onTouchEnd={handleLongPressEnd}
                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded text-xs font-mono text-gray-300 whitespace-nowrap transition-colors"
              >
                Ctrl+U
              </button>

              <button
                onClick={() => sendKeyToTerminal('Ctrl+K')}
                onTouchStart={() => handleLongPressStart('Ctrl+K', '删除光标后的内容')}
                onTouchEnd={handleLongPressEnd}
                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded text-xs font-mono text-gray-300 whitespace-nowrap transition-colors"
              >
                Ctrl+K
              </button>

              <button
                onClick={() => sendKeyToTerminal('Ctrl+R')}
                onTouchStart={() => handleLongPressStart('Ctrl+R', '搜索历史命令')}
                onTouchEnd={handleLongPressEnd}
                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded text-xs font-mono text-gray-300 whitespace-nowrap transition-colors"
              >
                Ctrl+R
              </button>
            </div>
          )}
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Tabs - 移动端在上方，桌面端在右侧 */}
        {terminals.length > 1 && (
          <div className={`
            ${isMobile
              ? 'flex flex-row gap-2 overflow-x-auto'
              : 'flex flex-col gap-2 p-3 bg-black/20 border-l border-white/5 overflow-y-auto w-48 shrink-0 order-last'
            }
          `}>
            {terminals.map(terminal => (
              <button
                key={terminal.id}
                onClick={() => setActiveTabId(terminal.id)}
                className={`
                  flex items-center justify-between gap-2 px-3 py-2 rounded-md text-sm font-mono transition-colors
                  ${isMobile ? 'whitespace-nowrap' : ''}
                  ${activeTabId === terminal.id
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                  }
                `}
              >
                <span className="truncate text-xs sm:text-sm">{terminal.title}</span>
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTerminal(terminal.id);
                  }}
                  className="hover:text-red-400 transition-colors shrink-0 cursor-pointer"
                >
                  <X size={14} />
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Terminal Content */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* Main Terminal */}
          {activeTerminal && (
            <div className="flex-1 flex flex-col overflow-hidden relative">
              <TerminalPane
                key={activeTerminal.id}
                terminal={activeTerminal}
                onActivate={() => handleActivateTerminal(activeTerminal.id)}
              />

              {/* 滚动到底部按钮 */}
              {isMobile && showScrollToBottom && (
                <button
                  onClick={scrollToBottom}
                  className="absolute bottom-4 right-4 p-3 bg-green-500/80 hover:bg-green-500 rounded-full shadow-lg transition-all z-50 animate-fade-in"
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-white"
                  >
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </button>
              )}
            </div>
          )}

          {/* Split Terminal */}
        </div>
      </div>
    </div>
  );
};

export default Terminal;
