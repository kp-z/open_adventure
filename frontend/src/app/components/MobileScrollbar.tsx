import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Terminal } from 'xterm';
import './MobileScrollbar.css';

interface MobileScrollbarProps {
  terminal: Terminal;
  containerRef: React.RefObject<HTMLDivElement>;
  className?: string;
}

export const MobileScrollbar: React.FC<MobileScrollbarProps> = ({
  terminal,
  containerRef,
  className = ''
}) => {
  const scrollbarRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isVisible, setIsVisible] = useState(true); // 默认显示
  const [debugMode] = useState(false); // 关闭调试模式
  const [scrollInfo, setScrollInfo] = useState({
    scrollTop: 0,
    scrollHeight: 0,
    clientHeight: 0,
    thumbHeight: 0,
    thumbTop: 0,
    canScroll: false,
    scrollPercent: 0
  });

  // 计算滚动信息
  const updateScrollInfo = useCallback(() => {
    if (!terminal || !scrollbarRef.current || !containerRef.current) {
      console.log('[MobileScrollbar] Missing refs:', {
        terminal: !!terminal,
        scrollbarRef: !!scrollbarRef.current,
        containerRef: !!containerRef.current
      });
      return;
    }

    const buffer = terminal.buffer.active;
    const viewport = terminal.rows;
    const totalLines = buffer.length;
    const scrollTop = terminal.buffer.active.viewportY;
    const canScroll = totalLines > viewport;

    console.log('[MobileScrollbar] Scroll info:', {
      viewport,
      totalLines,
      scrollTop,
      canScroll
    });

    // 在调试模式下，即使不能滚动也显示滚动条
    if (!canScroll && !debugMode) {
      setScrollInfo(prev => ({ ...prev, canScroll: false }));
      setIsVisible(false);
      return;
    }

    // 获取容器高度
    const containerHeight = containerRef.current.clientHeight;
    const scrollbarHeight = Math.min(containerHeight - 32, 400); // 减去上下边距

    // 计算滚动条拇指
    const scrollRatio = canScroll ? viewport / totalLines : 0.5; // 调试模式下固定比例
    const thumbHeight = Math.max(scrollbarHeight * scrollRatio, 40); // 最小40px
    const maxThumbTop = scrollbarHeight - thumbHeight;
    const scrollProgress = canScroll ? scrollTop / (totalLines - viewport) : 0;
    const thumbTop = maxThumbTop * scrollProgress;
    const scrollPercent = Math.round(scrollProgress * 100);

    setScrollInfo({
      scrollTop,
      scrollHeight: totalLines,
      clientHeight: viewport,
      thumbHeight,
      thumbTop,
      canScroll: canScroll || debugMode, // 调试模式下强制可滚动
      scrollPercent
    });

    setIsVisible(true);
  }, [terminal, containerRef, debugMode]);

  // 监听终端事件
  useEffect(() => {
    if (!terminal) return;

    let timeoutId: NodeJS.Timeout;

    const handleUpdate = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(updateScrollInfo, 50);
    };

    // 监听各种终端事件
    const disposables = [
      terminal.onData(handleUpdate),
      terminal.onScroll(handleUpdate),
      terminal.onResize(handleUpdate)
    ];

    // 监听窗口大小变化
    const handleResize = () => handleUpdate();
    window.addEventListener('resize', handleResize);

    // 初始化
    updateScrollInfo();

    return () => {
      clearTimeout(timeoutId);
      disposables.forEach(d => d.dispose());
      window.removeEventListener('resize', handleResize);
    };
  }, [terminal, updateScrollInfo]);

  // 处理拇指拖拽（鼠标）
  const handleThumbMouseDown = useCallback((e: React.MouseEvent) => {
    console.log('[MobileScrollbar] Mouse down on thumb');
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);

    const startY = e.clientY;
    const startScrollTop = scrollInfo.scrollTop;
    const maxScrollTop = scrollInfo.scrollHeight - scrollInfo.clientHeight;

    const handleMouseMove = (e: MouseEvent) => {
      if (!scrollbarRef.current || !terminal || maxScrollTop <= 0) return;

      const deltaY = e.clientY - startY;
      const scrollbarHeight = scrollbarRef.current.clientHeight;

      // 直接根据鼠标移动距离计算滚动位置，提高跟手性
      const scrollSensitivity = maxScrollTop / scrollbarHeight;
      const newScrollTop = Math.max(0, Math.min(maxScrollTop, startScrollTop + deltaY * scrollSensitivity));

      console.log('[MobileScrollbar] Mouse drag:', { deltaY, newScrollTop, maxScrollTop });
      terminal.scrollToLine(Math.round(newScrollTop));
    };

    const handleMouseUp = () => {
      console.log('[MobileScrollbar] Mouse up');
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [terminal, scrollInfo]);

  // 处理拇指触摸拖拽
  const handleThumbTouchStart = useCallback((e: React.TouchEvent) => {
    console.log('[MobileScrollbar] Touch start on thumb');
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);

    const startY = e.touches[0].clientY;
    const startScrollTop = scrollInfo.scrollTop;
    const maxScrollTop = scrollInfo.scrollHeight - scrollInfo.clientHeight;

    const handleTouchMove = (e: TouchEvent) => {
      if (!scrollbarRef.current || !terminal || maxScrollTop <= 0) return;

      const deltaY = e.touches[0].clientY - startY;
      const scrollbarHeight = scrollbarRef.current.clientHeight;

      // 直接根据触摸移动距离计算滚动位置，提高跟手性
      const scrollSensitivity = maxScrollTop / scrollbarHeight;
      const newScrollTop = Math.max(0, Math.min(maxScrollTop, startScrollTop + deltaY * scrollSensitivity));

      console.log('[MobileScrollbar] Touch drag:', { deltaY, newScrollTop, maxScrollTop });
      terminal.scrollToLine(Math.round(newScrollTop));
    };

    const handleTouchEnd = () => {
      console.log('[MobileScrollbar] Touch end on thumb');
      setIsDragging(false);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };

    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);
  }, [terminal, scrollInfo]);

  // 处理触摸滚动
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    console.log('[MobileScrollbar] Touch start');
    if (!terminal || (!scrollInfo.canScroll && !debugMode)) return;

    e.preventDefault();
    setIsDragging(true);

    const startY = e.touches[0].clientY;
    const startScrollTop = scrollInfo.scrollTop;

    const handleTouchMove = (e: TouchEvent) => {
      if (!scrollbarRef.current) return;

      const deltaY = e.touches[0].clientY - startY;
      const scrollbarHeight = scrollbarRef.current.clientHeight;

      // 计算滚动敏感度
      const sensitivity = (scrollInfo.scrollHeight - scrollInfo.clientHeight) / scrollbarHeight;
      const newScrollTop = Math.max(0, Math.min(
        scrollInfo.scrollHeight - scrollInfo.clientHeight,
        startScrollTop - deltaY * sensitivity
      ));

      console.log('[MobileScrollbar] Touch move:', { deltaY, newScrollTop });
      terminal.scrollToLine(Math.round(newScrollTop));
    };

    const handleTouchEnd = () => {
      console.log('[MobileScrollbar] Touch end');
      setIsDragging(false);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };

    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);
  }, [terminal, scrollInfo, debugMode]);

  // 处理点击滚动
  const handleClick = useCallback((e: React.MouseEvent) => {
    console.log('[MobileScrollbar] Click');
    if (!terminal || !scrollbarRef.current || (!scrollInfo.canScroll && !debugMode)) return;

    const rect = scrollbarRef.current.getBoundingClientRect();
    const clickY = e.clientY - rect.top;
    const scrollbarHeight = rect.height;

    const scrollProgress = clickY / scrollbarHeight;
    const targetScrollTop = Math.round(scrollProgress * (scrollInfo.scrollHeight - scrollInfo.clientHeight));

    console.log('[MobileScrollbar] Click scroll:', { clickY, scrollProgress, targetScrollTop });
    terminal.scrollToLine(targetScrollTop);
  }, [terminal, scrollInfo, debugMode]);

  // 调试模式下不自动隐藏
  useEffect(() => {
    if (debugMode || !isVisible || isDragging) return;

    const hideTimeout = setTimeout(() => {
      setIsVisible(false);
    }, 3000); // 3秒后自动隐藏

    return () => clearTimeout(hideTimeout);
  }, [isVisible, isDragging, scrollInfo.scrollTop, debugMode]);

  // 显示滚动条当有滚动活动时
  useEffect(() => {
    if (scrollInfo.canScroll || debugMode) {
      setIsVisible(true);
    }
  }, [scrollInfo.scrollTop, scrollInfo.canScroll, debugMode]);

  // 调试模式下总是显示
  if (!scrollInfo.canScroll && !debugMode) {
    return null;
  }

  console.log('[MobileScrollbar] Rendering:', {
    isVisible,
    isDragging,
    debugMode,
    scrollInfo
  });

  return (
    <div
      ref={scrollbarRef}
      className={`
        mobile-scrollbar
        ${isVisible ? '' : 'hidden'}
        ${isDragging ? 'dragging' : ''}
        ${debugMode ? 'debug-mode' : ''}
        ${className}
      `}
      onClick={handleClick}
      onTouchStart={handleTouchStart}
    >
      {/* 滚动条拇指 */}
      <div
        className="mobile-scrollbar-thumb"
        style={{
          height: `${scrollInfo.thumbHeight}px`,
          top: `${scrollInfo.thumbTop}px`,
        }}
        onMouseDown={handleThumbMouseDown}
        onTouchStart={handleThumbTouchStart}
      />

      {/* 滚动百分比指示器 */}
      {isDragging && (
        <div className="mobile-scrollbar-indicator">
          {scrollInfo.scrollPercent}%
        </div>
      )}
    </div>
  );
};