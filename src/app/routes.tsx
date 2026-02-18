import { createBrowserRouter } from 'react-router';
import { Layout } from './components/layout';
import Dashboard from './pages/Dashboard';
import Skills from './pages/Skills';
import Agents from './pages/Agents';
import Workflows from './pages/Workflows';
import Tasks from './pages/Tasks';
import Settings from './pages/Settings';
import Teams from './pages/Teams';

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
        path: 'tasks',
        Component: Tasks,
      },
      {
        path: 'settings',
        Component: Settings,
      },
    ],
  },
]);
