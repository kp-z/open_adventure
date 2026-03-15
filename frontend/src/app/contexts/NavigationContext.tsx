import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router';

interface NavigationState {
  canGoBack: boolean;
  canGoForward: boolean;
  goBack: () => void;
  goForward: () => void;
}

const NavigationContext = createContext<NavigationState | undefined>(undefined);

export const useNavigation = () => {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
};

export const NavigationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const historyRef = useRef<string[]>([location.pathname + location.search]);
  const currentIndexRef = useRef(0);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const isNavigatingRef = useRef(false);

  // 更新按钮状态
  const updateButtonStates = () => {
    setCanGoBack(currentIndexRef.current > 0);
    setCanGoForward(currentIndexRef.current < historyRef.current.length - 1);
  };

  // 当路由变化时更新历史记录
  useEffect(() => {
    const currentUrl = location.pathname + location.search;

    // 如果正在通过前进后退导航，跳过历史更新
    if (isNavigatingRef.current) {
      isNavigatingRef.current = false;
      updateButtonStates();
      return;
    }

    // 如果当前 URL 与历史记录中的当前位置不同，说明是新的导航
    if (historyRef.current[currentIndexRef.current] !== currentUrl) {
      // 截断当前位置之后的历史记录
      historyRef.current = historyRef.current.slice(0, currentIndexRef.current + 1);
      // 添加新 URL
      historyRef.current.push(currentUrl);
      currentIndexRef.current = historyRef.current.length - 1;
      updateButtonStates();
    }
  }, [location.pathname, location.search]);

  const goBack = () => {
    if (currentIndexRef.current > 0) {
      currentIndexRef.current -= 1;
      isNavigatingRef.current = true;
      navigate(historyRef.current[currentIndexRef.current]);
    }
  };

  const goForward = () => {
    if (currentIndexRef.current < historyRef.current.length - 1) {
      currentIndexRef.current += 1;
      isNavigatingRef.current = true;
      navigate(historyRef.current[currentIndexRef.current]);
    }
  };

  const value: NavigationState = {
    canGoBack,
    canGoForward,
    goBack,
    goForward,
  };

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
};