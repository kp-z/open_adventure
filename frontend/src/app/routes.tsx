import { createBrowserRouter } from 'react-router';
import { Layout } from './components/layout';
import Dashboard from './pages/Dashboard';
import Skills from './pages/Skills';
import Agents from './pages/Agents';
import Workflows from './pages/Workflows';
import Executions from './pages/Executions';
import Settings from './pages/Settings';
import Teams from './pages/Teams';
import Terminal from './pages/Terminal';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: Layout,
    children: [
      {
        index: true,
        Component: Dashboard,
      },
      {
        path: 'skills',
        Component: Skills,
      },
      {
        path: 'agents',
        Component: Agents,
      },
      {
        path: 'teams',
        Component: Teams,
      },
      {
        path: 'workflows',
        Component: Workflows,
      },
      {
        path: 'executions',
        Component: Executions,
      },
      {
        path: 'settings',
        Component: Settings,
      },
      {
        path: 'terminal',
        Component: Terminal,
      },
    ],
  },
]);
