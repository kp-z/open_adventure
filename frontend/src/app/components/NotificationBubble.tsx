import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  ChevronUp,
  Info,
  Sparkles,
  EyeOff,
} from 'lucide-react';

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info' | 'loading';
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

const typeStyleMap: Record<
  Notification['type'],
  {
    icon: React.ReactNode;
    chip: string;
    ring: string;
    cardGlow: string;
    titleColor: string;
  }
> = {
  success: {
    icon: <CheckCircle2 size={16} className="text-emerald-300" />,
    chip: 'bg-emerald-400/15 text-emerald-200 border border-emerald-300/25',
    ring: 'ring-emerald-300/30',
    cardGlow: 'from-emerald-400/20 via-emerald-300/8 to-transparent',
    titleColor: 'text-emerald-100',
  },
  error: {
    icon: <AlertCircle size={16} className="text-rose-300" />,
    chip: 'bg-rose-400/15 text-rose-200 border border-rose-300/25',
    ring: 'ring-rose-300/30',
    cardGlow: 'from-rose-400/20 via-rose-300/8 to-transparent',
    titleColor: 'text-rose-100',
  },
  warning: {
    icon: <AlertCircle size={16} className="text-amber-300" />,
    chip: 'bg-amber-400/15 text-amber-200 border border-amber-300/25',
    ring: 'ring-amber-300/30',
    cardGlow: 'from-amber-400/20 via-amber-300/8 to-transparent',
    titleColor: 'text-amber-100',
  },
  info: {
    icon: <Info size={16} className="text-blue-300" />,
    chip: 'bg-blue-400/15 text-blue-200 border border-blue-300/25',
    ring: 'ring-blue-300/30',
    cardGlow: 'from-blue-400/20 via-blue-300/8 to-transparent',
    titleColor: 'text-blue-100',
  },
  loading: {
    icon: <Loader2 size={16} className="text-violet-300 animate-spin" />,
    chip: 'bg-violet-400/15 text-violet-200 border border-violet-300/25',
    ring: 'ring-violet-300/30',
    cardGlow: 'from-violet-400/20 via-violet-300/8 to-transparent',
    titleColor: 'text-violet-100',
  },
};

export const NotificationBubble: React.FC<NotificationBubbleProps> = ({
  notifications,
  onDismiss,
  onClearAll,
  isMobile = false,
  isExpanded: externalIsExpanded,
  onToggle,
}) => {
  const [internalIsExpanded, setInternalIsExpanded] = useState(false);
  const [desktopDocked, setDesktopDocked] = useState(false);
  const [hasNewSinceDocked, setHasNewSinceDocked] = useState(false);

  const isExpanded = isMobile ? (externalIsExpanded ?? false) : internalIsExpanded;

  const activeNotifications = useMemo(
    () => notifications.filter((n) => n.type === 'loading'),
    [notifications],
  );
  const hasNotifications = notifications.length > 0;
  const unreadCount = notifications.length;

  const prevUnreadCountRef = useRef(unreadCount);

  useEffect(() => {
    if (!isMobile && unreadCount === 0) {
      setDesktopDocked(false);
      setHasNewSinceDocked(false);
      setInternalIsExpanded(false);
    }
  }, [isMobile, unreadCount]);

  useEffect(() => {
    if (!isMobile && desktopDocked && unreadCount > prevUnreadCountRef.current) {
      setHasNewSinceDocked(true);
    }
    prevUnreadCountRef.current = unreadCount;
  }, [isMobile, desktopDocked, unreadCount]);

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
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className={`${
              isMobile ? 'relative w-full' : 'absolute bottom-16 right-0 w-[420px]'
            } max-h-[560px] rounded-3xl overflow-hidden border border-white/20 shadow-[0_24px_80px_rgba(10,14,28,0.45)] backdrop-blur-2xl bg-white/[0.07]`}
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(255,255,255,0.28),transparent_55%),radial-gradient(circle_at_100%_100%,rgba(147,197,253,0.2),transparent_50%)]" />

            <div className="relative flex items-center justify-between px-5 py-4 border-b border-white/15 bg-white/[0.03]">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center shadow-inner shadow-white/10">
                  <Bell size={16} className="text-slate-100" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-sm tracking-wide text-white">Notifications</h3>
                  <p className="text-[11px] text-white/60 mt-0.5">
                    {activeNotifications.length > 0
                      ? `${activeNotifications.length} tasks running`
                      : 'All recent updates and alerts'}
                  </p>
                </div>
                <span className="shrink-0 text-[11px] font-medium px-2 py-1 rounded-full bg-white/12 border border-white/20 text-white/85">
                  {unreadCount}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                {notifications.length > 0 && (
                  <button
                    onClick={onClearAll}
                    className="text-[11px] px-2.5 py-1.5 rounded-lg border border-white/15 bg-white/5 text-white/70 hover:text-white hover:bg-white/12 transition-colors"
                  >
                    Clear all
                  </button>
                )}
                <button
                  onClick={() => {
                    if (isMobile) {
                      onToggle?.();
                      return;
                    }
                    setInternalIsExpanded(false);
                  }}
                  className="w-8 h-8 rounded-lg border border-white/15 bg-white/5 text-white/70 hover:text-white hover:bg-white/12 transition-colors flex items-center justify-center"
                >
                  <ChevronUp size={16} />
                </button>
                {!isMobile && hasNotifications && (
                  <button
                    onClick={() => {
                      setInternalIsExpanded(false);
                      setDesktopDocked(true);
                      setHasNewSinceDocked(false);
                    }}
                    className="w-8 h-8 rounded-lg border border-white/15 bg-white/5 text-white/70 hover:text-white hover:bg-white/12 transition-colors flex items-center justify-center"
                    title="Hide to dock"
                  >
                    <EyeOff size={15} />
                  </button>
                )}
              </div>
            </div>

            <div className="relative max-h-[470px] overflow-y-auto px-3 py-3 space-y-2">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-white/60 text-sm">No notifications</div>
              ) : (
                notifications.map((notification) => {
                  const typeStyle = typeStyleMap[notification.type];
                  return (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className={`group relative overflow-hidden rounded-2xl border border-white/20 bg-white/[0.09] backdrop-blur-xl p-3.5 ring-1 ${typeStyle.ring}`}
                    >
                      <div className={`absolute inset-0 bg-gradient-to-br ${typeStyle.cardGlow} pointer-events-none`} />

                      <div className="relative flex items-start gap-3">
                        <div className="mt-0.5 w-8 h-8 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center shadow-inner shadow-white/10">
                          {typeStyle.icon}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2.5">
                                <h4 className={`text-sm font-semibold truncate ${typeStyle.titleColor}`}>
                                  {notification.title}
                                </h4>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full ${typeStyle.chip}`}>
                                  {notification.type}
                                </span>
                              </div>
                            </div>

                            <button
                              onClick={() => onDismiss(notification.id)}
                              className="w-6 h-6 rounded-md opacity-0 group-hover:opacity-100 transition-all border border-white/10 bg-white/5 text-white/60 hover:text-white hover:bg-white/15 flex items-center justify-center"
                            >
                              <X size={12} />
                            </button>
                          </div>

                          <p className="text-xs text-white/80 mt-1.5 leading-5 line-clamp-3">
                            {notification.message}
                          </p>

                          <div className="mt-2.5 flex items-center justify-between text-[10px] text-white/55">
                            <span>{getTimeAgo(notification.timestamp)}</span>
                            {notification.type === 'loading' && (
                              <span className="inline-flex items-center gap-1 text-violet-200/90">
                                <Sparkles size={10} />
                                processing
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!isMobile && hasNotifications && (
        <AnimatePresence mode="wait">
          {desktopDocked ? (
            <motion.button
              key="notification-dock-dot"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.94 }}
              onClick={() => {
                setDesktopDocked(false);
                setInternalIsExpanded(true);
                setHasNewSinceDocked(false);
              }}
              title="Show notifications"
              className="relative w-3 h-3 rounded-full border border-white/40 bg-white/35 backdrop-blur-xl shadow-[0_8px_24px_rgba(15,23,42,0.45)]"
            >
              {hasNewSinceDocked && (
                <motion.span
                  className="absolute inset-[-6px] rounded-full bg-violet-300/35"
                  animate={{
                    scale: [1, 1.5, 1],
                    opacity: [0.5, 0, 0.5],
                  }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                />
              )}
            </motion.button>
          ) : (
            <motion.button
              key="notification-main-button"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => setInternalIsExpanded(!internalIsExpanded)}
              className={`relative w-12 h-12 rounded-full flex items-center justify-center border border-white/25 shadow-[0_12px_35px_rgba(15,23,42,0.45)] backdrop-blur-xl transition-colors ${
                activeNotifications.length > 0
                  ? 'bg-violet-400/25 hover:bg-violet-400/35'
                  : 'bg-white/12 hover:bg-white/20'
              }`}
            >
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/25 via-white/0 to-sky-300/20 pointer-events-none" />
              {activeNotifications.length > 0 ? (
                <Loader2 size={19} className="text-white animate-spin relative" />
              ) : (
                <Bell size={19} className="text-white relative" />
              )}

              {unreadCount > 0 && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1.5 bg-rose-500 rounded-full flex items-center justify-center text-[9px] font-bold text-white border-2 border-slate-900/50"
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </motion.div>
              )}

              {activeNotifications.length > 0 && (
                <motion.div
                  className="absolute inset-0 rounded-full bg-violet-400/40"
                  animate={{
                    scale: [1, 1.18, 1],
                    opacity: [0.45, 0, 0.45],
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
        </AnimatePresence>
      )}
    </div>
  );
};
