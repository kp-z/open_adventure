import React, { useCallback, useRef, useEffect, useState } from 'react';
import { Terminal } from 'xterm';
import { ChevronUp, ChevronDown, Keyboard, X } from 'lucide-react';

interface MobileScrollButtonsProps {
  terminal: Terminal;
  containerRef: React.RefObject<HTMLDivElement>;
  className?: string;
  isInputMode?: boolean;
  onToggleInputMode?: () => void;
}

// 双击检测阈值
const DOUBLE_CLICK_THRESHOLD = 300; // ms
// 长按检测阈值
const LONG_PRESS_THRESHOLD = 300; // ms

export const MobileScrollButtons: React.FC<MobileScrollButtonsProps> = ({
  terminal,
  containerRef,
  className = '',
  isInputMode = false,
  onToggleInputMode,
}) => {
  const scrollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isScrollingRef = useRef(false);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressRef = useRef(false);

  // 双击检测状态
  const [lastUpClickTime, setLastUpClickTime] = useState(0);
  const [lastDownClickTime, setLastDownClickTime] = useState(0);

  // 清理滚动定时器
  const clearScrollInterval = useCallback(() => {
    if (scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current);
      scrollIntervalRef.current = null;
    }
    isScrollingRef.current = false;
  }, []);

  // 清理长按定时器
  const clearLongPressTimer = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    isLongPressRef.current = false;
  }, []);

  // 滚动一行
  const scrollOneLine = useCallback((direction: 'up' | 'down') => {
    if (!terminal) return;

    const scrollStep = direction === 'up' ? -1 : 1;
    const currentScrollTop = terminal.buffer.active.viewportY;
    const maxScrollTop = terminal.buffer.active.length - terminal.rows;
    const newScrollTop = Math.max(0, Math.min(maxScrollTop, currentScrollTop + scrollStep));
    terminal.scrollToLine(newScrollTop);
  }, [terminal]);

  // 开始连续滚动（长按）
  const startContinuousScroll = useCallback((direction: 'up' | 'down') => {
    if (!terminal || isScrollingRef.current) return;

    clearScrollInterval();
    isScrollingRef.current = true;

    const scrollStep = direction === 'up' ? -1 : 1;
    const scrollSpeed = 50; // 50ms 间隔

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
  const handleButtonDown = useCallback((direction: 'up' | 'down') => {
    clearLongPressTimer();

    // 设置长按计时器
    longPressTimerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      startContinuousScroll(direction);
    }, LONG_PRESS_THRESHOLD);
  }, [clearLongPressTimer, startContinuousScroll]);

  // 处理按钮抬起（包含单击和双击检测）
  const handleButtonUp = useCallback((direction: 'up' | 'down') => {
    clearLongPressTimer();
    clearScrollInterval();

    // 如果是长按，已经处理过滚动，直接返回
    if (isLongPressRef.current) {
      isLongPressRef.current = false;
      return;
    }

    // 单击/双击检测
    const now = Date.now();

    if (direction === 'up') {
      if (now - lastUpClickTime < DOUBLE_CLICK_THRESHOLD) {
        // 双击：滚动到顶部
        scrollToTop();
        setLastUpClickTime(0); // 重置
      } else {
        // 单击：滚动一行
        scrollOneLine('up');
        setLastUpClickTime(now);
      }
    } else {
      if (now - lastDownClickTime < DOUBLE_CLICK_THRESHOLD) {
        // 双击：滚动到底部
        scrollToBottom();
        setLastDownClickTime(0); // 重置
      } else {
        // 单击：滚动一行
        scrollOneLine('down');
        setLastDownClickTime(now);
      }
    }
  }, [
    clearLongPressTimer,
    clearScrollInterval,
    lastUpClickTime,
    lastDownClickTime,
    scrollToTop,
    scrollToBottom,
    scrollOneLine,
  ]);

  // 清理副作用
  useEffect(() => {
    return () => {
      clearScrollInterval();
      clearLongPressTimer();
    };
  }, [clearScrollInterval, clearLongPressTimer]);

  // 监听全局鼠标/触摸结束事件
  useEffect(() => {
    const handleEnd = () => {
      clearScrollInterval();
      clearLongPressTimer();
    };

    document.addEventListener('mouseup', handleEnd);
    document.addEventListener('touchend', handleEnd);
    document.addEventListener('touchcancel', handleEnd);

    return () => {
      document.removeEventListener('mouseup', handleEnd);
      document.removeEventListener('touchend', handleEnd);
      document.removeEventListener('touchcancel', handleEnd);
    };
  }, [clearScrollInterval, clearLongPressTimer]);

  return (
    <div className={`
      fixed right-2 top-1/2 -translate-y-1/2
      flex flex-col gap-1.5
      z-[9998]
      pointer-events-auto
      md:hidden
      ${className}
    `}>
      {/* 向上滚动按钮 - 单击滚动一行，双击到顶，长按连续滚动 */}
      <button
        className="
          w-10 h-10
          bg-black/40 hover:bg-black/60 active:bg-black/80
          backdrop-blur-sm
          border border-white/15 hover:border-white/30
          rounded-xl
          flex items-center justify-center
          text-white/70 hover:text-white
          transition-all duration-150
          touch-manipulation
        "
        onMouseDown={() => handleButtonDown('up')}
        onMouseUp={() => handleButtonUp('up')}
        onTouchStart={() => handleButtonDown('up')}
        onTouchEnd={() => handleButtonUp('up')}
        title="单击↑ / 双击到顶 / 长按连续"
      >
        <ChevronUp size={18} />
      </button>

      {/* 向下滚动按钮 - 单击滚动一行，双击到底，长按连续滚动 */}
      <button
        className="
          w-10 h-10
          bg-black/40 hover:bg-black/60 active:bg-black/80
          backdrop-blur-sm
          border border-white/15 hover:border-white/30
          rounded-xl
          flex items-center justify-center
          text-white/70 hover:text-white
          transition-all duration-150
          touch-manipulation
        "
        onMouseDown={() => handleButtonDown('down')}
        onMouseUp={() => handleButtonUp('down')}
        onTouchStart={() => handleButtonDown('down')}
        onTouchEnd={() => handleButtonUp('down')}
        title="单击↓ / 双击到底 / 长按连续"
      >
        <ChevronDown size={18} />
      </button>

      {/* 键盘控制按钮 - 折叠/展开输入模式 */}
      {onToggleInputMode && (
        <button
          className={`
            w-10 h-10
            backdrop-blur-sm
            border
            rounded-xl
            flex items-center justify-center
            transition-all duration-150
            touch-manipulation
            ${isInputMode
              ? 'bg-blue-500/60 hover:bg-blue-500/80 border-blue-400/50 text-white'
              : 'bg-black/40 hover:bg-black/60 border-white/15 hover:border-white/30 text-white/70 hover:text-white'
            }
          `}
          onClick={onToggleInputMode}
          title={isInputMode ? '收起键盘' : '展开键盘'}
        >
          {isInputMode ? <X size={18} /> : <Keyboard size={18} />}
        </button>
      )}
    </div>
  );
};
