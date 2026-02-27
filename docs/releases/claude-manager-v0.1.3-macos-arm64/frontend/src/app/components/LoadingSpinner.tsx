import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  fullScreen?: boolean;
}

/**
 * 统一的加载动画组件
 */
export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  text,
  fullScreen = false,
}) => {
  const sizeClasses = {
    sm: 'h-6 w-6 border-2',
    md: 'h-12 w-12 border-2',
    lg: 'h-16 w-16 border-3',
  };

  const containerClasses = fullScreen
    ? 'fixed inset-0 flex items-center justify-center bg-[#1a1b26]/80 backdrop-blur-sm z-50'
    : 'flex items-center justify-center h-96';

  return (
    <div className={containerClasses}>
      <div className="text-center">
        <div
          className={`${sizeClasses[size]} animate-spin rounded-full border-blue-500 border-t-transparent mx-auto mb-4`}
        />
        {text && <p className="text-gray-400 text-sm">{text}</p>}
      </div>
    </div>
  );
};

/**
 * 骨架屏加载组件
 */
export const SkeletonCard: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`animate-pulse ${className}`}>
      <div className="h-full bg-white/5 rounded-2xl border border-white/10 p-6">
        <div className="h-4 bg-white/10 rounded w-1/3 mb-4" />
        <div className="h-8 bg-white/10 rounded w-1/2 mb-2" />
        <div className="h-3 bg-white/10 rounded w-2/3" />
      </div>
    </div>
  );
};

/**
 * 列表项骨架屏
 */
export const SkeletonListItem: React.FC = () => {
  return (
    <div className="animate-pulse flex items-center gap-4 p-4 rounded-xl bg-white/5">
      <div className="w-10 h-10 bg-white/10 rounded-lg" />
      <div className="flex-1">
        <div className="h-4 bg-white/10 rounded w-1/3 mb-2" />
        <div className="h-3 bg-white/10 rounded w-1/2" />
      </div>
      <div className="h-8 w-20 bg-white/10 rounded" />
    </div>
  );
};
