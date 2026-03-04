import React from 'react';

interface TagBadgeProps {
  tag: string;
  dimension?: string;
  onRemove?: () => void;
  size?: 'sm' | 'md';
}

export const TagBadge: React.FC<TagBadgeProps> = ({
  tag,
  dimension,
  onRemove,
  size = 'md'
}) => {
  // 根据维度返回不同颜色
  const getColorClass = () => {
    if (!dimension) {
      // 如果没有维度信息，根据标签内容推断
      if (tag.includes('bash') || tag.includes('git') || tag.includes('文件') || tag.includes('搜索')) {
        return 'bg-blue-100 text-blue-800 border-blue-200';
      }
      if (tag.includes('API')) {
        return 'bg-purple-100 text-purple-800 border-purple-200';
      }
      if (tag.includes('安全') || tag.includes('风险')) {
        return 'bg-green-100 text-green-800 border-green-200';
      }
      if (tag.includes('规划') || tag.includes('开发') || tag.includes('测试')) {
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      }
      if (tag.includes('链路') || tag.includes('即时') || tag.includes('交互')) {
        return 'bg-pink-100 text-pink-800 border-pink-200';
      }
      if (tag.includes('代码') || tag.includes('文档') || tag.includes('重构')) {
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      }
      return 'bg-gray-100 text-gray-800 border-gray-200';
    }

    // 根据维度返回颜色
    switch (dimension) {
      case '工具':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'API':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case '危险性':
        return 'bg-green-100 text-green-800 border-green-200';
      case '阶段':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case '链路':
        return 'bg-pink-100 text-pink-800 border-pink-200';
      case '功能':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case '范围':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const sizeClass = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-2.5 py-1';

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border font-medium ${getColorClass()} ${sizeClass}`}
    >
      {tag}
      {onRemove && (
        <button
          onClick={onRemove}
          className="ml-0.5 hover:bg-black/10 rounded-full p-0.5 transition-colors"
          aria-label={`移除标签 ${tag}`}
        >
          <svg
            className="w-3 h-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}
    </span>
  );
};
