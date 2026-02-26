import React from 'react';
import { RouterProvider, createBrowserRouter } from 'react-router';
import { AppProvider } from './contexts/AppContext';
import { AgentsProvider } from './contexts/AgentsContext';
import { TeamsProvider } from './contexts/TeamsContext';
import { ModeProvider } from './contexts/ModeContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { ExecutionProvider } from './contexts/ExecutionContext';
import { ExecutionMonitor } from './components/ExecutionMonitor';
import '../styles/theme.css';
import '../styles/fonts.css';

// App Version: 4.2.0 - Enhanced Teams Management
console.log('🚀 Claude Manager v4.2.0 - Enhanced Teams Management');
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
          minHeight: '100vh',
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
          path: 'tasks',
          lazy: async () => {
            const Tasks = await import('./pages/Tasks');
            return { Component: Tasks.default };
          },
        },
        {
          path: 'settings',
          lazy: async () => {
            const Settings = await import('./pages/Settings');
            return { Component: Settings.default };
          },
        },
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

export default function App() {
  return (
    <ErrorBoundary>
      <NotificationProvider>
        <ModeProvider>
          <AppProvider>
            <AgentsProvider>
              <TeamsProvider>
                <ExecutionProvider>
                  <RouterProvider router={router} />
                  <ExecutionMonitor />
                </ExecutionProvider>
              </TeamsProvider>
            </AgentsProvider>
          </AppProvider>
        </ModeProvider>
      </NotificationProvider>
    </ErrorBoundary>
  );
}