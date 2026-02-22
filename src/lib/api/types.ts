/**
 * TypeScript 类型定义
 * 对应后端 Pydantic 模型
 */

// ============ 通用类型 ============
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  skip: number;
  limit: number;
}

// ============ Skill 相关类型 ============
export interface Skill {
  id: number;
  name: string;
  description: string | null;
  source: 'claude_cli' | 'file_scan' | 'manual';
  file_path: string | null;
  content: string | null;
  metadata: Record<string, any> | null;
  usage_count: number;
  avg_rating: number | null;
  created_at: string;
  updated_at: string;
}

export interface SkillCreate {
  name: string;
  description?: string | null;
  source?: 'claude_cli' | 'file_scan' | 'manual';
  file_path?: string | null;
  content?: string | null;
  metadata?: Record<string, any> | null;
}

export interface SkillUpdate {
  name?: string;
  description?: string | null;
  content?: string | null;
  metadata?: Record<string, any> | null;
}

export type SkillListResponse = PaginatedResponse<Skill>;

// ============ Agent 相关类型 ============
export interface Agent {
  id: number;
  name: string;
  description: string | null;
  type: 'single' | 'team';
  config: Record<string, any> | null;
  skill_ids: number[];
  usage_count: number;
  avg_rating: number | null;
  created_at: string;
  updated_at: string;
  skills?: Skill[];
}

export interface AgentCreate {
  name: string;
  description?: string | null;
  type?: 'single' | 'team';
  config?: Record<string, any> | null;
  skill_ids?: number[];
}

export interface AgentUpdate {
  name?: string;
  description?: string | null;
  config?: Record<string, any> | null;
  skill_ids?: number[];
}

export type AgentListResponse = PaginatedResponse<Agent>;

// ============ Team 相关类型 ============
export interface TeamMember {
  agent_id: number;
  role: string;
  priority: number;
}

export interface Team {
  id: number;
  name: string;
  description: string | null;
  members: TeamMember[];
  tags: string[];
  meta: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

export interface TeamCreate {
  name: string;
  description?: string | null;
  members?: TeamMember[];
  tags?: string[];
  meta?: Record<string, any> | null;
}

export interface TeamUpdate {
  name?: string;
  description?: string | null;
  members?: TeamMember[];
  tags?: string[];
  meta?: Record<string, any> | null;
}

export type TeamListResponse = PaginatedResponse<Team>;

// ============ Workflow 相关类型 ============
export interface WorkflowNode {
  id: string;
  type: 'skill' | 'agent' | 'team' | 'condition' | 'loop';
  config: Record<string, any>;
}

export interface WorkflowEdge {
  source: string;
  target: string;
  condition?: string;
}

export interface Workflow {
  id: number;
  name: string;
  description: string | null;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  metadata: Record<string, any> | null;
  usage_count: number;
  avg_rating: number | null;
  created_at: string;
  updated_at: string;
}

export interface WorkflowCreate {
  name: string;
  description?: string | null;
  nodes?: WorkflowNode[];
  edges?: WorkflowEdge[];
  metadata?: Record<string, any> | null;
}

export interface WorkflowUpdate {
  name?: string;
  description?: string | null;
  nodes?: WorkflowNode[];
  edges?: WorkflowEdge[];
  metadata?: Record<string, any> | null;
}

export type WorkflowListResponse = PaginatedResponse<Workflow>;

// ============ Task 相关类型 ============
export interface Task {
  id: number;
  workflow_id: number;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  input_data: Record<string, any> | null;
  output_data: Record<string, any> | null;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  workflow?: Workflow;
}

export interface TaskCreate {
  workflow_id: number;
  input_data?: Record<string, any> | null;
}

export interface TaskUpdate {
  status?: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  output_data?: Record<string, any> | null;
  error_message?: string | null;
}

export type TaskListResponse = PaginatedResponse<Task>;

// ============ Execution 相关类型 ============
export interface ExecutionStep {
  step_id: string;
  node_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  input: Record<string, any> | null;
  output: Record<string, any> | null;
  error: string | null;
  started_at: string | null;
  completed_at: string | null;
}

export interface Execution {
  id: number;
  task_id: number;
  steps: ExecutionStep[];
  metadata: Record<string, any> | null;
  created_at: string;
  updated_at: string;
  task?: Task;
}

export type ExecutionListResponse = PaginatedResponse<Execution>;

// ============ Dashboard 相关类型 ============
export interface DashboardStats {
  total_skills: number;
  total_agents: number;
  total_teams: number;
  total_workflows: number;
  total_tasks: number;
  total_executions: number;
  recent_executions: Execution[];
  popular_skills: Skill[];
  popular_agents: Agent[];
  task_status_distribution: Record<string, number>;
}

// ============ Stats 相关类型 ============
export interface StatsResponse {
  skills: {
    total: number;
    by_source: Record<string, number>;
    top_rated: Skill[];
    most_used: Skill[];
  };
  agents: {
    total: number;
    by_type: Record<string, number>;
    top_rated: Agent[];
    most_used: Agent[];
  };
  teams: {
    total: number;
    top_rated: Team[];
    most_used: Team[];
  };
  workflows: {
    total: number;
    top_rated: Workflow[];
    most_used: Workflow[];
  };
  tasks: {
    total: number;
    by_status: Record<string, number>;
    recent: Task[];
  };
}

// ============ Auth 相关类型 ============
export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: {
    id: number;
    username: string;
    email?: string;
  };
}

// ============ System 相关类型 ============
export interface HealthResponse {
  status: 'healthy' | 'unhealthy';
  version: string;
  timestamp: string;
}
