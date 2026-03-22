'use client';

import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import Editor from '@monaco-editor/react';
import { FileText, Save, Play, X, Loader2, Eye, Pencil } from 'lucide-react';
import { ChatMessage } from './types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { MechButton } from '../ui/SkeuoUI';
import 'highlight.js/styles/github-dark.css';

interface PlanEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  message: ChatMessage;
  agentId: number;
  sessionId: string;
}

export function PlanEditorDialog({ 
  open, 
  onOpenChange, 
  message, 
  agentId, 
  sessionId 
}: PlanEditorDialogProps) {
  const [content, setContent] = useState(message.content);
  const [isSaving, setIsSaving] = useState(false);
  const [filePath, setFilePath] = useState<string | null>(message.file_path || null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [mode, setMode] = useState<'preview' | 'edit'>('preview');

  // 当 message 更新时同步内容
  useEffect(() => {
    setContent(message.content);
    setFilePath(message.file_path || null);
    setHasUnsavedChanges(false);
  }, [message.content, message.file_path]);

  // 内容变化时标记为未保存
  const handleContentChange = (value: string | undefined) => {
    setContent(value || '');
    setHasUnsavedChanges(true);
  };

  // 保存到文件
  const handleSave = async () => {
    if (!agentId || !sessionId) {
      console.error('Missing agentId or sessionId');
      return;
    }

    setIsSaving(true);
    try {
      if (filePath) {
        // 更新现有文件
        const filename = filePath.split('/').pop();
        const res = await fetch(`/api/agents/${agentId}/plans/${sessionId}/${filename}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content })
        });
        
        if (res.ok) {
          setHasUnsavedChanges(false);
          console.log('Plan updated successfully');
        }
      } else {
        // 首次保存
        const res = await fetch(`/api/agents/${agentId}/plans/save`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id: sessionId,
            message_id: message.id,
            content,
            content_type: message.content_type || 'conversation'
          })
        });
        
        if (res.ok) {
          const data = await res.json();
          setFilePath(data.file_path);
          setHasUnsavedChanges(false);
          console.log('Plan saved to:', data.file_path);
        }
      }
    } catch (err) {
      console.error('Failed to save plan:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // 执行此计划（暂时将内容发送给 Agent）
  const handleExecute = () => {
    // TODO: 实现执行逻辑
    // 可以将编辑后的内容作为新 prompt 发送给 Agent
    console.log('Execute plan:', content.substring(0, 100));
  };

  const titleText = message.content_type === 'plan' ? '完整计划' :
                    message.content_type === 'report' ? '完整报告' :
                    '详细内容';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90vw] lg:max-w-[900px] h-[85vh] flex flex-col bg-[#0f111a] border border-white/20 p-0">
        {/* 顶部工具栏 */}
        <DialogHeader className="px-6 py-4 border-b border-white/10 flex flex-row items-center justify-between">
          <DialogTitle className="text-xl font-bold text-white flex items-center gap-2 m-0">
            <FileText className="w-5 h-5 text-blue-400" />
            {titleText}
            {hasUnsavedChanges && (
              <span className="text-xs text-yellow-400 font-normal">（未保存）</span>
            )}
          </DialogTitle>
          
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-white/5 rounded-lg p-0.5">
              <button
                onClick={() => setMode('preview')}
                className={`px-3 py-1 text-xs rounded-md transition-colors flex items-center gap-1 ${
                  mode === 'preview' ? 'bg-indigo-500/30 text-indigo-300' : 'text-gray-400 hover:text-white'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                预览
              </button>
              <button
                onClick={() => setMode('edit')}
                className={`px-3 py-1 text-xs rounded-md transition-colors flex items-center gap-1 ${
                  mode === 'edit' ? 'bg-indigo-500/30 text-indigo-300' : 'text-gray-400 hover:text-white'
                }`}
              >
                <Pencil className="w-3.5 h-3.5" />
                编辑
              </button>
            </div>

            {mode === 'edit' && (
              <MechButton
                onClick={handleSave}
                disabled={isSaving || !hasUnsavedChanges}
                className="px-3 py-1.5 text-sm"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-1" />
                    保存中...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-1" />
                    保存
                  </>
                )}
              </MechButton>
            )}

            {message.content_type === 'plan' && (
              <MechButton
                onClick={handleExecute}
                className="px-3 py-1.5 text-sm bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-green-500/30"
              >
                <Play className="w-4 h-4 mr-1" />
                执行此计划
              </MechButton>
            )}
          </div>
        </DialogHeader>

        {/* 单栏内容区域 */}
        <div className="flex-1 p-4 overflow-hidden">
          {mode === 'edit' ? (
            <div className="h-full border border-white/10 rounded-lg overflow-hidden bg-[#1e1e1e]">
              <Editor
                height="100%"
                language="markdown"
                theme="vs-dark"
                value={content}
                onChange={handleContentChange}
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  wordWrap: 'on',
                  lineNumbers: 'on',
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  tabSize: 2,
                  renderWhitespace: 'selection',
                  folding: true,
                  lineDecorationsWidth: 10,
                  lineNumbersMinChars: 4,
                }}
              />
            </div>
          ) : (
            <div className="h-full border border-white/10 rounded-lg overflow-y-auto p-6 bg-[#0a0c14]">
              <div className="prose prose-sm prose-invert max-w-none">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeHighlight]}
                  components={{
                    h1: ({ node, ...props }) => <h1 className="text-2xl font-bold mb-4 text-blue-300" {...props} />,
                    h2: ({ node, ...props }) => <h2 className="text-xl font-semibold mt-6 mb-3 text-blue-200" {...props} />,
                    h3: ({ node, ...props }) => <h3 className="text-lg font-medium mt-4 mb-2 text-blue-100" {...props} />,
                    code: ({ node, inline, ...props }) =>
                      inline ? (
                        <code className="bg-blue-500/20 text-blue-200 px-1.5 py-0.5 rounded text-sm" {...props} />
                      ) : (
                        <code className="block bg-[#1e1e1e] p-4 rounded-lg overflow-x-auto text-sm" {...props} />
                      ),
                    ul: ({ node, ...props }) => <ul className="list-disc pl-5 my-3 space-y-1" {...props} />,
                    ol: ({ node, ...props }) => <ol className="list-decimal pl-5 my-3 space-y-1" {...props} />,
                    li: ({ node, ...props }) => <li className="text-gray-200" {...props} />,
                    p: ({ node, ...props }) => <p className="my-2 text-gray-100 leading-relaxed" {...props} />,
                    a: ({ node, ...props }) => <a className="text-blue-400 hover:text-blue-300 underline" {...props} />,
                    blockquote: ({ node, ...props }) => (
                      <blockquote className="border-l-4 border-blue-500 pl-4 my-4 italic text-gray-300" {...props} />
                    ),
                    table: ({ node, ...props }) => (
                      <div className="overflow-x-auto my-4">
                        <table className="min-w-full border border-white/20" {...props} />
                      </div>
                    ),
                    th: ({ node, ...props }) => (
                      <th className="border border-white/20 px-4 py-2 bg-white/5 font-semibold text-left" {...props} />
                    ),
                    td: ({ node, ...props }) => (
                      <td className="border border-white/20 px-4 py-2" {...props} />
                    ),
                  }}
                >
                  {content}
                </ReactMarkdown>
              </div>
            </div>
          )}
        </div>

        {/* 底部提示栏 */}
        {filePath && (
          <div className="px-6 py-2 border-t border-white/10 text-xs text-gray-400">
            文件路径: {filePath}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
