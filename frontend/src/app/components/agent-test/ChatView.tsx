'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Loader } from 'lucide-react';
import { MessageBubble } from './MessageBubble';
import { PromptOptimizeButton } from '../PromptOptimizeButton';
import { API_CONFIG } from '../../../config/api';
import type { ChatMessage } from './types';
import type { TestResult } from '../AgentTestPanel';

interface ChatViewProps {
  agentId: number;
  agentName: string;
  onTestComplete: (result: TestResult) => void;
  reconnectExecutionId?: string; // 可选：重新连接到指定的 Execution ID
}

export function ChatView({ agentId, agentName, onTestComplete, reconnectExecutionId }: ChatViewProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const isConnectingRef = useRef(false);

  const MAX_RECONNECT_ATTEMPTS = 3;

  // 自动滚动到最新消息（仅在有消息时）
  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // 建立 WebSocket 连接
  const connectWebSocket = useCallback(() => {
    // 防止重复连接
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('[ChatView] WebSocket already connected, skipping');
      return;
    }

    if (isConnectingRef.current) {
      console.log('[ChatView] WebSocket connection already in progress, skipping');
      return;
    }

    console.log('[ChatView] Creating new WebSocket connection for agent', agentId, 'execution_id:', reconnectExecutionId);
    isConnectingRef.current = true;

    // 构建 WebSocket URL，如果有 reconnectExecutionId 则添加查询参数
    let wsUrl = `${API_CONFIG.WS_BASE_URL}/agents/${agentId}/test-ws`;
    if (reconnectExecutionId) {
      wsUrl += `?execution_id=${reconnectExecutionId}`;
    }

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('[ChatView] WebSocket connected');
      isConnectingRef.current = false;
      setIsConnected(true);
      reconnectAttemptsRef.current = 0;
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log('[ChatView] Received message:', message.type);

        switch (message.type) {
          case 'ready':
            // 检查是否为重新连接
            const isReconnect = message.is_reconnect || false;
            const sessionId = message.session_id;
            const executionId = message.execution_id;
            const chatHistory = message.chat_history || [];

            console.log('[ChatView] Ready message received:', { isReconnect, sessionId, executionId, chatHistory });

            if (!isReconnect) {
              // 首次连接，自动发送欢迎消息
              const welcomeMessage = `你好！我是 ${agentName}。请介绍一下你的能力和职责。`;
              ws.send(JSON.stringify({
                type: 'test',
                prompt: welcomeMessage
              }));

              // 添加用户消息
              const userMessage: ChatMessage = {
                id: `user-${Date.now()}`,
                role: 'user',
                content: welcomeMessage,
                timestamp: new Date().toISOString(),
                status: 'success',
              };
              setMessages([userMessage]);

              // 添加 Agent 消息占位符
              const agentMessage: ChatMessage = {
                id: `agent-${Date.now()}`,
                role: 'agent',
                content: '',
                timestamp: new Date().toISOString(),
                status: 'sending',
              };
              setMessages((prev) => [...prev, agentMessage]);
              setIsRunning(true);
            } else {
              // 重新连接到现有会话，恢复聊天历史
              console.log('[ChatView] Reconnected to existing session:', sessionId);

              // 恢复聊天历史
              if (chatHistory.length > 0) {
                setMessages(chatHistory);
              }
            }
            break;

          case 'log':
            // 更新 Agent 消息内容
            setMessages((prev) => {
              const lastMessage = prev[prev.length - 1];
              if (lastMessage && lastMessage.role === 'agent') {
                return [
                  ...prev.slice(0, -1),
                  {
                    ...lastMessage,
                    content: lastMessage.content + message.message + '\n',
                  },
                ];
              }
              return prev;
            });
            break;

          case 'complete':
            // 测试完成
            setMessages((prev) => {
              const lastMessage = prev[prev.length - 1];
              if (lastMessage && lastMessage.role === 'agent') {
                const updatedMessages = [
                  ...prev.slice(0, -1),
                  {
                    ...lastMessage,
                    content: message.data.output,
                    status: message.data.success ? 'success' : 'error',
                  },
                ];

                // 延迟调用 onTestComplete，避免在渲染过程中更新父组件状态
                setTimeout(() => {
                  const userMessageContent = updatedMessages[updatedMessages.length - 2]?.content || '';
                  onTestComplete({
                    id: `test-${Date.now()}`,
                    input: userMessageContent,
                    output: message.data.output,
                    success: message.data.success,
                    duration: message.data.duration,
                    timestamp: new Date().toISOString(),
                    model: message.data.model,
                    agentId,
                  });
                }, 0);

                return updatedMessages;
              }
              return prev;
            });
            setIsRunning(false);
            break;

          case 'error':
            // 错误消息
            setMessages((prev) => {
              const lastMessage = prev[prev.length - 1];
              if (lastMessage && lastMessage.role === 'agent') {
                return [
                  ...prev.slice(0, -1),
                  {
                    ...lastMessage,
                    content: message.message,
                    status: 'error',
                  },
                ];
              }
              return prev;
            });
            setIsRunning(false);
            break;
        }
      } catch (error) {
        console.error('[ChatView] Failed to parse WebSocket message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('[ChatView] WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('[ChatView] WebSocket disconnected');
      isConnectingRef.current = false;
      setIsConnected(false);
      wsRef.current = null;

      // 尝试重连
      if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
        console.log(`[ChatView] Scheduling reconnect attempt ${reconnectAttemptsRef.current + 1}/${MAX_RECONNECT_ATTEMPTS}`);
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectAttemptsRef.current += 1;
          connectWebSocket();
        }, 2000);
      } else {
        console.log('[ChatView] Max reconnect attempts reached');
      }
    };

    wsRef.current = ws;
  }, [agentId, agentName]);

  // 组件挂载时建立连接
  useEffect(() => {
    connectWebSocket();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connectWebSocket]);

  const handleSend = useCallback(() => {
    const messageContent = input.trim();
    if (!messageContent || isRunning || !isConnected) return;

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

    // 添加 Agent 消息占位符
    const agentMessage: ChatMessage = {
      id: `agent-${Date.now()}`,
      role: 'agent',
      content: '',
      timestamp: new Date().toISOString(),
      status: 'sending',
    };
    setMessages((prev) => [...prev, agentMessage]);
    setIsRunning(true);

    // 发送测试消息
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'test',
        prompt: messageContent
      }));
    }
  }, [input, isRunning, isConnected]);

  return (
    <div className="flex flex-col h-[500px]">
      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500 text-sm">
            <div className="text-center">
              <p>👋 欢迎使用对话模式</p>
              <p className="mt-2">
                {isConnected ? '正在连接 Agent...' : '连接中...'}
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
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="输入消息..."
            disabled={isRunning || !isConnected}
            className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-xl resize-none focus:outline-none focus:border-blue-500/50 disabled:opacity-50"
            rows={3}
          />
          <div className="flex flex-col gap-2">
            <PromptOptimizeButton
              value={input}
              onChange={setInput}
              disabled={isRunning || !isConnected}
              iconOnly
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isRunning || !isConnected}
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
