import React, { useCallback, useRef, useEffect } from 'react';
import { Terminal } from 'xterm';
import { ChevronUp, ChevronDown, ArrowUp, ArrowDown } from 'lucide-react';

interface MobileScrollButtonsProps {
  terminal: Terminal;
  containerRef: React.RefObject<HTMLDivElement>;
  className?: string;
}

export const MobileScrollButtons: React.FC<MobileScrollButtonsProps> = ({
  terminal,
  containerRef,
  className = ''
}) => {
  const scrollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isScrollingRef = useRef(false);

  // 清理滚动定时器
  const clearScrollInterval = useCallback(() => {
    if (scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current);
      scrollIntervalRef.current = null;
    }
    isScrollingRef.current = false;
  }, []);

  // 开始连续滚动
  const startContinuousScroll = useCallback((direction: 'up' | 'down') => {
    if (!terminal || isScrollingRef.current) return;

    clearScrollInterval();
    isScrollingRef.current = true;

    const scrollStep = direction === 'up' ? -1 : 1;
    const scrollSpeed = 50; // 50ms 间隔，调整速度

    // 立即执行一次
    const currentScrollTop = terminal.buffer.active.viewportY;
    const newScrollTop = Math.max(0, Math.min(
      terminal.buffer.active.length - terminal.rows,
      currentScrollTop + scrollStep
    ));
    terminal.scrollToLine(newScrollTop);

    // 设置连续滚动
    scrollIntervalRef.current = setInterval(() => {
      const currentScrollTop = terminal.buffer.active.viewportY;
      const maxScrollTop = terminal.buffer.active.length - terminal.rows;

      if ((direction === 'up' && currentScrollTop <= 0) ||
          (direction === 'down' && currentScrollTop >= maxScrollTop)) {
        clearScrollInterval();
        return;
      }

      const newScrollTop = Math.max(0, Math.min(maxScrollTop, currentScrollTop + scrollStep));
      terminal.scrollToLine(newScrollTop);
    }, scrollSpeed);
  }, [terminal, clearScrollInterval]);

  // 滚动到顶部
  const scrollToTop = useCallback(() => {
    if (!terminal) return;
    terminal.scrollToTop();
  }, [terminal]);

  // 滚动到底部
  const scrollToBottom = useCallback(() => {
    if (!terminal) return;
    terminal.scrollToBottom();
  }, [terminal]);

  // 处理按钮按下
  const handleMouseDown = useCallback((action: 'up' | 'down' | 'top' | 'bottom') => {
    switch (action) {
      case 'up':
        startContinuousScroll('up');
        break;
      case 'down':
        startContinuousScroll('down');
        break;
      case 'top':
        scrollToTop();
        break;
      case 'bottom':
        scrollToBottom();
        break;
    }
  }, [startContinuousScroll, scrollToTop, scrollToBottom]);

  // 处理触摸开始
  const handleTouchStart = useCallback((action: 'up' | 'down' | 'top' | 'bottom') => {
    handleMouseDown(action);
  }, [handleMouseDown]);

  // 清理副作用
  useEffect(() => {
    return () => {
      clearScrollInterval();
    };
  }, [clearScrollInterval]);

  // 监听鼠标抬起和触摸结束事件
  useEffect(() => {
    const handleMouseUp = () => clearScrollInterval();
    const handleTouchEnd = () => clearScrollInterval();

    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('touchend', handleTouchEnd);
    document.addEventListener('touchcancel', handleTouchEnd);

    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [clearScrollInterval]);

  return (
    <div className={`
      fixed right-1 top-1/2 -translate-y-1/2
      flex flex-col gap-2
      z-50
      md:hidden
      ${className}
    `}>
      {/* 滚动到顶部 */}
      <button
        className="
          w-12 h-12
          bg-black/30 hover:bg-black/50 active:bg-black/70
          backdrop-blur-sm
          border border-white/20 hover:border-white/40
          rounded-xl
          flex items-center justify-center
          text-white/80 hover:text-white
          transition-all duration-200
          touch-manipulation
        "
        onMouseDown={() => handleMouseDown('top')}
        onTouchStart={() => handleTouchStart('top')}
        title="滚动到顶部"
      >
        <ArrowUp size={20} />
      </button>

      {/* 连续向上滚动 */}
      <button
        className="
          w-12 h-16
          bg-black/30 hover:bg-black/50 active:bg-black/70
          backdrop-blur-sm
          border border-white/20 hover:border-white/40
          rounded-xl
          flex items-center justify-center
          text-white/80 hover:text-white
          transition-all duration-200
          touch-manipulation
        "
        onMouseDown={() => handleMouseDown('up')}
        onTouchStart={() => handleTouchStart('up')}
        title="按住向上滚动"
      >
        <ChevronUp size={20} />
      </button>

      {/* 连续向下滚动 */}
      <button
        className="
          w-12 h-16
          bg-black/30 hover:bg-black/50 active:bg-black/70
          backdrop-blur-sm
          border border-white/20 hover:border-white/40
          rounded-xl
          flex items-center justify-center
          text-white/80 hover:text-white
          transition-all duration-200
          touch-manipulation
        "
        onMouseDown={() => handleMouseDown('down')}
        onTouchStart={() => handleTouchStart('down')}
        title="按住向下滚动"
      >
        <ChevronDown size={20} />
      </button>

      {/* 滚动到底部 */}
      <button
        className="
          w-12 h-12
          bg-black/30 hover:bg-black/50 active:bg-black/70
          backdrop-blur-sm
          border border-white/20 hover:border-white/40
          rounded-xl
          flex items-center justify-center
          text-white/80 hover:text-white
          transition-all duration-200
          touch-manipulation
        "
        onMouseDown={() => handleMouseDown('bottom')}
        onTouchStart={() => handleTouchStart('bottom')}
        title="滚动到底部"
      >
        <ArrowDown size={20} />
      </button>
    </div>
  );
};