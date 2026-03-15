'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Loader } from 'lucide-react';
import { MessageBubble } from './MessageBubble';
import { PromptOptimizeButton } from '../PromptOptimizeButton';
import { useUnifiedAgentSession } from '../../hooks/useUnifiedAgentSession';
import type { ChatMessage } from './types';
import type { TestResult } from '../AgentTestPanel';

interface ChatViewProps {
  agentId: number;
  agentName: string;
  onTestComplete: (result: TestResult) => void;
  sessionId?: string;
}

export function ChatView({ agentId, agentName, onTestComplete, sessionId }: ChatViewProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 使用统一的 WebSocket hook
  const { state, sendInput } = useUnifiedAgentSession({
    agentId,
    agentName,
    mode: 'chat',
    sessionId,
    onMessage: (message) => {
      setMessages((prev) => {
        // 检查是否已存在相同 ID 的消息
        const exists = prev.some((m) => m.id === message.id);
        if (exists) {
          return prev;
        }
        return [...prev, message];
      });

      // 如果是 Agent 消息且状态为 success，触发 onTestComplete
      if (message.role === 'agent' && message.status === 'success') {
        setIsRunning(false);
        onTestComplete({
          id: `test-${Date.now()}`,
          input: messages[messages.length - 1]?.content || '',
          output: message.content,
          success: true,
          duration: 0,
          timestamp: new Date().toISOString(),
          model: 'unified-session',
          agentId,
        });
      }
    },
    onError: (error) => {
      console.error('[ChatView] Error:', error);
      setIsRunning(false);
    },
  });

  // 自动滚动到最新消息（已禁用，避免页面跳动）
  // useEffect(() => {
  //   if (messages.length > 0) {
  //     messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  //   }
  // }, [messages]);

  const handleSend = useCallback(() => {
    if (!input) return;
    const messageContent = input.trim();
    if (!messageContent || isRunning || !state.isConnected) return;

    // 添加用户消息
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: messageContent,
      timestamp: new Date().toISOString(),
      status: 'success',
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsRunning(true);

    // 发送到 WebSocket
    sendInput(messageContent);
  }, [input, isRunning, state.isConnected, sendInput]);

  return (
    <div className="flex flex-col h-[500px]">
      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500 text-sm">
            <div className="text-center">
              <p>👋 欢迎使用对话模式</p>
              <p className="mt-2">
                {state.isConnected ? (state.isReady ? 'Agent 正在初始化...' : '连接中...') : '连接中...'}
              </p>
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 输入区域 */}
      <div className="p-4 border-t border-white/10">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value || '')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="输入消息..."
            disabled={isRunning || !state.isConnected}
            autoFocus={false}
            className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-xl resize-none focus:outline-none focus:border-blue-500/50 disabled:opacity-50"
            rows={3}
          />
          <div className="flex flex-col gap-2">
            <PromptOptimizeButton
              value={input}
              onChange={setInput}
              disabled={isRunning || !state.isConnected}
              iconOnly
            />
            <button
              onClick={handleSend}
              disabled={!input || !input.trim() || isRunning || !state.isConnected}
              className="p-2 bg-blue-500/20 hover:bg-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-all"
              title="发送消息"
            >
              {isRunning ? (
                <Loader className="w-5 h-5 animate-spin text-blue-400" />
              ) : (
                <Send className="w-5 h-5 text-blue-400" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
