import React from 'react';
import { useInitialization } from '../contexts/InitializationContext';
import { LoadingScreen } from './LoadingScreen';

/**
 * 应用初始化加载界面
 * 使用通用 LoadingScreen 组件
 */
export const InitializationScreen: React.FC = () => {
  const { progress, currentStep, logs, error } = useInitialization();

  return (
    <LoadingScreen
      progress={progress}
      currentStep={currentStep}
      logs={logs}
      error={error}
      theme="app"
    />
  );
};
