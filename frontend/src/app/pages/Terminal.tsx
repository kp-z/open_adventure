import React, { useEffect, useRef, useState } from 'react';
import { Terminal as TerminalIcon, X, Plus, SplitSquareHorizontal, SplitSquareVertical, Keyboard, FolderOpen } from 'lucide-react';
import { ActionButton } from '../components/ui-shared';
import { useTerminalContext, TerminalInstance } from '../contexts/TerminalContext';
import { useIsMobile } from '../components/ui/use-mobile';
import { API_CONFIG } from '../../config/api';
import 'xterm/css/xterm.css';

type SplitDirection = 'horizontal' | 'vertical' | null;

interface ProjectPath {
  id: number;
  path: string;
  alias: string;
  enabled: boolean;
}

const TerminalPane: React.FC<{
  terminal: TerminalInstance;
  isFocused: boolean;
}> = ({ terminal, isFocused }) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const focusTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastFocusTimeRef = useRef<number>(0);
  const isScrollingRef = useRef<boolean>(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isComposingRef = useRef<boolean>(false);

  useEffect(() => {
    if (!terminalRef.current) return;

    console.log('[TerminalPane] Mounting terminal:', terminal.id);
    terminal.term.open(terminalRef.current);
    terminal.fitAddon.fit();

    // 移动端支持：自动聚焦终端
    const focusTerminal = (reason?: string) => {
      // 防止频繁聚焦（100ms 内只聚焦一次）
      const now = Date.now();
      if (now - lastFocusTimeRef.current < 100) {
        return;
      }
      lastFocusTimeRef.current = now;

      // 如果正在滚动，延迟聚焦
      if (isScrollingRef.current) {
        if (focusTimeoutRef.current) {
          clearTimeout(focusTimeoutRef.current);
        }
        focusTimeoutRef.current = setTimeout(() => {
          terminal.term.focus();
          console.log('[TerminalPane] Focus restored after scroll:', reason);
        }, 150);
        return;
      }

      terminal.term.focus();
      console.log('[TerminalPane] Terminal focused:', reason);
    };

    // 监听焦点事件（使用 focusin/focusout，支持冒泡）
    const handleFocusIn = (e: FocusEvent) => {
      console.log('[TerminalPane] Focus in:', e.target);
    };

    const handleFocusOut = (e: FocusEvent) => {
      console.log('[TerminalPane] Focus out:', e.target, 'relatedTarget:', e.relatedTarget);

      // 如果焦点移到了虚拟键盘按钮，稍后恢复焦点
      const relatedTarget = e.relatedTarget as HTMLElement;
      if (relatedTarget && relatedTarget.tagName === 'BUTTON') {
        // 延迟恢复焦点，等待按钮点击完成
        if (focusTimeoutRef.current) {
          clearTimeout(focusTimeoutRef.current);
        }
        focusTimeoutRef.current = setTimeout(() => {
          focusTerminal('after button click');
        }, 100);
      }
    };

    // 监听滚动事件
    const handleScroll = () => {
      isScrollingRef.current = true;
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      scrollTimeoutRef.current = setTimeout(() => {
        isScrollingRef.current = false;
        // 滚动结束后恢复焦点
        focusTerminal('after scroll');
      }, 200);
    };

    // IME 组合事件监听
    const handleCompositionStart = (e: CompositionEvent) => {
      console.log('[TerminalPane] Composition start:', e.data);
      isComposingRef.current = true;
    };

    const handleCompositionUpdate = (e: CompositionEvent) => {
      console.log('[TerminalPane] Composition update:', e.data);
      // 组合输入中，不做特殊处理，让 xterm.js 自己处理
    };

    const handleCompositionEnd = (e: CompositionEvent) => {
      console.log('[TerminalPane] Composition end:', e.data);
      isComposingRef.current = false;
      // 组合结束后，xterm.js 会自动发送最终的输入
    };

    const terminalElement = terminalRef.current;
    terminalElement.addEventListener('focusin', handleFocusIn);
    terminalElement.addEventListener('focusout', handleFocusOut);
    terminalElement.addEventListener('scroll', handleScroll, { passive: true });
    terminalElement.addEventListener('compositionstart', handleCompositionStart);
    terminalElement.addEventListener('compositionupdate', handleCompositionUpdate);
    terminalElement.addEventListener('compositionend', handleCompositionEnd);

    // 移除初始自动聚焦，只在用户主动点击键盘按钮时聚焦
    // setTimeout(() => focusTerminal('initial'), 100);

    // 窗口大小变化时重新适配
    const handleResize = () => {
      terminal.fitAddon.fit();
      if (terminal.ws.readyState === WebSocket.OPEN) {
        terminal.ws.send(JSON.stringify({
          type: 'resize',
          rows: terminal.term.rows,
          cols: terminal.term.cols
        }));
      }
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(terminalRef.current);

    return () => {
      resizeObserver.disconnect();
      terminalElement.removeEventListener('focusin', handleFocusIn);
      terminalElement.removeEventListener('focusout', handleFocusOut);
      terminalElement.removeEventListener('scroll', handleScroll);
      terminalElement.removeEventListener('compositionstart', handleCompositionStart);
      terminalElement.removeEventListener('compositionupdate', handleCompositionUpdate);
      terminalElement.removeEventListener('compositionend', handleCompositionEnd);
      if (focusTimeoutRef.current) {
        clearTimeout(focusTimeoutRef.current);
      }
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [terminal]);

  return (
    <div
      ref={terminalRef}
      className="flex-1 overflow-auto"
      style={{
        minHeight: 0,
        touchAction: 'pan-y',  // 允许垂直滚动，禁止水平滚动和缩放
        WebkitOverflowScrolling: 'touch',  // iOS 平滑滚动
        WebkitTouchCallout: 'none',  // 禁用长按菜单
        WebkitUserSelect: 'text',  // 允许文本选择
        overscrollBehavior: 'contain',  // 防止滚动穿透
        scrollBehavior: 'smooth',  // 平滑滚动
        willChange: 'scroll-position',  // 提示浏览器优化滚动性能
      }}
    />
  );
};

const Terminal = () => {
  const { terminals, activeTabId, setActiveTabId, createTerminal, closeTerminal, cleanupAll, isRestoring } = useTerminalContext();
  const [splitDirection, setSplitDirection] = useState<SplitDirection>(null);
  const [splitTerminalId, setSplitTerminalId] = useState<string | null>(null);
  const isMobile = useIsMobile();
  const [projectPaths, setProjectPaths] = useState<ProjectPath[]>([]);
  const [selectedProjectPath, setSelectedProjectPath] = useState<string>('');
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [isShiftPressed, setIsShiftPressed] = useState(false);
  const [showMoreKeys, setShowMoreKeys] = useState(false);
  const [longPressKey, setLongPressKey] = useState<string | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const terminalContainerRef = useRef<HTMLDivElement>(null);

  // 获取项目路径列表
  useEffect(() => {
    const fetchProjectPaths = async () => {
      try {
        const response = await fetch(`${API_CONFIG.BASE_URL}/project-paths?enabled=true`);
        const data = await response.json();
        setProjectPaths(data.items || []);
        // 默认选择第一个
        if (data.items && data.items.length > 0) {
          setSelectedProjectPath(data.items[0].path);
        }
      } catch (error) {
        console.error('Failed to fetch project paths:', error);
      }
    };
    fetchProjectPaths();
  }, []);

  // 当选择的项目路径改变时，在当前终端切换目录或创建新终端
  const handleProjectPathChange = (newPath: string) => {
    console.log('[Terminal] handleProjectPathChange called with:', newPath);
    console.log('[Terminal] Current terminals count:', terminals.length);
    setSelectedProjectPath(newPath);

    // 如果有活跃的终端，发送 cd 命令切换目录
    if (activeTabId && terminals.length > 0) {
      const terminal = terminals.find(t => t.id === activeTabId);
      if (terminal && terminal.ws.readyState === WebSocket.OPEN) {
        console.log('[Terminal] Sending cd command to active terminal:', activeTabId);
        terminal.ws.send(JSON.stringify({
          type: 'input',
          data: `cd ${newPath}\n`
        }));
      }
    } else {
      // 如果没有终端，创建新终端
      console.log('[Terminal] No active terminal, creating new one');
      const newTerminal = createTerminal(newPath);
      console.log('[Terminal] New terminal created:', newTerminal.id);
    }
  };

  // 初始化第一个终端（只在没有恢复 session 时）
  useEffect(() => {
    // 如果正在恢复，不创建新终端
    if (isRestoring) {
      console.log('[Terminal] Skipping initial terminal creation - restore in progress');
      return;
    }

    // 延迟检查，等待恢复逻辑完成
    const timer = setTimeout(() => {
      if (terminals.length === 0 && selectedProjectPath) {
        console.log('[Terminal] No terminals found, creating initial terminal');
        createTerminal(selectedProjectPath);
      }
    }, 200); // 等待恢复逻辑完成

    return () => clearTimeout(timer);
  }, [selectedProjectPath, isRestoring]);

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

  const handleSplit = (direction: 'horizontal' | 'vertical') => {
    if (!activeTabId) return;

    // 如果已经有分屏，先取消
    if (splitTerminalId) {
      setSplitTerminalId(null);
      setSplitDirection(null);
    }

    // 创建新终端用于分屏
    const newTerminal = createTerminal();
    setSplitDirection(direction);
    setSplitTerminalId(newTerminal.id);
  };

  const handleClearActive = () => {
    const terminal = terminals.find(t => t.id === activeTabId);
    if (terminal) {
      terminal.term.clear();
    }
  };

  const handleCloseAllAndRestart = async () => {
    // 关闭所有终端
    await cleanupAll();
    // 重启一个新终端
    createTerminal(selectedProjectPath);
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
    if (!terminal || terminal.ws.readyState !== WebSocket.OPEN) return;

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
      terminal.ws.send(JSON.stringify({
        type: 'input',
        data: keyCode
      }));

      // 如果是 Shift 组合键，发送后自动释放 Shift
      if (key.startsWith('Shift+')) {
        setIsShiftPressed(false);
      }

      // 发送按键后恢复焦点
      setTimeout(() => {
        terminal.term.focus();
      }, 50);
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

  // 处理关闭终端时的分屏状态
  useEffect(() => {
    if (splitTerminalId && !terminals.find(t => t.id === splitTerminalId)) {
      setSplitTerminalId(null);
      setSplitDirection(null);
    }
  }, [terminals, splitTerminalId]);

  // 获取分屏终端
  const splitTerminal = terminals.find(t => t.id === splitTerminalId);

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
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight uppercase">SHELL</h1>
          <div className="flex items-center gap-3 mt-2">
            <p className="text-sm md:text-base text-gray-400">
              <span className="text-green-500">{terminals.length} terminal{terminals.length > 1 ? 's' : ''}</span> active
            </p>
            {/* 项目路径选择器 */}
            {projectPaths.length > 0 && (
              <div className="flex items-center gap-2 relative z-10">
                <FolderOpen size={14} className="text-gray-400 shrink-0" />
                <select
                  value={selectedProjectPath}
                  onChange={(e) => handleProjectPathChange(e.target.value)}
                  className="bg-black/40 text-gray-300 text-xs px-2 py-1 rounded border border-white/10 focus:border-green-500/50 focus:outline-none min-w-0 max-w-[200px] md:max-w-none"
                >
                  {projectPaths.map((path) => (
                    <option key={path.id} value={path.path}>
                      {path.alias}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <ActionButton variant="secondary" onClick={() => createTerminal(selectedProjectPath)} title="New Tab">
            <Plus size={16} />
          </ActionButton>
          {!isMobile && (
            <>
              <ActionButton
                variant="secondary"
                onClick={() => handleSplit('horizontal')}
                title="Split Horizontal"
                disabled={!activeTabId}
              >
                <SplitSquareHorizontal size={16} />
              </ActionButton>
              <ActionButton
                variant="secondary"
                onClick={() => handleSplit('vertical')}
                title="Split Vertical"
                disabled={!activeTabId}
              >
                <SplitSquareVertical size={16} />
              </ActionButton>
            </>
          )}
          {isMobile && (
            <ActionButton
              variant="secondary"
              onClick={handleFocusTerminal}
              title="Focus Terminal (Show Keyboard)"
              disabled={!activeTabId}
            >
              <Keyboard size={16} />
            </ActionButton>
          )}
          <ActionButton variant="secondary" onClick={handleCloseAllAndRestart} title="Close All & Restart">
            <X size={16} />
          </ActionButton>
        </div>
      </header>

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
                    if (text && terminal.ws.readyState === WebSocket.OPEN) {
                      terminal.ws.send(JSON.stringify({
                        type: 'input',
                        data: text
                      }));
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
                className={`px-3 py-1.5 rounded text-xs font-mono whitespace-nowrap transition-colors ${
                  isShiftPressed
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
              ? 'flex flex-row gap-2 p-2 bg-black/20 border-b border-white/5 overflow-x-auto'
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
        <div className={`flex-1 flex ${splitDirection === 'horizontal' ? 'flex-col' : 'flex-row'} overflow-hidden relative`}>
          {/* Main Terminal */}
          {activeTerminal && (
            <div className={`flex-1 flex flex-col overflow-hidden ${splitTerminal ? 'border-r border-white/10' : ''} relative`}>
              <TerminalPane
                key={activeTerminal.id}
                terminal={activeTerminal}
                isFocused={true}
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
          {splitTerminal && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex items-center justify-between px-3 py-1 bg-black/40 border-b border-white/10">
                <span className="text-xs text-gray-400 font-mono">{splitTerminal.title}</span>
                <button
                  onClick={() => {
                    setSplitTerminalId(null);
                    setSplitDirection(null);
                  }}
                  className="text-gray-400 hover:text-red-400 transition-colors"
                >
                  <X size={12} />
                </button>
              </div>
              <TerminalPane
                key={splitTerminal.id}
                terminal={splitTerminal}
                isFocused={false}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Terminal;
