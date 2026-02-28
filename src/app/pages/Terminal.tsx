import React, { useEffect, useRef, useState } from 'react';
import { Terminal as TerminalIcon, X, Plus, SplitSquareHorizontal, SplitSquareVertical, Keyboard, FolderOpen } from 'lucide-react';
import { ActionButton } from '../components/ui-shared';
import { useTerminalContext, TerminalInstance } from '../contexts/TerminalContext';
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

  useEffect(() => {
    if (!terminalRef.current) return;

    console.log('[TerminalPane] Mounting terminal:', terminal.id);
    terminal.term.open(terminalRef.current);
    terminal.fitAddon.fit();

    // 移动端支持：自动聚焦终端
    const focusTerminal = () => {
      terminal.term.focus();
    };

    // 点击或触摸时聚焦
    const handleInteraction = (e: Event) => {
      e.preventDefault();
      focusTerminal();
    };

    const terminalElement = terminalRef.current;
    terminalElement.addEventListener('click', handleInteraction);
    terminalElement.addEventListener('touchstart', handleInteraction, { passive: false });

    // 初始聚焦
    setTimeout(focusTerminal, 100);

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
      terminalElement.removeEventListener('click', handleInteraction);
      terminalElement.removeEventListener('touchstart', handleInteraction);
    };
  }, [terminal]);

  return (
    <div
      ref={terminalRef}
      className="flex-1 overflow-hidden"
      style={{
        minHeight: 0,
        touchAction: 'none', // 防止移动端滚动干扰
        WebkitTouchCallout: 'none', // 禁用长按菜单
        WebkitUserSelect: 'text', // 允许文本选择
      }}
    />
  );
};

const Terminal = () => {
  const { terminals, activeTabId, setActiveTabId, createTerminal, closeTerminal } = useTerminalContext();
  const [splitDirection, setSplitDirection] = useState<SplitDirection>(null);
  const [splitTerminalId, setSplitTerminalId] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [projectPaths, setProjectPaths] = useState<ProjectPath[]>([]);
  const [selectedProjectPath, setSelectedProjectPath] = useState<string>('');

  // 获取项目路径列表
  useEffect(() => {
    const fetchProjectPaths = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/project-paths?enabled=true');
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

  // 当选择的项目路径改变时，创建新终端
  const handleProjectPathChange = (newPath: string) => {
    console.log('[Terminal] handleProjectPathChange called with:', newPath);
    console.log('[Terminal] Current terminals count:', terminals.length);
    setSelectedProjectPath(newPath);
    // 创建新终端并切换到新的项目目录
    const newTerminal = createTerminal(newPath);
    console.log('[Terminal] New terminal created:', newTerminal.id);
  };

  // 检测是否为移动设备
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 初始化第一个终端
  useEffect(() => {
    if (terminals.length === 0 && selectedProjectPath) {
      createTerminal(selectedProjectPath);
    }
  }, [selectedProjectPath]);

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

  const handleFocusTerminal = () => {
    const terminal = terminals.find(t => t.id === activeTabId);
    if (terminal) {
      terminal.term.focus();
    }
  };

  // 处理关闭终端时的分屏状态
  useEffect(() => {
    if (splitTerminalId && !terminals.find(t => t.id === splitTerminalId)) {
      setSplitTerminalId(null);
      setSplitDirection(null);
    }
  }, [terminals, splitTerminalId]);

  // 获取当前显示的终端
  const activeTerminal = terminals.find(t => t.id === activeTabId);
  const splitTerminal = terminals.find(t => t.id === splitTerminalId);

  return (
    <div className="h-full flex flex-col p-4 md:p-8 space-y-4 md:space-y-6">
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
              <div className="flex items-center gap-2">
                <FolderOpen size={14} className="text-gray-400" />
                <select
                  value={selectedProjectPath}
                  onChange={(e) => handleProjectPathChange(e.target.value)}
                  className="bg-black/40 text-gray-300 text-xs px-2 py-1 rounded border border-white/10 focus:border-green-500/50 focus:outline-none"
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
          <ActionButton variant="secondary" onClick={handleClearActive} disabled={!activeTabId} title="Clear Terminal">
            <X size={16} />
          </ActionButton>
        </div>
      </header>

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
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTerminal(terminal.id);
                  }}
                  className="hover:text-red-400 transition-colors shrink-0"
                >
                  <X size={14} />
                </button>
              </button>
            ))}
          </div>
        )}

        {/* Terminal Content */}
        <div className={`flex-1 flex ${splitDirection === 'horizontal' ? 'flex-col' : 'flex-row'} overflow-hidden`}>
          {/* Main Terminal */}
          {activeTerminal && (
            <div className={`flex-1 flex flex-col overflow-hidden ${splitTerminal ? 'border-r border-white/10' : ''}`}>
              <TerminalPane
                key={activeTerminal.id}
                terminal={activeTerminal}
                isFocused={true}
              />
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
