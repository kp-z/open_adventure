'use client';

import React, { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { claudeApi } from '@/lib/api/services/claude';
import { useNotifications } from '../contexts/NotificationContext';

interface PromptOptimizeButtonProps {
  value: string;
  onChange: (optimized: string) => void;
  context?: string;
  disabled?: boolean;
  className?: string;
  iconOnly?: boolean;
}

export function PromptOptimizeButton({
  value,
  onChange,
  context,
  disabled = false,
  className = '',
  iconOnly = false,
}: PromptOptimizeButtonProps) {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const { addNotification } = useNotifications();

  const handleOptimize = async () => {
    if (!value.trim()) {
      addNotification({
        type: 'error',
        title: 'Prompt 为空',
        message: '请输入 prompt 内容后再优化',
      });
      return;
    }

    setIsOptimizing(true);

    // 添加开始优化的通知
    const notificationId = addNotification({
      type: 'info',
      title: '正在优化 Prompt',
      message: '使用 AI 优化您的 prompt...',
    });

    try {
      const response = await claudeApi.optimizePrompt({
        prompt: value,
        context,
      });

      if (response.success) {
        onChange(response.optimized_prompt);
        addNotification({
          type: 'success',
          title: 'Prompt 优化成功',
          message: '已将优化后的内容填充到输入框',
        });
      } else {
        addNotification({
          type: 'error',
          title: 'Prompt 优化失败',
          message: response.error || '优化过程中发生错误',
        });
      }
    } catch (err) {
      addNotification({
        type: 'error',
        title: 'Prompt 优化失败',
        message: err instanceof Error ? err.message : '网络请求失败',
      });
    } finally {
      setIsOptimizing(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleOptimize}
      disabled={disabled || isOptimizing || !value.trim()}
      className={`
        inline-flex items-center gap-2 rounded-md font-medium
        transition-all duration-200
        ${iconOnly ? 'p-2' : 'px-3 py-1.5 text-sm'}
        bg-gray-100 text-gray-700 hover:bg-purple-100 hover:text-purple-700
        disabled:opacity-50 disabled:cursor-not-allowed
        focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2
        ${className}
      `}
      title="使用 AI 优化 prompt"
    >
      {isOptimizing ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Sparkles className="w-4 h-4" />
      )}
      {!iconOnly && <span>优化</span>}
    </button>
  );
}
