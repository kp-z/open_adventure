import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { NotificationBubble, type Notification } from '../components/NotificationBubble';

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => string;
  removeNotification: (id: string) => void;
  updateNotification: (id: string, updates: Partial<Notification>) => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

function getNotificationFingerprint(notification: Omit<Notification, 'id' | 'timestamp'> | Notification) {
  const normalizedMessage = notification.message
    .replace(/client-\d+/g, 'client-*')
    .replace(/\s+/g, ' ')
    .trim();

  return `${notification.type}::${notification.title.trim()}::${normalizedMessage}`;
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isMobile, setIsMobile] = useState(false);

  // 检测是否为移动端
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp'>) => {
    const id = `notification-${Date.now()}-${Math.random()}`;
    const newNotification: Notification = {
      ...notification,
      id,
      timestamp: new Date(),
    };

    let targetId = id;

    setNotifications((prev) => {
      const fingerprint = getNotificationFingerprint(notification);
      const existing = prev.find((item) => getNotificationFingerprint(item) === fingerprint);

      if (existing) {
        targetId = existing.id;
        return prev.map((item) =>
          item.id === existing.id
            ? {
                ...item,
                timestamp: new Date(),
                message: notification.message,
                title: notification.title,
              }
            : item,
        );
      }

      return [newNotification, ...prev];
    });

    // Auto-dismiss success and error notifications after 5 seconds
    if (notification.type === 'success' || notification.type === 'error') {
      setTimeout(() => {
        removeNotification(targetId);
      }, 5000);
    }

    return targetId;
  }, [removeNotification]);

  const updateNotification = useCallback((id: string, updates: Partial<Notification>) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, ...updates } : n))
    );
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        addNotification,
        removeNotification,
        updateNotification,
        clearAll,
      }}
    >
      {children}
      <NotificationBubble
        notifications={notifications}
        onDismiss={removeNotification}
        onClearAll={clearAll}
        isMobile={isMobile}
      />
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
