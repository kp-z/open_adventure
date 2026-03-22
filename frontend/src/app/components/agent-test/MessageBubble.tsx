'use client';

import React, { memo, useState, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { ChevronDown, ChevronUp, FileText, X, Loader2 } from 'lucide-react';
import { ChatMessage } from './types';
import { looksLikeMarkdown, markdownPlainPreview } from '@/lib/markdownDetect';
import { PlanEditorDialog } from './PlanEditorDialog';
import 'highlight.js/styles/github-dark.css';

interface MessageBubbleProps {
  message: ChatMessage;
  agentId?: number;
  sessionId?: string;
}

export const MessageBubble = memo<MessageBubbleProps>(function MessageBubble({ message, agentId, sessionId }) {
  const isUser = message.role === 'user';
  const [isExpanded, setIsExpanded] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 判断是否为 Agent 的已完成 Markdown 消息
  const isAgentMarkdown = useMemo(() => {
    if (isUser) return false;
    if (message.status === 'sending') return false; // 发送中保持原样
    return looksLikeMarkdown(message.content);
  }, [isUser, message.content, message.status]);

  // 计算消息行数
  const lineCount = useMemo(() => {
    return message.content.split('\n').length;
  }, [message.content]);

  // 是否需要折叠（仅用于非 Markdown 模式）
  const needsCollapse = !isAgentMarkdown && lineCount > 5;

  // 显示的内容
  const displayContent = useMemo(() => {
    if (isAgentMarkdown) {
      // Markdown 模式：显示摘要
      return markdownPlainPreview(message.content, 120);
    }
    if (!needsCollapse || isExpanded) {
      return message.content;
    }
    // 只显示前 5 行
    return message.content.split('\n').slice(0, 5).join('\n');
  }, [message.content, needsCollapse, isExpanded, isAgentMarkdown]);

  return (
    <>
      <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
        <div
          className={`max-w-[70%] rounded-2xl px-4 py-3 shadow-sm ${
            isUser
              ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white'
              : 'bg-white/10 backdrop-blur-sm border border-white/20 text-gray-100'
          }`}
        >
          {/* 内容区域 */}
          {message.status === 'sending' && !isUser ? (
            // 流式发送中：两行展示
            <div className="space-y-2">
              {/* 第一行：状态提示 */}
              <div className="text-xs text-gray-400 flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                {message.streaming_logs && message.streaming_logs.length > 0
                  ? '正在处理...'
                  : '正在准备内容...'}
              </div>
              
              {/* 第二行：流式日志 */}
              {message.streaming_logs && message.streaming_logs.length > 0 && (
                <div className="text-xs text-gray-500 font-mono max-h-20 overflow-y-auto bg-black/20 rounded p-2 border border-white/5">
                  {message.streaming_logs.slice(-5).join('\n')}
                </div>
              )}
              
              {/* 如果有部分内容，也显示 */}
              {message.content && message.content !== '⏳ 正在连接...' && (
                <div className="text-sm text-gray-300 opacity-50">
                  {message.content}
                </div>
              )}
            </div>
          ) : isAgentMarkdown ? (
            // Markdown 摘要模式
            <div className="space-y-2">
              <div className="text-sm text-gray-200">
                {displayContent}
              </div>
              <button
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-1.5 text-xs text-blue-300 hover:text-blue-200 transition-colors"
              >
                <FileText className="w-3.5 h-3.5" />
                {message.content_type === 'plan' ? '查看完整计划' :
                 message.content_type === 'report' ? '查看完整报告' :
                 '查看详情'}
              </button>
            </div>
          ) : (
            // 普通 Markdown 渲染
            <div className={`text-sm prose prose-sm max-w-none ${isUser ? 'prose-invert' : 'prose-invert'}`}>
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeHighlight]}
                components={{
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
          )}

          {/* 折叠/展开按钮（仅非 Markdown 模式） */}
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

          {/* 状态（仅显示错误状态） */}
          {message.status === 'error' && (
            <div className={`text-xs mt-1 ${isUser ? 'text-blue-100/80' : 'text-red-400'}`}>
              发送失败
            </div>
          )}
        </div>
      </div>

      {/* Plan/Report 编辑器弹窗 */}
      {agentId && sessionId && (
        <PlanEditorDialog
          open={isModalOpen}
          onOpenChange={setIsModalOpen}
          message={message}
          agentId={agentId}
          sessionId={sessionId}
        />
      )}
    </>
  );
});
