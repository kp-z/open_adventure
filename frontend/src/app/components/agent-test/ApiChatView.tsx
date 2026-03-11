/**
 * ApiChatView - API 模式的聊天视图
 * 使用新的统一模型 API 接口层
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Loader, AlertCircle } from 'lucide-react';
import type { ChatMessage } from './types';
import { MessageBubble } from './MessageBubble';

interface ApiChatViewProps {
  agentId: number;
  agentName: string;
  mode: 'chat';
  onSessionReady?: (sessionId: string) => void;
  onError?: (error: string) => void;
}

export const ApiChatView: React.FC<ApiChatViewProps> = ({
  agentId,
  agentName,
  mode,
  onSessionReady,
  onError,
}) => {
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [provider, setProvider] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [currentChunk, setCurrentChunk] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, currentChunk]);

  // 连接 WebSocket
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.hostname}:8000/api/agents/${agentId}/api-session-ws?mode=${mode}`;

    console.log('[ApiChatView] Connecting to:', wsUrl);

    const websocket = new WebSocket(wsUrl);
    let hasReceivedReady = false;

    websocket.onopen = () => {
      console.log('[ApiChatView] WebSocket connected');
      setIsConnected(true);
    };

    websocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('[ApiChatView] Received:', data);

        switch (data.type) {
          case 'ready':
            hasReceivedReady = true;
            setIsReady(true);
            setSessionId(data.session_id);
            setProvider(data.provider || 'unknown');
            onSessionReady?.(data.session_id);
            console.log('[ApiChatView] Session ready:', data.session_id, 'Provider:', data.provider);

            // 自动发送一条消息让 agent 介绍自己
            setTimeout(() => {
              if (websocket.readyState === WebSocket.OPEN) {
                console.log('[ApiChatView] Sending auto message...');
                websocket.send(
                  JSON.stringify({
                    type: 'input',
                    data: '请简单介绍一下你自己',
                  })
                );
                setIsSending(true);
              }
            }, 500);
            break;

          case 'chat_message':
            const msg = data.message;
            if (msg.is_chunk) {
              // 流式响应块
              setCurrentChunk((prev) => prev + msg.content);
            } else {
              // 完整消息
              setMessages((prev) => [
                ...prev,
                {
                  id: msg.id,
                  role: msg.role === 'user' ? 'user' : 'agent',
                  content: msg.content,
                  timestamp: msg.timestamp,
                  status: msg.status,
                },
              ]);
              setCurrentChunk('');
              setIsSending(false);
            }
            break;

          case 'error':
            console.error('[ApiChatView] Error:', data.message);
            onError?.(data.message);
            setIsSending(false);
            break;

          default:
            console.warn('[ApiChatView] Unknown message type:', data.type);
        }
      } catch (error) {
        console.error('[ApiChatView] Failed to parse message:', error);
      }
    };

    websocket.onerror = (error) => {
      console.error('[ApiChatView] WebSocket error:', error);
      onError?.('WebSocket connection error');
    };

    websocket.onclose = () => {
      console.log('[ApiChatView] WebSocket closed');
      setIsConnected(false);
      setIsReady(false);
    };

    setWs(websocket);

    return () => {
      console.log('[ApiChatView] Cleanup: hasReceivedReady=', hasReceivedReady);
      // 只有在没有收到 ready 消息时才关闭 WebSocket
      // 这样可以避免在组件重新渲染时关闭正在使用的 WebSocket
      if (!hasReceivedReady && websocket.readyState === WebSocket.OPEN) {
        console.log('[ApiChatView] Closing WebSocket in cleanup');
        websocket.send(JSON.stringify({ type: 'stop' }));
        websocket.close();
      }
    };
  }, [agentId, mode]);

  // 发送消息
  const handleSend = () => {
    if (!input || !input.trim() || !ws || !isReady || isSending) return;

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString(),
      status: 'sending',
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsSending(true);

    ws.send(
      JSON.stringify({
        type: 'input',
        data: input.trim(),
      })
    );

    setInput('');
  };

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* 连接状态提示 */}
      {!isReady && (
        <div className="flex items-center justify-center p-4 bg-blue-500/10 border-b border-blue-500/20">
          <Loader className="w-4 h-4 mr-2 animate-spin text-blue-400" />
          <span className="text-sm text-blue-400">
            {isConnected ? `Initializing ${provider || 'API'} session...` : 'Connecting...'}
          </span>
        </div>
      )}

      {/* 发送消息状态提示 */}
      {isSending && (
        <div className="flex items-center justify-center p-4 bg-purple-500/10 border-b border-purple-500/20">
          <Loader className="w-4 h-4 mr-2 animate-spin text-purple-400" />
          <span className="text-sm text-purple-400">
            Sending message...
          </span>
        </div>
      )}

      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence>
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
        </AnimatePresence>

        {/* 当前流式响应块 */}
        {currentChunk && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-start"
          >
            <div className="max-w-[80%] bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
              <div className="text-sm text-gray-300 whitespace-pre-wrap">{currentChunk}</div>
              <div className="flex items-center mt-2 text-xs text-gray-500">
                <Loader className="w-3 h-3 mr-1 animate-spin" />
                Streaming...
              </div>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 输入框 */}
      <div className="border-t border-gray-800/50 p-4">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value || '')}
            onKeyDown={handleKeyDown}
            placeholder={isReady ? `Message ${agentName}...` : 'Waiting for connection...'}
            disabled={!isReady || isSending}
            className="flex-1 bg-gray-800/30 border border-gray-700/50 rounded-lg px-4 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none min-h-[44px] max-h-[200px]"
            rows={1}
            style={{
              height: 'auto',
              minHeight: '44px',
            }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = `${Math.min(target.scrollHeight, 200)}px`;
            }}
          />
          <button
            onClick={handleSend}
            disabled={!input || !input.trim() || !isReady || isSending}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center gap-2"
          >
            {isSending ? (
              <Loader className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Provider 信息 */}
        {provider && (
          <div className="mt-2 text-xs text-gray-500">
            Using Claude CLI (claude -p --agent)
          </div>
        )}
      </div>
    </div>
  );
};
