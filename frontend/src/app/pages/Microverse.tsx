import React, { useState, useRef, useEffect } from 'react';
import { LoadingSpinner } from '../components/LoadingSpinner';

export default function Microverse() {
  const [isLoading, setIsLoading] = useState(true);
  const [loadingText, setLoadingText] = useState('正在启动游戏模式...');
  const [loadingProgress, setLoadingProgress] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    // 监听来自游戏的消息
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'godot-loading') {
        const { status, percentage, current, total } = event.data;

        switch (status) {
          case 'start':
            setLoadingText('初始化游戏引擎...');
            break;
          case 'progress':
            setLoadingText(`加载游戏资源... ${percentage || 0}%`);
            setLoadingProgress(percentage || 0);
            break;
          case 'complete':
            setLoadingText('准备游戏画布...');
            // 游戏加载完成，强制刷新画布
            setTimeout(() => {
              forceCanvasResize();
              setIsLoading(false);
            }, 500);
            break;
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  useEffect(() => {
    // 模拟初始加载过程
    const loadingSteps = [
      { text: '正在启动游戏模式...', delay: 0 },
      { text: '连接游戏服务器...', delay: 800 },
    ];

    loadingSteps.forEach(({ text, delay }) => {
      setTimeout(() => {
        setLoadingText(text);
      }, delay);
    });
  }, []);

  const forceCanvasResize = () => {
    if (iframeRef.current?.contentWindow) {
      try {
        // 发送多种刷新消息确保游戏画布正确调整大小
        const messages = [
          { type: 'REFRESH_CANVAS' },
          { type: 'RESIZE_CANVAS' },
          { type: 'FORCE_RESIZE' }
        ];

        messages.forEach(message => {
          iframeRef.current?.contentWindow?.postMessage(message, '*');
        });

        // 强制触发 iframe 的 resize 事件
        const iframe = iframeRef.current;
        if (iframe) {
          const originalWidth = iframe.style.width;
          const originalHeight = iframe.style.height;

          // 临时改变尺寸再恢复，触发重新计算
          iframe.style.width = '99.9%';
          iframe.style.height = '99.9%';

          setTimeout(() => {
            iframe.style.width = originalWidth || '100%';
            iframe.style.height = originalHeight || '100%';

            // 再次发送 resize 事件
            iframe.contentWindow?.postMessage({ type: 'CANVAS_RESIZE_COMPLETE' }, '*');
          }, 50);
        }
      } catch (error) {
        console.log('游戏画布刷新完成');
      }
    }
  };

  const handleIframeLoad = () => {
    // iframe DOM 加载完成，但游戏可能还在加载
    setLoadingText('等待游戏初始化...');

    // 如果 5 秒后还没收到游戏的加载消息，就强制完成加载
    setTimeout(() => {
      if (isLoading) {
        setLoadingText('启动游戏...');
        forceCanvasResize();
        setTimeout(() => setIsLoading(false), 1000);
      }
    }, 5000);
  };

  const handleIframeError = () => {
    setLoadingText('游戏加载失败，请刷新页面重试');
    setTimeout(() => {
      setIsLoading(false);
    }, 1000);
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      {/* 加载界面 */}
      {isLoading && (
        <div className="absolute inset-0 z-10 bg-[#0f111a]">
          <LoadingSpinner
            size="lg"
            text={loadingProgress > 0 ? `${loadingText}` : loadingText}
            fullScreen={true}
          />
          {loadingProgress > 0 && (
            <div className="absolute bottom-1/3 left-1/2 transform -translate-x-1/2 w-64">
              <div className="w-full bg-white/10 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${loadingProgress}%` }}
                />
              </div>
              <p className="text-center text-sm text-gray-400 mt-2">
                {loadingProgress}%
              </p>
            </div>
          )}
        </div>
      )}

      {/* 游戏 iframe */}
      <iframe
        ref={iframeRef}
        src="/microverse/index.html"
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          display: 'block',
          opacity: isLoading ? 0 : 1,
          transition: 'opacity 0.5s ease-in-out'
        }}
        title="Microverse Game"
        allow="autoplay; fullscreen"
        onLoad={handleIframeLoad}
        onError={handleIframeError}
      />
    </div>
  );
}
