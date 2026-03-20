import { useState, useEffect } from 'react';

/**
 * iOS Safari visualViewport hook
 * 监听键盘弹起/收起，计算键盘高度和输入栏偏移
 */
export function useVisualViewport() {
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    // 检查 visualViewport 支持（iOS 13+）
    if (!window.visualViewport) {
      console.warn('[useVisualViewport] visualViewport not supported');
      return;
    }

    let rafId: number;

    const handleViewportChange = () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
      }

      rafId = requestAnimationFrame(() => {
        const vv = window.visualViewport!;
        const vvHeight = vv.height;
        const vvOffsetTop = vv.offsetTop;

        // 计算键盘高度：window.innerHeight - visualViewport.height - visualViewport.offsetTop
        const shiftY = window.innerHeight - vvHeight - vvOffsetTop;
        const calculatedKeyboardHeight = Math.max(0, shiftY);

        setKeyboardHeight(calculatedKeyboardHeight);
        setIsKeyboardVisible(calculatedKeyboardHeight > 50); // 50px 阈值避免误判

        console.log('[useVisualViewport] Viewport changed:', {
          windowHeight: window.innerHeight,
          vvHeight,
          vvOffsetTop,
          keyboardHeight: calculatedKeyboardHeight,
          isVisible: calculatedKeyboardHeight > 50
        });
      });
    };

    // 监听 resize 和 scroll 事件
    window.visualViewport.addEventListener('resize', handleViewportChange);
    window.visualViewport.addEventListener('scroll', handleViewportChange);

    // 初始化
    handleViewportChange();

    return () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
      window.visualViewport?.removeEventListener('resize', handleViewportChange);
      window.visualViewport?.removeEventListener('scroll', handleViewportChange);
    };
  }, []);

  return {
    keyboardHeight,
    isKeyboardVisible
  };
}
