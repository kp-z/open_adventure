import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';

export const OfflineIndicator = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      console.log('✅ 网络已连接');
    };

    const handleOffline = () => {
      setIsOnline(false);
      console.log('⚠️ 网络已断开，进入离线模式');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // 在线时不显示
  if (isOnline) return null;

  return (
    <div className="fixed top-4 right-4 bg-yellow-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 z-50 animate-in fade-in slide-in-from-top-2">
      <WifiOff size={20} />
      <span className="font-medium">离线模式</span>
    </div>
  );
};
