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
        className={`max-w-[70%] rounded-lg px-4 py-2 ${
          isUser
            ? 'bg-blue-500 text-white'
            : 'bg-gray-200 text-gray-900'
        }`}
      >
        {/* Markdown 渲染 */}
        <div className={`text-sm prose prose-sm max-w-none ${isUser ? 'text-white' : 'text-gray-900'}`}>
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeHighlight]}
            components={{
              // 自定义样式
              p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
              code: ({ inline, children, ...props }: any) =>
                inline ? (
                  <code className={`px-1 py-0.5 rounded ${isUser ? 'bg-blue-600' : 'bg-gray-300'}`} {...props}>
                    {children}
                  </code>
                ) : (
                  <code className="block p-2 rounded bg-gray-800 text-gray-100 overflow-x-auto" {...props}>
                    {children}
                  </code>
                ),
              a: ({ children, ...props }) => (
                <a className={`underline ${isUser ? 'text-blue-100' : 'text-blue-600'}`} {...props}>
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
              isUser ? 'text-blue-100 hover:text-white' : 'text-gray-600 hover:text-gray-900'
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
        <div className={`text-xs mt-1 ${isUser ? 'text-blue-100' : 'text-gray-500'}`}>
          {new Date(message.timestamp).toLocaleTimeString()}
        </div>

        {/* 状态 */}
        {message.status && (
          <div className="text-xs mt-1">
            {message.status === 'sending' && '发送中...'}
            {message.status === 'error' && '发送失败'}
          </div>
        )}
      </div>
    </div>
  );
});
