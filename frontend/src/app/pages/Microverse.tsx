import React, { useState, useRef, useEffect, useCallback } from 'react';
import { LoadingScreen } from '../components/LoadingScreen';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography } from '@mui/material';

// localStorage 缓存键
const CACHE_KEY = 'microverse_game_loaded';
const VERSION_KEY = 'microverse_version';

// 版本信息接口
interface VersionInfo {
  exportTime: string;  // 导出时间作为版本标识
  gitCommit?: string;  // Git commit hash
  files?: Array<{ path: string; size: number }>;  // 文件列表
  message?: string;    // 可选的更新说明
}

// 缓存辅助函数
const isGameCached = (): boolean => {
  try {
    return localStorage.getItem(CACHE_KEY) === 'true';
  } catch (error) {
    console.warn('[Microverse] localStorage 访问失败:', error);
    return false;
  }
};

const setGameCached = (cached: boolean): void => {
  try {
    if (cached) {
      localStorage.setItem(CACHE_KEY, 'true');
    } else {
      localStorage.removeItem(CACHE_KEY);
    }
  } catch (error) {
    console.warn('[Microverse] localStorage 写入失败:', error);
  }
};

export default function Microverse() {
  const [isLoading, setIsLoading] = useState(!isGameCached()); // 检查 localStorage 缓存
  const [loadingText, setLoadingText] = useState('正在启动游戏模式...');
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingLogs, setLoadingLogs] = useState<string[]>([]); // 加载日志
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null);
  const [gameVersion, setGameVersion] = useState<string>(''); // 游戏版本号，用于缓存破坏
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // 添加加载日志
  const addLoadingLog = useCallback((message: string) => {
    setLoadingLogs(prev => [...prev.slice(-9), message]); // 保留最近 10 条
  }, []);

  // 调试：组件挂载时打印信息
  useEffect(() => {
    const cached = isGameCached();
    console.log('[Microverse] 组件挂载，缓存状态 =', cached);

    // 检查版本
    checkVersion();

    // 添加全局点击监听器，检测点击事件是否被阻止
    const handleGlobalClick = (e: MouseEvent) => {
      console.log('[Microverse] 全局点击事件:', {
        target: e.target,
        currentTarget: e.currentTarget,
        clientX: e.clientX,
        clientY: e.clientY,
        isTrusted: e.isTrusted,
        eventPhase: e.eventPhase,
      });
    };

    const handleGlobalPointerDown = (e: PointerEvent) => {
      console.log('[Microverse] 全局 pointerdown 事件:', {
        target: e.target,
        pointerType: e.pointerType,
        isPrimary: e.isPrimary,
        clientX: e.clientX,
        clientY: e.clientY,
      });
    };

    document.addEventListener('click', handleGlobalClick, true);
    document.addEventListener('pointerdown', handleGlobalPointerDown, true);

    return () => {
      console.log('[Microverse] 组件卸载');
      document.removeEventListener('click', handleGlobalClick, true);
      document.removeEventListener('pointerdown', handleGlobalPointerDown, true);
    };
  }, []);

  // 调试：监听 isLoading 变化
  useEffect(() => {
    console.log('[Microverse] isLoading 变化:', isLoading);

    // 如果加载完成，检查是否有元素阻挡 iframe
    if (!isLoading && iframeRef.current) {
      setTimeout(() => {
        const iframe = iframeRef.current;
        if (!iframe) return;

        const rect = iframe.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        // 检查 iframe 中心点上的元素
        const elementAtCenter = document.elementFromPoint(centerX, centerY);
        console.log('[Microverse] iframe 中心点元素:', {
          element: elementAtCenter,
          tagName: elementAtCenter?.tagName,
          className: elementAtCenter?.className,
          zIndex: elementAtCenter ? window.getComputedStyle(elementAtCenter).zIndex : 'N/A',
          pointerEvents: elementAtCenter ? window.getComputedStyle(elementAtCenter).pointerEvents : 'N/A',
        });

        // 检查所有高 z-index 的元素
        const allElements = document.querySelectorAll('*');
        const highZIndexElements: Array<{ element: Element; zIndex: string }> = [];
        allElements.forEach(el => {
          const zIndex = window.getComputedStyle(el).zIndex;
          if (zIndex !== 'auto' && parseInt(zIndex) > 10) {
            highZIndexElements.push({ element: el, zIndex });
          }
        });

        console.log('[Microverse] 高 z-index 元素 (>10):', highZIndexElements);

        // 检查 iframe 的样式
        const iframeStyles = window.getComputedStyle(iframe);
        console.log('[Microverse] iframe 样式:', {
          position: iframeStyles.position,
          zIndex: iframeStyles.zIndex,
          pointerEvents: iframeStyles.pointerEvents,
          display: iframeStyles.display,
          visibility: iframeStyles.visibility,
          opacity: iframeStyles.opacity,
          width: iframeStyles.width,
          height: iframeStyles.height,
        });
      }, 1000);
    }
  }, [isLoading]);

  // 版本检查函数
  const checkVersion = async () => {
    try {
      const response = await fetch('/microverse/version.json', {
        cache: 'no-cache', // 强制不使用缓存
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      if (!response.ok) {
        console.warn('[Microverse] 版本文件不存在，使用时间戳作为版本');
        setGameVersion(Date.now().toString());
        return;
      }

      // 读取响应文本用于后续解析
      const rawText = await response.text();

      // SPA 回退时可能 200 但 body 为 index.html，避免 response.json() 抛错
      const trimmed = rawText.trimStart();
      if (trimmed.startsWith('<')) {
        console.warn('[Microverse] 版本检查返回 HTML 而非 JSON，使用时间戳作为版本');
        setGameVersion(Date.now().toString());
        return;
      }

      let newVersion: VersionInfo;
      try {
        newVersion = JSON.parse(rawText) as VersionInfo;
      } catch {
        console.warn('[Microverse] 版本 JSON 解析失败，使用时间戳作为版本');
        setGameVersion(Date.now().toString());
        return;
      }
      const cachedVersion = localStorage.getItem(VERSION_KEY);

      console.log('[Microverse] 版本检查:', {
        cached: cachedVersion,
        new: newVersion.exportTime
      });

      // 设置游戏版本号（用于 iframe src 的缓存破坏）
      setGameVersion(newVersion.exportTime);

      // 如果有缓存版本且与当前版本不匹配
      if (cachedVersion && cachedVersion !== newVersion.exportTime) {
        console.log('[Microverse] 检测到新版本，提示更新');
        setVersionInfo(newVersion);
        setShowUpdateDialog(true);
        // 清除游戏缓存标记，强制重新加载
        setGameCached(false);
      } else {
        // 更新缓存版本
        localStorage.setItem(VERSION_KEY, newVersion.exportTime);
      }
    } catch (error) {
      console.warn('[Microverse] 版本检查失败，使用时间戳作为版本:', error);
      setGameVersion(Date.now().toString());
    }
  };

  // 处理刷新页面
  const handleRefreshPage = () => {
    // 清除所有缓存
    setGameCached(false);
    localStorage.removeItem(VERSION_KEY);
    // 刷新页面
    window.location.reload();
  };

  // 处理稍后提醒
  const handleDismiss = () => {
    // 更新版本号，下次不再提示
    if (versionInfo) {
      localStorage.setItem(VERSION_KEY, versionInfo.exportTime);
    }
    setShowUpdateDialog(false);
  };

  useEffect(() => {
    // 如果游戏已经加载过，直接隐藏加载界面
    if (isGameCached()) {
      setIsLoading(false);
      return;
    }

    // 监听来自游戏的消息
    const handleMessage = (event: MessageEvent) => {
      // 转发 Godot 日志到后端
      if (event.data?.type === 'godot-log') {
        fetch('/api/logs/capture', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...event.data.log,
            source: 'microverse',
            timestamp: new Date().toISOString(),
          })
        }).catch(err => {
          console.error('[Microverse] Failed to forward log:', err);
        });
      }

      if (event.data?.type === 'godot-loading') {
        const { status, percentage, current, total } = event.data;

        switch (status) {
          case 'start':
            const startMsg = '初始化游戏引擎...';
            setLoadingText(startMsg);
            addLoadingLog(`✓ ${startMsg}`);
            break;
          case 'progress':
            const progressMsg = `加载游戏资源... ${percentage || 0}%`;
            setLoadingText(progressMsg);
            // 每 20% 记录一次日志，避免日志过多
            if (percentage && percentage % 20 === 0) {
              addLoadingLog(`✓ ${progressMsg}`);
            }
            setLoadingProgress(percentage || 0);
            break;
          case 'complete':
            const completeMsg = '准备游戏画布...';
            setLoadingText(completeMsg);
            addLoadingLog(`✓ ${completeMsg}`);
            // 游戏加载完成，强制刷新画布
            setTimeout(() => {
              forceCanvasResize();
              setIsLoading(false);
              setGameCached(true); // 标记为已加载
              addLoadingLog('✓ 游戏加载完成');
              console.log('[Microverse] 游戏加载完成，已设置缓存');
            }, 500);
            break;
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  useEffect(() => {
    // 如果游戏已经加载过，跳过模拟加载过程
    if (isGameCached()) {
      return;
    }

    // 模拟初始加载过程
    const loadingSteps = [
      { text: '正在启动游戏模式...', delay: 0 },
      { text: '连接游戏服务器...', delay: 800 },
    ];

    loadingSteps.forEach(({ text, delay }) => {
      setTimeout(() => {
        setLoadingText(text);
        addLoadingLog(`✓ ${text}`);
      }, delay);
    });
  }, [addLoadingLog]);

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
    // 如果游戏已经加载过，直接完成
    if (isGameCached()) {
      setIsLoading(false);
      console.log('[Microverse] iframe 加载完成，游戏已缓存');
      console.log('[Microverse] iframe 元素信息:', {
        width: iframeRef.current?.offsetWidth,
        height: iframeRef.current?.offsetHeight,
        zIndex: window.getComputedStyle(iframeRef.current!).zIndex,
        pointerEvents: window.getComputedStyle(iframeRef.current!).pointerEvents,
        display: window.getComputedStyle(iframeRef.current!).display,
        visibility: window.getComputedStyle(iframeRef.current!).visibility,
      });
      return;
    }

    // iframe DOM 加载完成，但游戏可能还在加载
    const waitMsg = '等待游戏初始化...';
    setLoadingText(waitMsg);
    addLoadingLog(`✓ ${waitMsg}`);
    console.log('[Microverse] iframe 加载完成，等待游戏初始化');

    // 如果 5 秒后还没收到游戏的加载消息，就强制完成加载
    setTimeout(() => {
      if (isLoading && !isGameCached()) {
        const startMsg = '启动游戏...';
        setLoadingText(startMsg);
        addLoadingLog(`✓ ${startMsg}`);
        forceCanvasResize();
        setTimeout(() => {
          setIsLoading(false);
          setGameCached(true); // 标记为已加载
          addLoadingLog('✓ 游戏启动完成');
          console.log('[Microverse] 强制完成加载，已设置缓存');
        }, 1000);
      }
    }, 5000);
  };

  const handleIframeError = () => {
    const errorMsg = '游戏加载失败，请刷新页面重试';
    setLoadingText(errorMsg);
    addLoadingLog(`✗ ${errorMsg}`);
    // 加载失败时清除缓存标记
    setGameCached(false);
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
      {/* 版本更新提示对话框 */}
      <Dialog
        open={showUpdateDialog}
        onClose={handleDismiss}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: '#1a1d2e',
            color: '#fff',
            borderRadius: 2,
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }
        }}
      >
        <DialogTitle sx={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
          🎮 游戏版本更新
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Typography variant="body1" sx={{ mb: 2 }}>
            检测到 Microverse 游戏有新版本可用！
          </Typography>
          {versionInfo?.message && (
            <Typography variant="body2" sx={{ mb: 2, color: 'rgba(255, 255, 255, 0.7)' }}>
              更新内容：{versionInfo.message}
            </Typography>
          )}
          {versionInfo?.gitCommit && (
            <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
              版本：{versionInfo.gitCommit}
            </Typography>
          )}
          <Typography variant="body2" sx={{ mt: 2, color: 'rgba(255, 255, 255, 0.6)' }}>
            建议立即刷新页面以获得最佳游戏体验。
          </Typography>
        </DialogContent>
        <DialogActions sx={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)', p: 2 }}>
          <Button
            onClick={handleDismiss}
            sx={{
              color: 'rgba(255, 255, 255, 0.7)',
              '&:hover': {
                bgcolor: 'rgba(255, 255, 255, 0.05)',
              }
            }}
          >
            稍后提醒
          </Button>
          <Button
            onClick={handleRefreshPage}
            variant="contained"
            sx={{
              bgcolor: '#3b82f6',
              '&:hover': {
                bgcolor: '#2563eb',
              }
            }}
          >
            立即刷新
          </Button>
        </DialogActions>
      </Dialog>

      {/* 加载界面 */}
      {isLoading && (
        <LoadingScreen
          progress={loadingProgress}
          currentStep={loadingText}
          logs={loadingLogs}
          theme="game"
        />
      )}

      {/* 游戏 iframe */}
      <iframe
        ref={iframeRef}
        src={gameVersion ? `/microverse/index.html?v=${gameVersion}` : '/microverse/index.html'}
        className={`w-full h-full border-0 block transition-opacity duration-500 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
        title="Microverse Game"
        allow="autoplay; fullscreen"
        onLoad={handleIframeLoad}
        onError={handleIframeError}
        onClick={(e) => {
          console.log('[Microverse] iframe 点击事件:', {
            target: e.target,
            currentTarget: e.currentTarget,
            clientX: e.clientX,
            clientY: e.clientY,
            nativeEvent: e.nativeEvent,
          });
        }}
        onPointerDown={(e) => {
          console.log('[Microverse] iframe pointerdown 事件:', {
            target: e.target,
            pointerType: e.pointerType,
            isPrimary: e.isPrimary,
            clientX: e.clientX,
            clientY: e.clientY,
          });
        }}
        style={{
          pointerEvents: 'auto',
          touchAction: 'none',
        }}
      />
    </div>
  );
}
