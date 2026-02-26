import React, { useState, useEffect, useRef } from 'react';
import { Terminal as TerminalIcon, X, Maximize2, Minimize2 } from 'lucide-react';
import { GlassCard, ActionButton } from '../components/ui-shared';

const Terminal = () => {
  const [connected, setConnected] = useState(false);
  const [output, setOutput] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const outputRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // 连接 WebSocket
    const ws = new WebSocket('ws://localhost:8000/api/terminal/ws');

    ws.onopen = () => {
      setConnected(true);
      setOutput(prev => [...prev, '✓ Connected to terminal']);
    };

    ws.onmessage = (event) => {
      setOutput(prev => [...prev, event.data]);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setOutput(prev => [...prev, '✗ Connection error']);
    };

    ws.onclose = () => {
      setConnected(false);
      setOutput(prev => [...prev, '✗ Connection closed']);
    };

    wsRef.current = ws;

    return () => {
      ws.close();
    };
  }, []);

  useEffect(() => {
    // 自动滚动到底部
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return;
    }

    // 添加到历史记录
    setHistory(prev => [...prev, input]);
    setHistoryIndex(-1);

    // 显示输入的命令
    setOutput(prev => [...prev, `$ ${input}`]);

    // 发送到服务器
    wsRef.current.send(JSON.stringify({
      type: 'input',
      data: input + '\n'
    }));

    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length > 0) {
        const newIndex = historyIndex === -1 ? history.length - 1 : Math.max(0, historyIndex - 1);
        setHistoryIndex(newIndex);
        setInput(history[newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex !== -1) {
        const newIndex = historyIndex + 1;
        if (newIndex >= history.length) {
          setHistoryIndex(-1);
          setInput('');
        } else {
          setHistoryIndex(newIndex);
          setInput(history[newIndex]);
        }
      }
    }
  };

  const handleClear = () => {
    setOutput([]);
  };

  return (
    <div className={`space-y-6 ${isFullscreen ? 'fixed inset-0 z-50 bg-[#0a0b0f] p-6' : ''}`}>
      <header className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gray-700 flex items-center justify-center">
            <TerminalIcon className="text-white" size={20} />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight uppercase">DEBUG TERMINAL</h1>
            <p className="text-sm text-gray-400">
              {connected ? (
                <span className="text-green-500">● Connected</span>
              ) : (
                <span className="text-red-500">● Disconnected</span>
              )}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <ActionButton variant="secondary" onClick={handleClear}>
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

      <GlassCard className={`${isFullscreen ? 'h-[calc(100vh-120px)]' : 'h-[600px]'} flex flex-col`}>
        {/* 输出区域 */}
        <div
          ref={outputRef}
          className="flex-1 overflow-y-auto p-4 font-mono text-sm space-y-1 bg-black/20 rounded-t-xl"
        >
          {output.map((line, index) => (
            <div key={index} className="text-gray-300 whitespace-pre-wrap break-all">
              {line}
            </div>
          ))}
        </div>

        {/* 输入区域 */}
        <form onSubmit={handleSubmit} className="border-t border-white/10 p-4 bg-black/10">
          <div className="flex items-center gap-2">
            <span className="text-green-500 font-mono">$</span>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={!connected}
              placeholder={connected ? "Enter command..." : "Connecting..."}
              className="flex-1 bg-transparent border-none outline-none text-white font-mono text-sm placeholder-gray-600"
              autoFocus
            />
          </div>
        </form>
      </GlassCard>

      <div className="text-xs text-gray-500 space-y-1">
        <p>• Use ↑/↓ arrow keys to navigate command history</p>
        <p>• Press Enter to execute command</p>
        <p>• WebSocket endpoint: ws://localhost:8000/api/terminal/ws</p>
      </div>
    </div>
  );
};

export default Terminal;
