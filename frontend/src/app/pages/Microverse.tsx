import React, { useState, useRef, useEffect } from 'react';
import { LoadingSpinner } from '../components/LoadingSpinner';
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
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // 调试：组件挂载时打印信息
  useEffect(() => {
    const cached = isGameCached();
    console.log('[Microverse] 组件挂载，缓存状态 =', cached);

    // 检查版本
    checkVersion();

    return () => {
      console.log('[Microverse] 组件卸载');
    };
  }, []);

  // 调试：监听 isLoading 变化
  useEffect(() => {
    console.log('[Microverse] isLoading 变化:', isLoading);
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
        console.warn('[Microverse] 版本文件不存在，跳过版本检查');
        return;
      }

      const newVersion: VersionInfo = await response.json();
      const cachedVersion = localStorage.getItem(VERSION_KEY);

      console.log('[Microverse] 版本检查:', {
        cached: cachedVersion,
        new: newVersion.exportTime
      });

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
      console.warn('[Microverse] 版本检查失败:', error);
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
              setGameCached(true); // 标记为已加载
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
    // 如果游戏已经加载过，直接完成
    if (isGameCached()) {
      setIsLoading(false);
      console.log('[Microverse] iframe 加载完成，游戏已缓存');
      return;
    }

    // iframe DOM 加载完成，但游戏可能还在加载
    setLoadingText('等待游戏初始化...');
    console.log('[Microverse] iframe 加载完成，等待游戏初始化');

    // 如果 5 秒后还没收到游戏的加载消息，就强制完成加载
    setTimeout(() => {
      if (isLoading && !isGameCached()) {
        setLoadingText('启动游戏...');
        forceCanvasResize();
        setTimeout(() => {
          setIsLoading(false);
          setGameCached(true); // 标记为已加载
          console.log('[Microverse] 强制完成加载，已设置缓存');
        }, 1000);
      }
    }, 5000);
  };

  const handleIframeError = () => {
    setLoadingText('游戏加载失败，请刷新页面重试');
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
        className={`w-full h-full border-0 block transition-opacity duration-500 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
        title="Microverse Game"
        allow="autoplay; fullscreen"
        onLoad={handleIframeLoad}
        onError={handleIframeError}
      />
    </div>
  );
}
