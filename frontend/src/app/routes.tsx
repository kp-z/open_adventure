import { createBrowserRouter } from 'react-router';
import { Layout } from './components/layout';
import Dashboard from './pages/Dashboard';
import Skills from './pages/Skills';
import Agents from './pages/Agents';
import AgentTestPage from './pages/AgentTestPage';
import AgentCreatePage from './pages/AgentCreatePage';
import AgentEditPage from './pages/AgentEditPage';
import Workflows from './pages/Workflows';
import Executions from './pages/Executions';
import Settings from './pages/Settings';
import Teams from './pages/Teams';
import Terminal from './pages/Terminal';
import Microverse from './pages/Microverse';
import Testing from './pages/Testing';
import DevCheck from './pages/DevCheck';
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import ProjectWorkspace from './pages/ProjectWorkspace';

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
        path: 'agents/create',
        Component: AgentCreatePage,
      },
      {
        path: 'agents/:id/edit',
        Component: AgentEditPage,
      },
      {
        path: 'agents/:id/test',
        Component: AgentTestPage,
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
      {
        path: 'microverse',
        Component: Microverse,
      },
      {
        path: 'testing',
        Component: Testing,
      },
      {
        path: 'dev-check',
        Component: DevCheck,
      },
      {
        path: 'projects',
        Component: Projects,
      },
      {
        path: 'projects/:id',
        Component: ProjectDetail,
      },
      {
        path: 'projects/:id/workspace',
        Component: ProjectWorkspace,
      },
    ],
  },
]);
