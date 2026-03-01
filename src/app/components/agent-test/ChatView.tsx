'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  const [retryCount, setRetryCount] = useState(0);
  const [hasAutoSent, setHasAutoSent] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentInputRef = useRef<string>('');

  const MAX_RETRIES = 3;

  // 自动滚动到最新消息
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = useCallback(async (retryInput?: string) => {
    const messageContent = retryInput || input.trim();
    if (!messageContent || isRunning) return;

    // 保存当前输入用于重试
    currentInputRef.current = messageContent;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: messageContent,
      timestamp: new Date().toISOString(),
      status: 'success',
    };

    // 只在非重试时添加用户消息
    if (!retryInput) {
      setMessages((prev) => [...prev, userMessage]);
      setInput('');
    }
    setIsRunning(true);

    const agentMessageId = `agent-${Date.now()}`;
    const agentMessage: ChatMessage = {
      id: agentMessageId,
      role: 'agent',
      content: retryCount > 0 ? `正在重试 (${retryCount}/${MAX_RETRIES})...\n` : '',
      timestamp: new Date().toISOString(),
      status: 'sending',
    };

    setMessages((prev) => [...prev, agentMessage]);

    const startTime = Date.now();
    let fullOutput = retryCount > 0 ? `正在重试 (${retryCount}/${MAX_RETRIES})...\n` : '';

    try {
      agentsApi.testStream(
        agentId,
        messageContent,
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
          setRetryCount(0); // 成功后重置重试计数

          // 保存到测试历史
          onTestComplete({
            id: `test-${Date.now()}`,
            input: messageContent,
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
          // 重试逻辑
          if (retryCount < MAX_RETRIES) {
            const nextRetryCount = retryCount + 1;
            setRetryCount(nextRetryCount);

            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === agentMessageId
                  ? {
                      ...msg,
                      content: `${fullOutput}\n⚠️ 请求失败，${2}秒后自动重试 (${nextRetryCount}/${MAX_RETRIES})...`,
                      status: 'error'
                    }
                  : msg
              )
            );

            setIsRunning(false);

            setTimeout(() => {
              handleSend(currentInputRef.current);
            }, 2000);
          } else {
            // 达到最大重试次数
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === agentMessageId
                  ? {
                      ...msg,
                      content: `${error}\n\n❌ 已达到最大重试次数 (${MAX_RETRIES})，请稍后再试`,
                      status: 'error'
                    }
                  : msg
              )
            );
            setIsRunning(false);
            setRetryCount(0);

            onTestComplete({
              id: `test-${Date.now()}`,
              input: messageContent,
              output: error,
              success: false,
              duration: (Date.now() - startTime) / 1000,
              timestamp: new Date().toISOString(),
              model: 'unknown',
              agentId,
            });
          }
        }
      );
    } catch (error) {
      console.error('Send message failed:', error);

      // 重试逻辑
      if (retryCount < MAX_RETRIES) {
        const nextRetryCount = retryCount + 1;
        setRetryCount(nextRetryCount);

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === agentMessageId
              ? {
                  ...msg,
                  content: `发送失败，${2}秒后自动重试 (${nextRetryCount}/${MAX_RETRIES})...`,
                  status: 'error'
                }
              : msg
          )
        );

        setIsRunning(false);

        setTimeout(() => {
          handleSend(currentInputRef.current);
        }, 2000);
      } else {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === agentMessageId
              ? {
                  ...msg,
                  content: `发送失败\n\n❌ 已达到最大重试次数 (${MAX_RETRIES})，请稍后再试`,
                  status: 'error'
                }
              : msg
          )
        );
        setIsRunning(false);
        setRetryCount(0);
      }
    }
  }, [agentId, input, isRunning, retryCount, onTestComplete]);

  // 首次加载时自动发送启动消息
  useEffect(() => {
    if (!hasAutoSent && messages.length === 0 && !isRunning) {
      const welcomeMessage = `你好！我是 ${agentName}。请介绍一下你的能力和职责。`;
      setHasAutoSent(true);

      // 添加系统消息显示正在启动
      const systemMessage: ChatMessage = {
        id: `system-${Date.now()}`,
        role: 'system',
        content: `🚀 正在启动 Agent: ${agentName}\n⏳ 初始化中...`,
        timestamp: new Date().toISOString(),
        status: 'sending',
      };
      setMessages([systemMessage]);

      // 延迟 500ms 发送，确保组件完全加载
      const timer = setTimeout(() => {
        handleSend(welcomeMessage);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [hasAutoSent, messages.length, isRunning, agentName, handleSend]);

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
