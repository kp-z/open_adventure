import React, { useState, useEffect } from 'react';
import { RouterProvider, createBrowserRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { AppProvider } from './contexts/AppContext';
import { AgentsProvider } from './contexts/AgentsContext';
import { TeamsProvider } from './contexts/TeamsContext';
import { ModeProvider } from './contexts/ModeContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { ExecutionProvider } from './contexts/ExecutionContext';
import { TerminalProvider } from './contexts/TerminalContext';
import { NavigationProvider } from './contexts/NavigationContext';
import { InitializationProvider, useInitialization } from './contexts/InitializationContext';
import { OfflineIndicator } from './components/OfflineIndicator';
import '../styles/theme.css';
import '../styles/fonts.css';

// 创建 QueryClient 实例
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5分钟内数据视为新鲜
      gcTime: 10 * 60 * 1000, // 10分钟后清除缓存（原 cacheTime）
      refetchOnWindowFocus: true, // 窗口聚焦时自动刷新
      retry: 1, // 失败重试1次
    },
  },
});

// React Query DevTools 显示状态（从 localStorage 读取）
export const useReactQueryDevTools = () => {
  const [showDevTools, setShowDevTools] = useState(() => {
    const saved = localStorage.getItem('showReactQueryDevTools');
    return saved === 'true';
  });

  const toggleDevTools = (value: boolean) => {
    setShowDevTools(value);
    localStorage.setItem('showReactQueryDevTools', String(value));
  };

  return { showDevTools, toggleDevTools };
};

// App Version: 4.2.0 - Enhanced Teams Management
console.log('🚀 Open Adventure v4.2.0 - Enhanced Teams Management');
console.log('✨ New: Complete Teams CRUD, Collaboration Modes, Communication Protocols');
console.log('🔧 Clear browser cache if errors persist (Ctrl+Shift+R or Cmd+Shift+R)');

// Error Boundary Component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          padding: '2rem', 
          color: 'white', 
          backgroundColor: '#0f111a',
          minHeight: 'var(--app-h)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: '1rem'
        }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold' }}>Something went wrong</h1>
          <p style={{ color: '#9ca3af' }}>{this.state.error?.message || 'Unknown error'}</p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#3b82f6',
              color: 'white',
              borderRadius: '0.5rem',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Create router outside component to avoid recreation on every render
const router = createBrowserRouter(
  [
    {
      path: '/',
      lazy: async () => {
        const { Layout } = await import('./components/layout');
        return { Component: Layout };
      },
      HydrateFallback: () => <div>Loading...</div>,
      ErrorBoundary: () => (
        <div style={{ padding: '2rem', color: 'white' }}>
          <h1>Route Error</h1>
          <button onClick={() => window.location.reload()}>Reload</button>
        </div>
      ),
      children: [
        {
          index: true,
          lazy: async () => {
            const Dashboard = await import('./pages/Dashboard');
            return { Component: Dashboard.default };
          },
        },
        {
          path: 'skills',
          lazy: async () => {
            const Skills = await import('./pages/Skills');
            return { Component: Skills.default };
          },
        },
        {
          path: 'agents',
          lazy: async () => {
            const Agents = await import('./pages/Agents');
            return { Component: Agents.default };
          },
        },
        {
          path: 'agents/create',
          lazy: async () => {
            const AgentCreatePage = await import('./pages/AgentCreatePage');
            return { Component: AgentCreatePage.default };
          },
        },
        {
          path: 'agents/:id/edit',
          lazy: async () => {
            const AgentEditPage = await import('./pages/AgentEditPage');
            return { Component: AgentEditPage.default };
          },
        },
        {
          path: 'agents/:id/test',
          lazy: async () => {
            const AgentTestPage = await import('./pages/AgentTestPage');
            return { Component: AgentTestPage.default };
          },
        },
        {
          path: 'teams',
          lazy: async () => {
            const Teams = await import('./pages/Teams');
            return { Component: Teams.default };
          },
        },
        {
          path: 'workflows',
          lazy: async () => {
            const Workflows = await import('./pages/Workflows');
            return { Component: Workflows.default };
          },
        },
        {
          path: 'workflows/opp',
          lazy: async () => {
            const OPP = await import('./pages/OPP');
            return { Component: OPP.default };
          },
        },
        {
          path: 'history',
          lazy: async () => {
            const History = await import('./pages/History');
            return { Component: History.default };
          },
        },
        {
          path: 'settings',
          lazy: async () => {
            const Settings = await import('./pages/Settings');
            return { Component: Settings.default };
          },
        },
        {
          path: 'terminal',
          lazy: async () => {
            const Terminal = await import('./pages/Terminal');
            return { Component: Terminal.default };
          },
        },
        {
          path: 'microverse',
          lazy: async () => {
            const Microverse = await import('./pages/Microverse');
            return { Component: Microverse.default };
          },
        },
        // microverse 路由已添加回来
      ],
    },
  ],
  {
    future: {
      v7_startTransition: true,
      v7_relativeSplatPath: true,
      v7_fetcherPersist: true,
      v7_normalizeFormMethod: true,
      v7_skipActionErrorRevalidation: true,
    },
  }
);

// 创建一个内部组件来使用 useInitialization hook
function AppContent() {
  return (
    <>
      <OfflineIndicator />
      <RouterProvider router={router} />
    </>
  );
}

export default function App() {
  const [showDevTools, setShowDevTools] = useState(() => {
    const saved = localStorage.getItem('showReactQueryDevTools');
    return saved === 'true';
  });

  // 监听 localStorage 变化
  useEffect(() => {
    const handleStorageChange = () => {
      const saved = localStorage.getItem('showReactQueryDevTools');
      setShowDevTools(saved === 'true');
    };

    window.addEventListener('storage', handleStorageChange);
    // 自定义事件用于同一页面内的更新
    window.addEventListener('reactQueryDevToolsChange', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('reactQueryDevToolsChange', handleStorageChange);
    };
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <NotificationProvider>
          <ModeProvider>
            <InitializationProvider>
              <AppProvider>
                <AgentsProvider>
                  <TeamsProvider>
                    <ExecutionProvider>
                      <TerminalProvider>
                        <AppContent />
                      </TerminalProvider>
                    </ExecutionProvider>
                  </TeamsProvider>
                </AgentsProvider>
              </AppProvider>
            </InitializationProvider>
          </ModeProvider>
        </NotificationProvider>
        {/* React Query DevTools - 通过 Settings 控制显示 */}
        {showDevTools && (
          <ReactQueryDevtools
            initialIsOpen={false}
            position="bottom-left"
            buttonPosition="bottom-left"
          />
        )}
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
