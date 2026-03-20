/**
 * 骨架屏组件
 * 用于在数据加载时显示占位符，提升感知性能
 */

import React from 'react';

interface SkeletonProps {
  className?: string;
  width?: string;
  height?: string;
  variant?: 'text' | 'circular' | 'rectangular';
}

/**
 * 基础骨架屏组件
 */
export function Skeleton({ className = '', width, height, variant = 'rectangular' }: SkeletonProps) {
  const baseClass = 'animate-pulse bg-gray-700/50 rounded';
  const variantClass = {
    text: 'h-4 rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
  }[variant];

  const style: React.CSSProperties = {
    width: width || '100%',
    height: height || (variant === 'text' ? '1rem' : '100%'),
  };

  return <div className={`${baseClass} ${variantClass} ${className}`} style={style} />;
}

/**
 * 卡片骨架屏
 */
export function CardSkeleton({ count = 1 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="bg-gray-800/50 rounded-lg p-6 space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex-1 space-y-2">
              <Skeleton width="60%" height="24px" />
              <Skeleton width="40%" height="16px" />
            </div>
            <Skeleton variant="circular" width="40px" height="40px" />
          </div>
          <Skeleton width="100%" height="60px" />
          <div className="flex gap-2">
            <Skeleton width="80px" height="24px" />
            <Skeleton width="80px" height="24px" />
            <Skeleton width="80px" height="24px" />
          </div>
        </div>
      ))}
    </>
  );
}

/**
 * 列表骨架屏
 */
export function ListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="bg-gray-800/50 rounded-lg p-4 flex items-center gap-4">
          <Skeleton variant="circular" width="48px" height="48px" />
          <div className="flex-1 space-y-2">
            <Skeleton width="40%" height="20px" />
            <Skeleton width="60%" height="16px" />
          </div>
          <Skeleton width="100px" height="32px" />
        </div>
      ))}
    </div>
  );
}

/**
 * 表格骨架屏
 */
export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="bg-gray-800/50 rounded-lg overflow-hidden">
      {/* 表头 */}
      <div className="border-b border-gray-700 p-4 flex gap-4">
        {Array.from({ length: columns }).map((_, index) => (
          <Skeleton key={index} width={`${100 / columns}%`} height="20px" />
        ))}
      </div>
      {/* 表格行 */}
      <div className="divide-y divide-gray-700">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="p-4 flex gap-4">
            {Array.from({ length: columns }).map((_, colIndex) => (
              <Skeleton key={colIndex} width={`${100 / columns}%`} height="16px" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Dashboard 统计卡片骨架屏
 */
export function StatCardSkeleton({ count = 4 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="bg-gray-800/50 rounded-lg p-6 space-y-3">
          <Skeleton width="50%" height="16px" />
          <Skeleton width="40%" height="32px" />
          <Skeleton width="60%" height="14px" />
        </div>
      ))}
    </>
  );
}

/**
 * 页面加载骨架屏（全屏）
 */
export function PageSkeleton() {
  return (
    <div className="space-y-6 p-6">
      {/* 页面标题 */}
      <div className="space-y-2">
        <Skeleton width="30%" height="32px" />
        <Skeleton width="50%" height="20px" />
      </div>
      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCardSkeleton count={4} />
      </div>
      {/* 内容区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <CardSkeleton count={3} />
        </div>
        <div>
          <ListSkeleton count={5} />
        </div>
      </div>
    </div>
  );
}

