'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader } from 'lucide-react';
import { MessageBubble } from './MessageBubble';
import { PromptOptimizeButton } from '../PromptOptimizeButton';
import { agentsApi } from '@/lib/api';
import type { ChatMessage } from './types';
import type { TestResult } from '../AgentTestPanel';

interface ChatViewProps {
  agentId: number;
  agentName: string;
  onTestComplete: (result: TestResult) => void;
}

export function ChatView({ agentId, agentName, onTestComplete }: ChatViewProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 自动滚动到最新消息
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isRunning) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString(),
      status: 'success',
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsRunning(true);

    const agentMessageId = `agent-${Date.now()}`;
    const agentMessage: ChatMessage = {
      id: agentMessageId,
      role: 'agent',
      content: '',
      timestamp: new Date().toISOString(),
      status: 'sending',
    };

    setMessages((prev) => [...prev, agentMessage]);

    const startTime = Date.now();
    let fullOutput = '';

    try {
      agentsApi.testStream(
        agentId,
        userMessage.content,
        // onLog
        (log: string) => {
          fullOutput += log + '\n';
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === agentMessageId
                ? { ...msg, content: fullOutput }
                : msg
            )
          );
        },
        // onComplete
        (data) => {
          const duration = (Date.now() - startTime) / 1000;
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === agentMessageId
                ? { ...msg, content: data.output, status: 'success' }
                : msg
            )
          );
          setIsRunning(false);

          // 保存到测试历史
          onTestComplete({
            id: `test-${Date.now()}`,
            input: userMessage.content,
            output: data.output,
            success: data.success,
            duration: data.duration,
            timestamp: new Date().toISOString(),
            model: data.model,
            agentId,
          });
        },
        // onError
        (error: string) => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === agentMessageId
                ? { ...msg, content: error, status: 'error' }
                : msg
            )
          );
          setIsRunning(false);

          onTestComplete({
            id: `test-${Date.now()}`,
            input: userMessage.content,
            output: error,
            success: false,
            duration: (Date.now() - startTime) / 1000,
            timestamp: new Date().toISOString(),
            model: 'unknown',
            agentId,
          });
        }
      );
    } catch (error) {
      console.error('Send message failed:', error);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === agentMessageId
            ? { ...msg, content: '发送失败，请重试', status: 'error' }
            : msg
        )
      );
      setIsRunning(false);
    }
  };

  return (
    <div className="flex flex-col h-[500px]">
      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500 text-sm">
            <div className="text-center">
              <p>👋 欢迎使用对话模式</p>
              <p className="mt-2">输入消息与 Agent 对话，支持一键优化 prompt</p>
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
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="输入消息..."
            disabled={isRunning}
            className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-xl resize-none focus:outline-none focus:border-blue-500/50 disabled:opacity-50"
            rows={3}
          />
          <div className="flex flex-col gap-2">
            <PromptOptimizeButton
              value={input}
              onChange={setInput}
              disabled={isRunning}
              iconOnly
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isRunning}
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
