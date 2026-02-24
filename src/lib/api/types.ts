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
// 技能来源枚举
export type SkillSource = 'global' | 'plugin' | 'project';

// 后端返回的 Skill 模型
export interface Skill {
  id: number;
  name: string;              // 技能唯一标识（kebab-case）
  full_name: string;         // 技能显示名称
  type: string;              // 技能类型（analysis/search/documentation/code/data）
  description: string;       // 技能描述
  tags: string[];            // 标签列表
  source: SkillSource;       // 来源：global/plugin/project
  enabled: boolean;          // 是否启用
  meta: Record<string, any> | null;  // 扩展元数据
  created_at: string;
  updated_at: string;
}

export interface SkillCreate {
  name: string;
  full_name: string;
  type: string;
  description: string;
  tags?: string[];
  source?: SkillSource;
  enabled?: boolean;
  meta?: Record<string, any> | null;
  references?: Record<string, string> | null;
  scripts?: Record<string, string> | null;
}

export interface SkillUpdate {
  name?: string;
  full_name?: string;
  type?: string;
  description?: string;
  tags?: string[];
  source?: SkillSource;
  enabled?: boolean;
  meta?: Record<string, any> | null;
}

export type SkillListResponse = PaginatedResponse<Skill>;

// ============ Claude Sync 相关类型 ============
export interface SyncResult {
  skills: { created: number; updated: number; unchanged: number };
  agents: { created: number; updated: number; unchanged: number };
  teams: { created: number; updated: number; unchanged: number };
}

export interface ClaudeHealthResponse {
  cli_available: boolean;
  cli_version: string | null;
  config_dir_exists: boolean;
  skills_dir_exists: boolean;
  plugins_dir_exists: boolean;
  total_skills: number;
  total_agents: number;
  total_teams: number;
}

// ============ Agent 相关类型 - Claude Code Subagent 规范 ============
// 作用域枚举
export type AgentScope = 'builtin' | 'user' | 'project' | 'plugin';

// 权限模式枚举
export type AgentPermissionMode = 'default' | 'acceptEdits' | 'dontAsk' | 'bypassPermissions' | 'plan';

// 模型枚举
export type AgentModel = 'inherit' | 'sonnet' | 'opus' | 'haiku';

// 覆盖信息
export interface AgentOverrideInfo {
  count: number;               // 同名 agent 数量
  scopes: AgentScope[];        // 所有同名 agent 的作用域
  active_scope: AgentScope;    // 当前激活的作用域
}

// 钩子配置
export interface AgentHook {
  type: string;
  command: string;
}

export interface AgentHookMatcher {
  matcher?: string;
  hooks: AgentHook[];
}

export interface AgentHooks {
  PreToolUse?: AgentHookMatcher[];
  PostToolUse?: AgentHookMatcher[];
  Stop?: AgentHookMatcher[];
}

// Claude Code Subagent 完整类型
export interface Agent {
  id: number;
  name: string;                         // 唯一标识符，小写字母和连字符
  description: string;                  // Claude 何时委托给此子代理

  // 系统提示
  system_prompt: string | null;

  // 模型配置
  model: AgentModel;

  // 工具控制
  tools: string[];                      // 允许的工具列表
  disallowed_tools: string[];           // 禁止的工具列表

  // 权限模式
  permission_mode: AgentPermissionMode;

  // 高级配置
  max_turns: number | null;             // 最大轮次
  skills: string[];                     // 预加载的技能列表
  mcp_servers: any[];                   // MCP 服务器配置
  hooks: AgentHooks | null;             // 生命周期钩子
  memory: string | null;                // 持久化内存：user, project, local
  background: boolean;                  // 是否后台运行
  isolation: string | null;             // 隔离模式：worktree

  // 作用域和优先级
  scope: AgentScope;                    // 作用域
  priority: number;                     // 优先级（数字越小越高）

  // 状态标记
  is_builtin: boolean;                  // 是否内置
  is_active: boolean;                   // 是否激活（未被覆盖）
  is_overridden: boolean;               // 是否被更高优先级覆盖
  override_info: AgentOverrideInfo | null;

  // 元数据
  meta: {
    path?: string;                      // 文件路径
    color?: string;                     // 显示颜色
    icon?: string;                      // 图标
    file_format?: 'markdown' | 'json';  // 文件格式
    plugin_name?: string;               // 插件名称
    plugin_version?: string;            // 插件版本
    [key: string]: any;
  } | null;

  // 时间戳
  created_at: string;
  updated_at: string;

  // 向后兼容字段（已弃用）
  capability_ids?: number[];
  source?: string;
  skill_ids?: number[];
  usage_count?: number;
  avg_rating?: number | null;
  type?: string;
}

export interface AgentCreate {
  name: string;                         // 小写字母和连字符
  description: string;
  system_prompt?: string | null;
  model?: AgentModel;
  tools?: string[];
  disallowed_tools?: string[];
  permission_mode?: AgentPermissionMode;
  max_turns?: number | null;
  skills?: string[];
  mcp_servers?: any[];
  hooks?: AgentHooks | null;
  memory?: string | null;
  background?: boolean;
  isolation?: string | null;
  scope?: AgentScope;
  meta?: Record<string, any> | null;
}

export interface AgentUpdate {
  name?: string;
  description?: string;
  system_prompt?: string | null;
  model?: AgentModel;
  tools?: string[];
  disallowed_tools?: string[];
  permission_mode?: AgentPermissionMode;
  max_turns?: number | null;
  skills?: string[];
  mcp_servers?: any[];
  hooks?: AgentHooks | null;
  memory?: string | null;
  background?: boolean;
  isolation?: string | null;
  meta?: Record<string, any> | null;
}

// Agent 列表响应（包含作用域统计）
export interface AgentListResponse {
  total: number;
  items: Agent[];
  builtin_count: number;
  user_count: number;
  project_count: number;
  plugin_count: number;
}

// 同步请求
export interface AgentSyncRequest {
  project_path?: string | null;
  include_builtin?: boolean;
}

// 同步响应
export interface AgentSyncResponse {
  synced: number;
  created: number;
  updated: number;
  deleted: number;
  errors: string[];
}

// 生成请求
export interface AgentGenerateRequest {
  prompt: string;                       // 描述子代理的用途和行为
  scope?: AgentScope;                   // 创建位置
  model?: AgentModel;                   // 使用的模型
  tools_preset?: 'readonly' | 'all' | 'custom';
}

// 生成响应
export interface AgentGenerateResponse {
  name: string;
  description: string;
  system_prompt: string;
  model: string;
  tools: string[];
  suggested_filename: string;
  preview_content: string;              // 完整的 Markdown 文件预览
}

// 文件内容（用于编辑）
export interface AgentFileContent {
  path: string;
  content: string;                      // 完整的 Markdown 内容
  frontmatter: Record<string, any>;     // 解析后的 frontmatter
  body: string;                         // 系统提示（Markdown body）
}

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
  title: string;
  description: string;
  project_path: string | null;
  workflow_id: number | null;
  agent_team_id: number | null;
  status: 'pending' | 'running' | 'succeeded' | 'failed' | 'waiting_user';
  meta: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

export interface TaskCreate {
  title: string;
  description: string;
  project_path?: string | null;
  workflow_id?: number | null;
  agent_team_id?: number | null;
  meta?: Record<string, any> | null;
}

export interface TaskUpdate {
  title?: string;
  description?: string;
  project_path?: string | null;
  workflow_id?: number | null;
  agent_team_id?: number | null;
  status?: 'pending' | 'running' | 'succeeded' | 'failed' | 'waiting_user';
  meta?: Record<string, any> | null;
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
