import React, { useEffect, useRef, useState } from 'react';
import { Terminal as TerminalIcon, X, Maximize2, Minimize2, Plus, SplitSquareHorizontal, SplitSquareVertical } from 'lucide-react';
import { ActionButton } from '../components/ui-shared';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';

interface TerminalInstance {
  id: string;
  term: XTerm;
  ws: WebSocket;
  fitAddon: FitAddon;
  title: string;
}

type SplitDirection = 'horizontal' | 'vertical' | null;

const TerminalPane: React.FC<{
  terminal: TerminalInstance;
  isFocused: boolean;
}> = ({ terminal, isFocused }) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    if (!terminalRef.current || mountedRef.current) return;

    terminal.term.open(terminalRef.current);
    terminal.fitAddon.fit();
    mountedRef.current = true;

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
    };
  }, [terminal]);

  return (
    <div
      ref={terminalRef}
      className="flex-1 overflow-hidden"
      style={{ minHeight: 0 }}
    />
  );
};

const Terminal = () => {
  const [terminals, setTerminals] = useState<TerminalInstance[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [splitDirection, setSplitDirection] = useState<SplitDirection>(null);
  const [splitTerminalId, setSplitTerminalId] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const terminalCounterRef = useRef(1);

  const createTerminal = () => {
    const id = `terminal-${Date.now()}`;
    const title = `Terminal ${terminalCounterRef.current++}`;

    // 创建 xterm 实例
    const term = new XTerm({
      cursorBlink: true,
      fontSize: 13,
      fontFamily: "'Fira Code', 'Menlo', 'Monaco', 'Courier New', monospace",
      theme: {
        background: '#000000',
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
    });

    // 创建 fit addon
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);

    // 连接 WebSocket
    const ws = new WebSocket('ws://localhost:8000/api/terminal/ws');

    ws.onopen = () => {
      term.writeln('\x1b[32m✓ Connected to zsh terminal\x1b[0m');
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
      }

      // 如果关闭的是分屏终端，取消分屏
      if (splitTerminalId === id) {
        setSplitTerminalId(null);
        setSplitDirection(null);
      }

      return newTerminals;
    });
  };

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

  // 初始化第一个终端
  useEffect(() => {
    if (terminals.length === 0) {
      createTerminal();
    }

    return () => {
      terminals.forEach(terminal => {
        terminal.term.dispose();
        terminal.ws.close();
      });
    };
  }, []);

  // 获取当前显示的终端
  const activeTerminal = terminals.find(t => t.id === activeTabId);
  const splitTerminal = terminals.find(t => t.id === splitTerminalId);

  return (
    <div className={`h-full flex flex-col ${isFullscreen ? 'fixed inset-0 z-50 bg-[#0a0b0f] p-6' : ''}`}>
      {/* Header */}
      <header className={`flex justify-between items-center ${isFullscreen ? 'mb-4' : 'mb-0 px-6 py-3 border-b border-white/5'}`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
            <TerminalIcon className="text-white" size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight uppercase">ZSH TERMINAL</h1>
            <p className="text-xs text-gray-400">
              <span className="text-green-500">{terminals.length} terminal{terminals.length > 1 ? 's' : ''}</span>
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <ActionButton variant="secondary" onClick={() => createTerminal()} title="New Tab">
            <Plus size={16} />
          </ActionButton>
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
          <ActionButton variant="secondary" onClick={handleClearActive} disabled={!activeTabId}>
            Clear
          </ActionButton>
          <ActionButton
            variant="secondary"
            onClick={() => setIsFullscreen(!isFullscreen)}
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </ActionButton>
          {isFullscreen && (
            <ActionButton variant="secondary" onClick={() => setIsFullscreen(false)}>
              <X size={16} />
            </ActionButton>
          )}
        </div>
      </header>

      {/* Tabs */}
      <div className="flex items-center gap-1 px-4 py-2 bg-black/20 border-b border-white/5 overflow-x-auto">
        {terminals.map(terminal => (
          <button
            key={terminal.id}
            onClick={() => setActiveTabId(terminal.id)}
            className={`
              flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-mono transition-colors
              ${activeTabId === terminal.id
                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
              }
            `}
          >
            <span>{terminal.title}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                closeTerminal(terminal.id);
              }}
              className="hover:text-red-400 transition-colors"
            >
              <X size={12} />
            </button>
          </button>
        ))}
      </div>

      {/* Terminal Content */}
      <div className={`flex-1 flex ${splitDirection === 'horizontal' ? 'flex-col' : 'flex-row'} overflow-hidden`}>
        {/* Main Terminal */}
        {activeTerminal && (
          <div className={`flex-1 flex flex-col overflow-hidden ${splitTerminal ? 'border-r border-white/10' : ''}`}>
            <TerminalPane
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
              terminal={splitTerminal}
              isFocused={false}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default Terminal;
