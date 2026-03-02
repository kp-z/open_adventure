// Mock 数据类型定义
export interface KeyResult {
  id: string;
  title: string;
  description: string;
  target: number;
  current: number;
  unit: string;
  status: 'not-started' | 'in-progress' | 'at-risk' | 'completed';
  assignedType: 'agent' | 'team';
  assignedTo: string[];
  assignedName: string;
  startDate?: string;
  endDate?: string;
}

export interface Objective {
  id: string;
  title: string;
  description: string;
  quarter: string;
  keyResults: KeyResult[];
  status: 'not-started' | 'in-progress' | 'at-risk' | 'completed';
}

export interface Task {
  id: string;
  title: string;
  status: 'pending' | 'in-progress' | 'completed' | 'blocked';
  progress: number;
  assignedTo?: string;
  dueDate?: string;
}

export interface Plan {
  id: string;
  title: string;
  krId: string;
  tasks: Task[];
  createdAt: string;
  updatedAt: string;
}

export interface ExecutionMetrics {
  responseTime?: number;
  successRate?: number;
  throughput?: number;
  [key: string]: number | undefined;
}

export interface Execution {
  id: string;
  timestamp: string;
  status: 'success' | 'failed' | 'running';
  metrics: ExecutionMetrics;
  logs?: string;
}

export interface Progress {
  id: string;
  krId: string;
  executions: Execution[];
}

// Mock OKR 数据
export const mockObjectives: Objective[] = [
  {
    id: 'obj-1',
    title: 'Q1 2026: 提升系统性能',
    description: '优化核心功能，提升用户体验，降低响应时间',
    quarter: 'Q1 2026',
    status: 'in-progress',
    keyResults: [
      {
        id: 'kr-1',
        title: 'API 响应时间优化',
        description: '将平均响应时间降低到 100ms 以下',
        target: 100,
        current: 150,
        unit: 'ms',
        status: 'in-progress',
        assignedType: 'agent',
        assignedTo: ['agent-1'],
        assignedName: 'Performance Agent',
        startDate: '2026-01-01',
        endDate: '2026-03-31',
      },
      {
        id: 'kr-2',
        title: '数据库查询优化',
        description: '优化慢查询，提升数据库性能',
        target: 50,
        current: 80,
        unit: 'ms',
        status: 'in-progress',
        assignedType: 'team',
        assignedTo: ['team-1'],
        assignedName: 'Backend Team',
        startDate: '2026-01-15',
        endDate: '2026-03-31',
      },
      {
        id: 'kr-3',
        title: '前端加载速度优化',
        description: '首屏加载时间降低到 1 秒以内',
        target: 1000,
        current: 1500,
        unit: 'ms',
        status: 'at-risk',
        assignedType: 'agent',
        assignedTo: ['agent-2'],
        assignedName: 'Frontend Agent',
        startDate: '2026-02-01',
        endDate: '2026-03-31',
      },
    ],
  },
  {
    id: 'obj-2',
    title: 'Q1 2026: 增强系统稳定性',
    description: '提升系统可靠性，降低故障率',
    quarter: 'Q1 2026',
    status: 'in-progress',
    keyResults: [
      {
        id: 'kr-4',
        title: '系统可用性提升',
        description: '将系统可用性提升到 99.9%',
        target: 99.9,
        current: 99.5,
        unit: '%',
        status: 'in-progress',
        assignedType: 'team',
        assignedTo: ['team-2'],
        assignedName: 'DevOps Team',
        startDate: '2026-01-01',
        endDate: '2026-03-31',
      },
      {
        id: 'kr-5',
        title: '错误率降低',
        description: '将 API 错误率降低到 0.1% 以下',
        target: 0.1,
        current: 0.5,
        unit: '%',
        status: 'in-progress',
        assignedType: 'agent',
        assignedTo: ['agent-3'],
        assignedName: 'Reliability Agent',
        startDate: '2026-01-10',
        endDate: '2026-03-31',
      },
    ],
  },
  {
    id: 'obj-3',
    title: 'Q1 2026: 提升用户体验',
    description: '优化用户界面，提升用户满意度',
    quarter: 'Q1 2026',
    status: 'not-started',
    keyResults: [
      {
        id: 'kr-6',
        title: '用户满意度提升',
        description: '将用户满意度提升到 4.5 分以上',
        target: 4.5,
        current: 4.0,
        unit: '分',
        status: 'not-started',
        assignedType: 'team',
        assignedTo: ['team-3'],
        assignedName: 'UX Team',
        startDate: '2026-02-01',
        endDate: '2026-03-31',
      },
    ],
  },
];

// Mock Plan 数据
export const mockPlans: Plan[] = [
  {
    id: 'plan-1',
    title: 'API 优化计划',
    krId: 'kr-1',
    createdAt: '2026-01-05T10:00:00Z',
    updatedAt: '2026-03-01T15:30:00Z',
    tasks: [
      {
        id: 'task-1',
        title: '数据库查询优化',
        status: 'completed',
        progress: 100,
        assignedTo: 'Performance Agent',
        dueDate: '2026-02-15',
      },
      {
        id: 'task-2',
        title: '缓存策略实施',
        status: 'in-progress',
        progress: 60,
        assignedTo: 'Performance Agent',
        dueDate: '2026-03-10',
      },
      {
        id: 'task-3',
        title: 'API 接口重构',
        status: 'in-progress',
        progress: 40,
        assignedTo: 'Performance Agent',
        dueDate: '2026-03-25',
      },
      {
        id: 'task-4',
        title: '性能测试',
        status: 'pending',
        progress: 0,
        assignedTo: 'Performance Agent',
        dueDate: '2026-03-30',
      },
    ],
  },
  {
    id: 'plan-2',
    title: '数据库优化计划',
    krId: 'kr-2',
    createdAt: '2026-01-20T09:00:00Z',
    updatedAt: '2026-03-01T14:20:00Z',
    tasks: [
      {
        id: 'task-5',
        title: '慢查询分析',
        status: 'completed',
        progress: 100,
        assignedTo: 'Backend Team',
        dueDate: '2026-02-10',
      },
      {
        id: 'task-6',
        title: '索引优化',
        status: 'in-progress',
        progress: 70,
        assignedTo: 'Backend Team',
        dueDate: '2026-03-15',
      },
      {
        id: 'task-7',
        title: '查询语句重写',
        status: 'pending',
        progress: 0,
        assignedTo: 'Backend Team',
        dueDate: '2026-03-28',
      },
    ],
  },
  {
    id: 'plan-3',
    title: '前端性能优化计划',
    krId: 'kr-3',
    createdAt: '2026-02-05T11:00:00Z',
    updatedAt: '2026-03-01T16:00:00Z',
    tasks: [
      {
        id: 'task-8',
        title: '代码分割',
        status: 'in-progress',
        progress: 50,
        assignedTo: 'Frontend Agent',
        dueDate: '2026-03-20',
      },
      {
        id: 'task-9',
        title: '资源压缩',
        status: 'pending',
        progress: 0,
        assignedTo: 'Frontend Agent',
        dueDate: '2026-03-25',
      },
    ],
  },
];

// Mock Progress 数据
export const mockProgress: Progress[] = [
  {
    id: 'progress-1',
    krId: 'kr-1',
    executions: [
      {
        id: 'exec-1',
        timestamp: '2026-02-01T10:00:00Z',
        status: 'success',
        metrics: {
          responseTime: 180,
        },
      },
      {
        id: 'exec-2',
        timestamp: '2026-02-10T10:00:00Z',
        status: 'success',
        metrics: {
          responseTime: 165,
        },
      },
      {
        id: 'exec-3',
        timestamp: '2026-02-20T10:00:00Z',
        status: 'success',
        metrics: {
          responseTime: 150,
        },
      },
      {
        id: 'exec-4',
        timestamp: '2026-03-01T10:00:00Z',
        status: 'running',
        metrics: {
          responseTime: 150,
        },
      },
    ],
  },
  {
    id: 'progress-2',
    krId: 'kr-2',
    executions: [
      {
        id: 'exec-5',
        timestamp: '2026-02-01T11:00:00Z',
        status: 'success',
        metrics: {
          responseTime: 95,
        },
      },
      {
        id: 'exec-6',
        timestamp: '2026-02-15T11:00:00Z',
        status: 'success',
        metrics: {
          responseTime: 85,
        },
      },
      {
        id: 'exec-7',
        timestamp: '2026-03-01T11:00:00Z',
        status: 'success',
        metrics: {
          responseTime: 80,
        },
      },
    ],
  },
  {
    id: 'progress-3',
    krId: 'kr-3',
    executions: [
      {
        id: 'exec-8',
        timestamp: '2026-02-10T12:00:00Z',
        status: 'success',
        metrics: {
          responseTime: 1600,
        },
      },
      {
        id: 'exec-9',
        timestamp: '2026-02-25T12:00:00Z',
        status: 'failed',
        metrics: {
          responseTime: 1550,
        },
        logs: '加载超时',
      },
      {
        id: 'exec-10',
        timestamp: '2026-03-01T12:00:00Z',
        status: 'success',
        metrics: {
          responseTime: 1500,
        },
      },
    ],
  },
  {
    id: 'progress-4',
    krId: 'kr-4',
    executions: [
      {
        id: 'exec-11',
        timestamp: '2026-02-01T09:00:00Z',
        status: 'success',
        metrics: {
          successRate: 99.3,
        },
      },
      {
        id: 'exec-12',
        timestamp: '2026-02-15T09:00:00Z',
        status: 'success',
        metrics: {
          successRate: 99.5,
        },
      },
      {
        id: 'exec-13',
        timestamp: '2026-03-01T09:00:00Z',
        status: 'success',
        metrics: {
          successRate: 99.5,
        },
      },
    ],
  },
  {
    id: 'progress-5',
    krId: 'kr-5',
    executions: [
      {
        id: 'exec-14',
        timestamp: '2026-02-01T13:00:00Z',
        status: 'success',
        metrics: {
          successRate: 99.6,
        },
      },
      {
        id: 'exec-15',
        timestamp: '2026-02-20T13:00:00Z',
        status: 'success',
        metrics: {
          successRate: 99.5,
        },
      },
      {
        id: 'exec-16',
        timestamp: '2026-03-01T13:00:00Z',
        status: 'success',
        metrics: {
          successRate: 99.5,
        },
      },
    ],
  },
];

