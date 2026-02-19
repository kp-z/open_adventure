# Claude Manager 重构计划

下面是一份可以直接给「代码 AI」执行的完整计划书，用表格先总览分期，再展开系统架构和目录结构细节。

## 一、分阶段总览（给 AI 的执行蓝图）

| 阶段 | 目标 | 主要工作内容（按层拆分） | 关键产出 |
| :--- | :--- | :--- | :--- |
| **Phase 0** | 搭建基础项目骨架 | **所有层**：后端 Python+FastAPI 项目框架；前端 TS+React/Next 项目框架；预置三层结构（adapter / services / ui），配置管理和日志基础 | 后端与前端基础仓库；运行正常的健康检查接口和空壳页面 |
| **Phase 1** | 建立核心领域模型 + 数据持久化 | **Domain Service 层**：围绕 Skills / Agents / AgentTeams / Workflows / Tasks 设计数据模型和存储（例如 SQLite+ORM）；**Adapter 层**：只定义接口，不接 Claude；**前端**：无或极简 stub | 数据库 schema、ORM 模型、基础 CRUD API（不依赖 Claude） |
| **Phase 2** | 实现 ClaudeAdapter，完成本地同步（只读） | **Adapter 层**：实现与 Claude Code 的文件系统/CLI 交互，扫描 skills/agents/plugins/agent teams 信息；**  层**：同步逻辑，将扫描结果映射到 Skills/Agents/AgentTeams 模型；**前端**：基础列表页展示 | `ClaudeAdapter` 初版；同步 API；能在 UI 中看到本地 Claude 生态实体 |
| **Phase 3** | 搭建「我的家 / Home」Dashboard + 管理列表 | **前端 UI**：实现 Home 仪表盘（我的家）+ Skills / Agents / AgentTeams / Workflows / Tasks 管理列表 + 详情视图；**Service 层**：补齐查询聚合接口（统计、最近任务）；**Adapter 层**：增加系统状态检查 | 完整的管理端（专业视图）+ 游戏化风格的 Home 雏形 |
| **Phase 4** | 引入 Workflow 编排与 Task 执行引擎（顺序执行） | **Service 层**：实现 Workflow 引擎（节点 DAG 校验、顺序/简单并行执行）、Task 执行状态机；**Adapter 层**：通过 Claude Code 调用 skills 或 agents 执行单节点任务；**UI**：任务详情页 + 节点执行时间轴（战斗回放初版） | 可以实际执行一个 Workflow，将 Task 拆成多个节点调用 Claude 并记录执行结果 |
| **Phase 5** | Workflow 可视化编辑器 + 完整「我的家」+ 游戏化 UI | **UI 层**：Workflow 可视化编辑器（节点/连线）、Home 卡片和「我的英雄/技能/队伍」子页的游戏化视图，支持模式切换（游戏 / 专业）；**Service 层**：为编辑器提供 Workflow CRUD + 校验；**Adapter 层**：保持不变 | 可视化拖拽工作流 + 游戏化总控台（主城 / 我的家），但仍是严肃可用的管理工具 |
| **Phase 6** | 引入 AgentTeam 深度协作 + 自动编队策略 | **Adapter 层**：对接 Claude agent teams（启动、监控多 session）；**Service 层**：自动队伍编排算法、统计与评分（成功率、耗时等），根据统计推荐技能/队伍/工作流；**UI**：战斗记录中展示多 Agent 协作视图，英雄/队伍评分 | 多智能体真实协作执行复杂 Workflow，有数据驱动的「最优 build」和养成感 |
| **Phase 7** | 导出/分享配置 + 插件化扩展其它框架 | **Adapter 层**：抽象出 Provider 接口，使 ClaudeAdapter 成为其一实现；**Service 层**：配置导出/导入（skills / agents / agentTeams / workflows / tasks 模板）；**UI**：导出/导入面板、分享「build」 | 可以把本地 AI 配置当作资产分享、备份，后续扩展到其他 LLM/Agent 框架 |

## 二、系统架构（3 层清晰边界）

### 2.1 Adapter 层

**职责**: 和具体 AI 运行环境打交道（当前是 Claude Code，未来可扩展）

-   **ClaudeFileScanner**: 扫描本地文件系统
    -   路径: `~/.claude/skills/`、项目目录 `.claude/skills/`、插件目录 `plugins/*/skills` 等
    -   输出: 标准化的 skill/agent/agentTeam 元数据结构
-   **ClaudeCliClient / ClaudeSessionManager**:
    -   负责启动/复用 Claude Code 会话（或通过 CLI、HTTP 调用）
    -   支持:
        -   调用指定 skill 执行一次任务
        -   使用指定 agent 或 agent team 执行一段多轮对话/操作
-   **ClaudeHealthChecker**:
    -   检查 `claude` 命令是否可用、版本号、配置目录是否可读
-   **AdapterProvider 抽象接口**:
    -   `SkillProvider`、`AgentProvider`、`AgentTeamProvider`、`WorkflowExecutionProvider` 等；
    -   `ClaudeAdapter` 是这些接口的一个实现，为未来加入其他框架留出空间。

### 2.2 Domain Service 层

**命名**: 全部用「技能、agent、队伍、workflow、task」，不引入游戏词汇：

-   **SkillsService**
    -   管理所有技能（包括本地技能、插件技能等）
    -   功能: 分页查询、按项目/插件/类型过滤、标记为「常用」或「禁用」、更新元数据注释
-   **AgentsService**
    -   管理 agents（Claude subagents/agents 的抽象）：
    -   功能: 查看/编辑 agent 元信息（描述、模型）、关联 skills、分类管理（比如「后端」「前端」「文档」）
-   **AgentTeamsService**
    -   管理 agent team 配置（本地定义的队伍）
    -   功能: 创建/编辑队伍成员列表、角色标记（leader / worker / reviewer）、队伍适用场景标签
-   **WorkflowsService**
    -   Workflow 模型: 节点 + 有向边组成的图，节点类型为 task / decision / parallel gateway
    -   功能: 创建/编辑 workflow，做 DAG 合法性校验（无环、入度/出度约束）、版本管理
-   **TasksService**
    -   Task 模型: 一次具体请求（绑定工作流的实例化起点）
    -   功能: 创建任务、管理状态（pending/running/waiting_user/succeeded/failed）、与 workflow 建立关联
-   **ExecutionService / ExecutionEngine**
    -   核心执行:
        -   根据 workflow 与 task，生成节点拓扑序
        -   管理每个节点的执行：选择 agentTeam 或单 agent → 调用 Adapter → 收集结果
        -   支持串行+并行节点执行、重试策略、用户交互中断（等待用户输入）
    -   记录执行过程到 Execution 模型和日志表/文件，供 UI「战斗回放」
-   **StatsService**
    -   统计成功率、平均耗时、常用技能和队伍表现
    -   为自动编队和推荐提供数据支持。

### 2.3 前端 UI 层

两种表现形式，共用同一套后端 API：

1.  **专业管理界面（面向工程师）**
    -   列表 + 表单 + 图表风格
    -   视图: Skills、Agents、AgentTeams、Workflows、Tasks、Executions、Settings
    -   强调效率和信息密度
2.  **游戏化界面（面向日常使用 / 展示）**
    -   **Home / 我的家**: Dashboard + 卡片
    -   **子页**:
        -   我的英雄（映射 Agents）
        -   我的技能（映射 Skills）
        -   我的队伍（映射 AgentTeams）
        -   副本/流程（映射 Workflows）
        -   战斗记录（映射 Executions）
    -   支持在 Settings 中切换模式（游戏 / 专业），只是 UI 皮肤不同，业务语义一致。

## 三、后端目录树（建议给 AI 固定下来）

以 Python 为例 (FastAPI):

```
backend/
├── pyproject.toml / requirements.txt
└── app/
    ├── main.py                  # FastAPI 入口
    ├── config/
    │   ├── __init__.py
    │   └── settings.py            # 读取环境变量、路径配置 (Claude CLI 路径、skills 目录等)
    ├── adapters/
    │   ├── __init__.py
    │   ├── base.py                # 抽象接口定义: SkillProvider, AgentProvider, AgentTeamProvider, WorkflowExecutionProvider
    │   └── claude/
    │       ├── __init__.py
    │       ├── file_scanner.py      # 扫描 Claude skills/agents/plugins
    │       ├── cli_client.py        # 调用 claude CLI / 会话管理
    │       ├── health_checker.py    # 检查 Claude 环境
    │       └── provider.py          # 实现 base.py 中的接口，组合 scanner + cli
    ├── models/
    │   ├── __init__.py
    │   ├── db_base.py             # ORM Base
    │   ├── skills.py
    │   ├── agents.py
    │   ├── agent_teams.py
    │   ├── workflows.py
    │   ├── tasks.py
    │   └── executions.py
    ├── repositories/
    │   ├── __init__.py
    │   ├── skills_repo.py
    │   ├── agents_repo.py
    │   ├── agent_teams_repo.py
    │   ├── workflows_repo.py
    │   ├── tasks_repo.py
    │   └── executions_repo.py
    ├── services/
    │   ├── __init__.py
    │   ├── skills_service.py
    │   ├── agents_service.py
    │   ├── agent_teams_service.py
    │   ├── workflows_service.py
    │   ├── tasks_service.py
    │   ├── execution_service.py
    │   └── stats_service.py
    ├── api/
    │   ├── __init__.py
    │   ├── deps.py                # 依赖注入（获取 service、db session 等）
    │   └── routers/
    │       ├── __init__.py
    │       ├── health.py            # /api/system/status
    │       ├── skills.py            # /api/skills
    │       ├── agents.py            # /api/agents
    │       ├── agent_teams.py       # /api/agent-teams
    │       ├── workflows.py         # /api/workflows
    │       ├── tasks.py             # /api/tasks
    │       ├── executions.py        # /api/executions
    │       └── claude_sync.py       # /api/claude/sync
    └── core/
        ├── __init__.py
        ├── logging.py
        ├── exceptions.py
        └── utils.py
```

## 四、前端目录树（React / Next.js 示例）

```
frontend/
├── package.json
└── src/
    ├── app/ or pages/
    │   ├── _app.tsx / layout.tsx
    │   ├── index.tsx                # Home / 我的家
    │   ├── skills/
    │   │   ├── index.tsx              # 技能列表
    │   │   └── [id].tsx               # 技能详情
    │   ├── agents/
    │   │   ├── index.tsx
    │   │   └── [id].tsx
    │   ├── agent-teams/
    │   │   ├── index.tsx
    │   │   └── [id].tsx
    │   ├── workflows/
    │   │   ├── index.tsx
    │   │   └── [id].tsx               # workflow 可视化编辑 & 详情
    │   ├── tasks/
    │   │   ├── index.tsx
    │   │   └── [id].tsx               # 任务详情 + 执行记录时间轴
    │   └── settings/
    │       └── index.tsx
    ├── components/
    │   ├── layout/
    │   │   ├── Sidebar.tsx
    │   │   ├── Topbar.tsx
    │   │   └── HomeDashboard.tsx      # 我的家主视图卡片
    │   ├── skills/
    │   │   ├── SkillList.tsx
    │   │   └── SkillDetail.tsx
    │   ├── agents/
    │   │   ├── AgentCard.tsx
    │   │   └── AgentList.tsx
    │   ├── agent-teams/
    │   │   └── AgentTeamEditor.tsx
    │   ├── workflows/
    │   │   ├── WorkflowGraphEditor.tsx
    │   │   └── WorkflowNodeEditor.tsx
    │   ├── tasks/
    │   │   ├── TaskList.tsx
    │   │   ├── TaskTimeline.tsx
    │   │   └── ExecutionLogViewer.tsx
    │   └── common/
    │       ├── StatsCards.tsx
    │       ├── DataTable.tsx
    │       └── ModeToggle.tsx         # 游戏模式/专业模式开关
    ├── styles/
    │   ├── globals.css
    │   └── theme.css                # 不同 UI 模式下的主题
    └── lib/
        ├── apiClient.ts             # 封装后端 HTTP 调用
        ├── types.ts                 # 前端用的类型与后端模型对齐
        └── adapters/                # 如果需要前端层的一些数据映射
```

## 五、以 Service 模型为中心的数据视图表

| 模块 (Service) | 主数据实体 | 关键字段（仅结构级，方便 AI 对齐） | 与其它模块关系 |
| :--- | :--- | :--- | :--- |
| **SkillsService** | Skill | `id`, `name`, `fullName(namespace)`, `type`, `description`, `tags`, `source(provider/plugin/project)`, `enabled` | Agents 通过多对多关联使用 Skills；Execution 节点中可以引用推荐 Skill 列表 |
| **AgentsService** | Agent | `id`, `name`, `description`, `systemPrompt`, `model`, `capabilityIds(Skills)`, `source`, `metadata` | AgentTeam 成员引用 Agent；Task/Workflow 节点可以指定首选 Agent |
| **AgentTeamsService** | AgentTeam | `id`, `name`, `description`, `members(actorId, role, priority)`, `tags` | Workflow 节点可绑定 AgentTeam；ExecutionEngine 根据 AgentTeam 调用 Adapter |
| **WorkflowsService** | Workflow, WorkflowNode, WorkflowEdge | **Workflow**: `id`, `name`, `description`, `version`, `active`；**Node**: `id`, `name`, `type`, `workflowId`, `agentTeamId?`, `preferredAgentIds?`, `capabilityFilterIds?`, `config`；**Edge**: `fromNodeId`, `toNodeId`, `condition?` | Task 通过 `workflowId` 与 Workflow 关联；Execution 中 `NodeExecution` 按 `workflowNodeId` 进行映射 |
| **TasksService** | Task | `id`, `title`, `description`, `projectPath?`, `workflowId?`, `agentTeamId?`, `status`, `createdAt`, `updatedAt`, `metadata` | Execution 一对一关联 Task；Task 在 UI 中是创建/重跑工作流的入口 |
| **ExecutionService** | Execution, NodeExecution | **Execution**: `id`, `taskId`, `workflowId`, `createdAt`, `finishedAt?`；**NodeExecution**: `executionId`, `nodeId`, `status`, `startedAt`, `finishedAt`, `logsPath`, `outputSummary` | 提供给 UI 的「战斗回放」和统计基础数据 |

## 六、每个阶段交给 AI 的「执行要点」简表

| 阶段 | 后端要点 | 前端要点 | 跨层约束 |
| :--- | :--- | :--- | :--- |
| **Phase 0** | 固定目录结构；实现空的 health API；配置加载 & 日志；不写任何业务逻辑 | 搭建路由，Home 显示「系统正常」占位；统一 API client | 约定 API 前缀 `/api`，统一错误返回结构 |
| **Phase 1** | 实现 ORM + migration；完成 Skills/Agents/AgentTeams/Workflows/Tasks/Executions 的 schema 和仓储 + 服务接口；暴露基础 CRUD API | 暂时只做简单列表/详情开发者模式；可以用假数据 | 所有字段命名严格对应表设计，避免后面类型错乱 |
| **Phase 2** | 实现 `ClaudeFileScanner` + `ClaudeHealthChecker`；`ClaudeProvider` 实现 Skill/Agent/AgentTeam 的加载接口；新增 `/api/claude/sync` | 在 Home 与列表页增加「同步 Claude」按钮和状态提示 | 把 Claude 元数据映射为 Skill/Agent/AgentTeam，而不是直接在 UI 层解析文件 |
| **Phase 3** | 增加 `StatsService`，提供计数、成功率、最近任务的聚合 API；丰富查询过滤参数 | 实现 Home Dashboard 卡片和「我的英雄/技能/队伍」子页；表格列表 + 详情页；支持模式切换开关 | UI 不直接做业务聚合，全部调用 `StatsService` API |
| **Phase 4** | 实现 `ExecutionEngine`：workflow DAG 校验、顺序/简单并行节点执行、状态更新、日志记录；Adapter 增加「执行节点」接口 | 任务创建页、任务详情页、节点执行时间轴视图；显示实时状态 | 任务执行过程只能通过 service 调用 adapter，禁止 UI 直接调用 adapter |
| **Phase 5** | 为可视化编辑器提供 workflow CRUD + 校验 API；增加 workflow 模板能力 | 实现 `WorkflowGraphEditor` 可视化节点/连线；Home 游戏化 UI；英雄/技能/队伍视图换皮 | 确保游戏模式 UI 完全复用专业模式 API，不新增任何背离架构的调用 |
| **Phase 6** | Adapter 接入 Claude agent team；`ExecutionEngine` 支持多 agent 协作；`StatsService` 输出 per-agent 与 per-team 统计 | 在执行回放中区分不同 Agent 的行动；在英雄和队伍页面显示评分/熟练度 | 所有评分与统计基于真实 Execution 数据，不在 UI 虚构 |
| **Phase 7** | 提供配置导出/导入 API（JSON），定义稳定 schema；抽象 `AdapterProvider` 接口，`ClaudeAdapter` 作为实现之一 | 在设置页增加「导出/导入配置」和「选择 Provider」UI | 导出数据结构尽量与 domain 模型一致，避免双重 schema |

---

这份计划已经把三层架构、目录结构、核心数据模型和分阶段目标都拆清楚了。你可以直接从 Phase 0 开始，把对应阶段片段丢给 AI，让它逐步实现，每个阶段完成后再进入下一阶段，而不会丢失现在我们已经建立好的整体设计和命名体系。
