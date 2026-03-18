import React from 'react';
import { motion } from 'motion/react';
import { Zap, Loader, Gamepad2 } from 'lucide-react';

interface LoadingScreenProps {
  progress: number;
  currentStep: string;
  logs: string[];
  error?: string | null;
  theme?: 'app' | 'game'; // 主题：应用（蓝色）或游戏（紫色）
}

/**
 * 通用加载界面组件
 * 用于应用初始化和游戏加载
 */
export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  progress,
  currentStep,
  logs,
  error,
  theme = 'app',
}) => {
  const isGame = theme === 'game';

  // 主题色配置
  const colors = {
    app: {
      primary: 'blue',
      icon: 'text-blue-400',
      iconBg: 'bg-blue-500/10',
      iconBorder: 'border-blue-400/30',
      iconShadow: 'shadow-blue-500/10',
      iconGlow: 'drop-shadow-[0_0_20px_rgba(96,165,250,0.6)]',
      iconBgBlur: 'bg-blue-400/20',
      text: 'text-blue-400/80',
      progress: 'from-blue-500 to-blue-400',
      progressText: 'text-blue-400',
    },
    game: {
      primary: 'purple',
      icon: 'text-purple-400',
      iconBg: 'bg-purple-500/10',
      iconBorder: 'border-purple-400/30',
      iconShadow: 'shadow-purple-500/10',
      iconGlow: 'drop-shadow-[0_0_20px_rgba(192,132,252,0.6)]',
      iconBgBlur: 'bg-purple-400/20',
      text: 'text-purple-400/80',
      progress: 'from-purple-500 to-purple-400',
      progressText: 'text-purple-400',
    },
  };

  const color = colors[theme];

  return (
    <div className="fixed inset-0 bg-[#0f111a] flex items-center justify-center z-50">
      <div className="max-w-md w-full px-6">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center mb-12"
        >
          <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mb-6 relative overflow-hidden ${color.iconBg} backdrop-blur-xl border ${color.iconBorder} shadow-lg ${color.iconShadow}`}>
            {isGame ? (
              <Gamepad2
                size={40}
                fill="currentColor"
                className={`${color.icon} ${color.iconGlow} animate-pulse relative z-10`}
              />
            ) : (
              <Zap
                size={40}
                fill="currentColor"
                className={`${color.icon} ${color.iconGlow} animate-pulse relative z-10`}
              />
            )}
            <div className={`absolute inset-0 ${color.iconBgBlur} blur-xl scale-150 rounded-full`} />
          </div>

          <div className="flex flex-col items-center">
            <span className="text-3xl font-black tracking-tighter uppercase italic leading-[0.85] text-white mb-2">
              Open
            </span>
            <span className={`text-lg font-black tracking-[0.2em] uppercase leading-tight ${color.text}`}>
              Adventure
            </span>
          </div>
        </motion.div>

        {/* 进度条 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mb-8"
        >
          <div className="relative h-2 bg-white/5 rounded-full overflow-hidden">
            <motion.div
              className={`absolute inset-y-0 left-0 bg-gradient-to-r ${color.progress} rounded-full`}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            />
          </div>

          {/* 进度百分比 */}
          <div className="flex items-center justify-between mt-3">
            <span className="text-sm text-gray-400">{currentStep || '准备中...'}</span>
            <span className={`text-sm font-bold ${color.progressText}`}>{progress}%</span>
          </div>
        </motion.div>

        {/* 日志列表 */}
        {logs.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white/5 rounded-xl border border-white/10 p-4 max-h-48 overflow-y-auto"
          >
            <div className="space-y-2">
              {logs.map((log, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="text-xs text-gray-400 font-mono"
                >
                  {log}
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* 错误信息 */}
        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-6 bg-red-500/10 border border-red-500/30 rounded-xl p-4"
          >
            <div className="flex items-start gap-3">
              <span className="text-red-400 text-lg">✕</span>
              <div className="flex-1">
                <p className="text-sm font-medium text-red-400 mb-1">
                  {isGame ? '游戏加载失败' : '初始化失败'}
                </p>
                <p className="text-xs text-gray-300">{error}</p>
              </div>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 w-full py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors text-sm font-medium"
            >
              重新加载
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
};
