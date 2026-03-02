import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, CheckCircle2, AlertCircle, Loader2, X, ChevronUp } from 'lucide-react';

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'info' | 'loading';
  title: string;
  message: string;
  timestamp: Date;
}

interface NotificationBubbleProps {
  notifications: Notification[];
  onDismiss: (id: string) => void;
  onClearAll: () => void;
  isMobile?: boolean;
  isExpanded?: boolean;
  onToggle?: () => void;
}

export const NotificationBubble: React.FC<NotificationBubbleProps> = ({
  notifications,
  onDismiss,
  onClearAll,
  isMobile = false,
  isExpanded: externalIsExpanded,
  onToggle,
}) => {
  const [internalIsExpanded, setInternalIsExpanded] = useState(false);

  // 使用外部控制的 isExpanded（移动端）或内部状态（桌面端）
  const isExpanded = isMobile ? (externalIsExpanded ?? false) : internalIsExpanded;
  const setIsExpanded = isMobile ? (onToggle ?? (() => {})) : setInternalIsExpanded;

  const activeNotifications = notifications.filter((n) => n.type === 'loading');
  const hasNotifications = notifications.length > 0;
  const unreadCount = notifications.length;

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 size={16} className="text-green-400" />;
      case 'error':
        return <AlertCircle size={16} className="text-red-400" />;
      case 'loading':
        return <Loader2 size={16} className="text-blue-400 animate-spin" />;
      default:
        return <Bell size={16} className="text-gray-400" />;
    }
  };

  const getTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <div className={`${isMobile ? '' : 'fixed bottom-6 right-6 z-50'} flex flex-col items-end`}>
      <AnimatePresence>
        {isExpanded && hasNotifications && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className={`${isMobile ? 'relative w-full' : 'absolute bottom-16 right-0 w-96'} max-h-[500px] bg-[#1a1b26] border border-white/10 rounded-2xl shadow-2xl overflow-hidden`}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Bell size={18} className="text-gray-400" />
                <h3 className="font-bold text-sm">Notifications</h3>
                <span className="text-xs text-gray-500">({unreadCount})</span>
              </div>
              <div className="flex items-center gap-2">
                {notifications.length > 0 && (
                  <button
                    onClick={onClearAll}
                    className="text-xs text-gray-400 hover:text-white transition-colors"
                  >
                    Clear All
                  </button>
                )}
                <button
                  onClick={() => isMobile ? onToggle?.() : setInternalIsExpanded(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <ChevronUp size={18} />
                </button>
              </div>
            </div>

            {/* Notifications List */}
            <div className="max-h-[400px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-500 text-sm">
                  No notifications
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {notifications.map((notification) => (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="p-4 hover:bg-white/5 transition-colors group"
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">{getIcon(notification.type)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="text-sm font-bold text-white truncate">
                              {notification.title}
                            </h4>
                            <button
                              onClick={() => onDismiss(notification.id)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-white"
                            >
                              <X size={14} />
                            </button>
                          </div>
                          <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                            {notification.message}
                          </p>
                          <span className="text-[10px] text-gray-500 mt-1 block">
                            {getTimeAgo(notification.timestamp)}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Button - Only show on desktop when there are notifications */}
      {!isMobile && hasNotifications && (
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => !isMobile && setInternalIsExpanded(!internalIsExpanded)}
          className={`relative w-12 h-12 rounded-full flex items-center justify-center shadow-xl transition-colors ${
            activeNotifications.length > 0
              ? 'bg-blue-600 hover:bg-blue-700'
              : 'bg-white/10 hover:bg-white/20'
          } backdrop-blur-md border border-white/10`}
        >
        {activeNotifications.length > 0 ? (
          <Loader2 size={20} className="text-white animate-spin" />
        ) : (
          <Bell size={20} className="text-white" />
        )}

        {/* Badge */}
        {unreadCount > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-[9px] font-bold text-white border-2 border-[#1a1b26]"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </motion.div>
        )}

        {/* Pulse animation for active tasks */}
        {activeNotifications.length > 0 && (
          <motion.div
            className="absolute inset-0 rounded-full bg-blue-500"
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.5, 0, 0.5],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        )}
      </motion.button>
      )}
    </div>
  );
};
