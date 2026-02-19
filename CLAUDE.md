# Claude Manager 项目上下文

## 项目概述
Claude Manager 是一个管理 Claude AI 生态的系统，包含技能(Skills)、智能体(Agents)、队伍(AgentTeams)、工作流(Workflows)和任务(Tasks)的统一管理平台。

## 核心架构
三层架构设计：
- **Adapter 层**: 对接 AI 运行环境（Claude Code CLI、文件系统扫描）
- **Service 层**: 核心业务逻辑（Skills/Agents/AgentTeams/Workflows/Tasks/Execution 管理）
- **UI 层**: 双模式界面（专业管理视图 + 游戏化视图）

## 技术栈
- **后端**: Python + FastAPI + SQLite/ORM
- **前端**: TypeScript + React/Next.js
- **AI 集成**: Claude Code CLI + 文件系统扫描

## 核心实体
| 实体 | 职责 |
|------|------|
| Skill | 可复用的 AI 能力单元 |
| Agent | 具备特定能力的智能体 |
| AgentTeam | 多智能体协作队伍 |
| Workflow | 节点+边组成的 DAG 流程 |
| Task | 工作流的实例化执行 |
| Execution | 执行过程记录与回放 |

## 目录结构
```
backend/app/
├── adapters/claude/    # Claude 环境适配
├── models/             # ORM 数据模型
├── repositories/       # 数据访问层
├── services/           # 业务逻辑层
└── api/routers/        # REST API 路由

frontend/src/
├── app/                # 页面路由
├── components/         # UI 组件
└── lib/                # API 客户端
```

## 开发阶段
- **Phase 0**: 项目骨架
- **Phase 1**: 数据模型 + CRUD
- **Phase 2**: Claude 适配器 + 同步
- **Phase 3**: Dashboard + 管理界面
- **Phase 4**: Workflow 执行引擎
- **Phase 5**: 可视化编辑器 + 游戏化 UI
- **Phase 6**: AgentTeam 协作
- **Phase 7**: 配置导出 + 插件化

## 设计原则
1. **严格分层**: Adapter/Service/UI 职责清晰，禁止跨层调用
2. **业务语义统一**: 后端用专业术语，前端可换皮但不改语义
3. **数据驱动**: 统计、推荐、评分基于真实 Execution 数据
4. **可扩展**: Adapter 抽象接口，支持未来接入其他 AI 框架

---

## AI 助手行为规则

### 语言要求
- 所有回复必须使用中文

### 回复格式
- 每次回复开头必须添加"小张人呢？"

### 工作流程
1. 接收用户指令
2. 使用 prompt_optimizer 技能优化理解
3. 向用户确认优化后的理解
4. 获得确认后执行任务

### 代码规范
- 遵循三层架构，禁止跨层调用
- 命名使用英文专业术语（Skill/Agent/AgentTeam/Workflow/Task/Execution）
- 前端 UI 可游戏化，但 API 和数据模型保持专业
- 所有统计和评分基于真实数据，不虚构
