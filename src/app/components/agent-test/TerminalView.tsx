'use client';

import React, { useState, useRef, useEffect } from 'react';
import { TerminalSession } from './types';

interface TerminalViewProps {
  agentId: string;
  wsUrl: string;
}

export const TerminalView: React.FC<TerminalViewProps> = ({ agentId, wsUrl }) => {
  const [session, setSession] = useState<TerminalSession>({
    ws: null,
    isConnected: false,
    isReady: false,
  });
  const [output, setOutput] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState('');
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // WebSocket connection will be implemented in next phase
    return () => {
      if (session.ws) {
        session.ws.close();
      }
    };
  }, []);

  const scrollToBottom = () => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [output]);

  const handleSend = () => {
    if (!inputValue.trim() || !session.isConnected) return;

    // Add user input to output
    setOutput((prev) => [...prev, `$ ${inputValue}`]);

    // Send to WebSocket (to be implemented)
    if (session.ws && session.ws.readyState === WebSocket.OPEN) {
      session.ws.send(inputValue);
    }

    setInputValue('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 text-green-400 font-mono">
      {/* Terminal Output */}
      <div
        ref={terminalRef}
        className="flex-1 overflow-y-auto p-4 space-y-1"
      >
        {!session.isConnected && (
          <div className="text-yellow-400">
            [等待连接到 Agent...]
          </div>
        )}
        {output.map((line, index) => (
          <div key={index} className="whitespace-pre-wrap">
            {line}
          </div>
        ))}
      </div>

      {/* Terminal Input */}
      <div className="border-t border-gray-700 p-2 flex items-center gap-2">
        <span className="text-green-400">$</span>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={!session.isConnected}
          placeholder={session.isConnected ? '输入命令...' : '等待连接...'}
          className="flex-1 bg-transparent outline-none text-green-400 placeholder-gray-600"
        />
      </div>
    </div>
  );
};
