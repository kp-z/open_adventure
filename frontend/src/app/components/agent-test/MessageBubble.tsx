'use client';

import React, { memo, useState, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { ChatMessage } from './types';
import 'highlight.js/styles/github-dark.css';

interface MessageBubbleProps {
  message: ChatMessage;
}

export const MessageBubble = memo<MessageBubbleProps>(function MessageBubble({ message }) {
  const isUser = message.role === 'user';
  const [isExpanded, setIsExpanded] = useState(false);

  // 计算消息行数
  const lineCount = useMemo(() => {
    return message.content.split('\n').length;
  }, [message.content]);

  // 是否需要折叠
  const needsCollapse = lineCount > 5;

  // 显示的内容
  const displayContent = useMemo(() => {
    if (!needsCollapse || isExpanded) {
      return message.content;
    }
    // 只显示前 5 行
    return message.content.split('\n').slice(0, 5).join('\n');
  }, [message.content, needsCollapse, isExpanded]);

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div
        className={`max-w-[70%] rounded-2xl px-4 py-3 shadow-sm ${
          isUser
            ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white'
            : 'bg-white/10 backdrop-blur-sm border border-white/20 text-gray-100'
        }`}
      >
        {/* Markdown 渲染 */}
        <div className={`text-sm prose prose-sm max-w-none ${isUser ? 'prose-invert' : 'prose-invert'}`}>
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeHighlight]}
            components={{
              // 自定义样式
              p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
              code: ({ inline, children, ...props }: any) =>
                inline ? (
                  <code className={`px-1.5 py-0.5 rounded ${isUser ? 'bg-blue-700/50' : 'bg-white/20'}`} {...props}>
                    {children}
                  </code>
                ) : (
                  <code className="block p-3 rounded-lg bg-gray-900/90 text-gray-100 overflow-x-auto border border-white/10" {...props}>
                    {children}
                  </code>
                ),
              a: ({ children, ...props }) => (
                <a className={`underline ${isUser ? 'text-blue-100 hover:text-white' : 'text-blue-300 hover:text-blue-200'}`} {...props}>
                  {children}
                </a>
              ),
            }}
          >
            {displayContent}
          </ReactMarkdown>
        </div>

        {/* 折叠/展开按钮 */}
        {needsCollapse && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={`flex items-center gap-1 text-xs mt-2 ${
              isUser ? 'text-blue-100 hover:text-white' : 'text-gray-300 hover:text-white'
            } transition-colors`}
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-3 h-3" />
                收起
              </>
            ) : (
              <>
                <ChevronDown className="w-3 h-3" />
                展开 ({lineCount - 5} 行)
              </>
            )}
          </button>
        )}

        {/* 时间戳 */}
        <div className={`text-xs mt-2 ${isUser ? 'text-blue-100/80' : 'text-gray-400'}`}>
          {new Date(message.timestamp).toLocaleTimeString()}
        </div>

        {/* 状态 */}
        {message.status && (
          <div className={`text-xs mt-1 ${isUser ? 'text-blue-100/80' : 'text-gray-400'}`}>
            {message.status === 'sending' && '发送中...'}
            {message.status === 'error' && '发送失败'}
          </div>
        )}
      </div>
    </div>
  );
});
