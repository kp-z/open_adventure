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
| Execution | 执行过程记录与回放（支持 Workflow 和 Agent 测试） |

## 核心功能

### 实时执行监控
- **统一执行历史**：Agent 测试和 Workflow 执行统一展示
- **WebSocket 实时更新**：执行状态变化实时推送（< 500ms 延迟）
- **后台执行支持**：用户可以离开页面，执行继续进行
- **可视化监控**：Dashboard 高亮显示运行中的任务，右下角实时监控

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

## 文件组织规范

### 强制目录规则
**禁止在项目根目录创建以下类型的文件，必须存放到指定目录：**

#### 📸 图片和截图
- **存放位置**: `docs/images/screenshots/`
- **文件类型**: `.png`, `.jpg`, `.jpeg`, `.gif`, `.svg`, `.webp`
- **命名规范**: 使用描述性名称，如 `agents-page.png`, `workflow-editor.png`

#### 📋 日志文件
- **存放位置**: `docs/logs/`
- **子目录**:
  - `docs/logs/` - 主要日志（backend.log, frontend.log, server.log）
  - `docs/logs/playwright/` - Playwright 测试日志
- **文件类型**: `.log`
- **清理策略**: 定期清理旧日志，保留最近 30 天

#### 📄 文档文件
- **技术文档**: `docs/technical/` - 修复记录、实现总结、技术方案
- **发布说明**: `docs/release-notes/` - 版本发布说明
- **使用指南**: `docs/guides/` - 用户指南、开发指南
- **计划文档**: `docs/plans/` - 功能规划、设计方案
- **故障排查**: `docs/troubleshooting/` - 问题排查文档

#### 🎨 设计资源
- **存放位置**: `docs/design/figma-assets/`
- **文件类型**: Figma 导出的图片、SVG、设计稿

#### 📦 发布包
- **存放位置**: `docs/releases/`
- **文件类型**: `.tar.gz`, `.zip`, `.dmg`, `.exe`
- **命名规范**: `{项目名}-v{版本号}-{平台}-{架构}.{扩展名}`
  - 示例: `claude-manager-v0.1.1-macos-arm64.tar.gz`

#### 🔧 脚本文件
- **启动脚本**: 项目根目录（如 `start.sh`, `restart-frontend.sh`）
- **工具脚本**: `scripts/` 目录
- **测试脚本**: `backend/scripts/` 或 `frontend/scripts/`

### 根目录允许的文件
**仅以下类型的文件允许存放在项目根目录：**
- 配置文件: `CLAUDE.md`, `README.md`, `.env`, `.gitignore`
- 依赖管理: `package.json`, `requirements.txt`, `pyproject.toml`
- 启动脚本: `start.sh`, `run.py`
- 数据库文件: 应存放在 `backend/` 目录

### 文档索引
所有文档的索引和导航请查看: `docs/README_INDEX.md`

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

### 文件创建规范
- **禁止在项目根目录创建日志、图片、文档文件**
- 创建文件前必须检查上述"文件组织规范"，将文件放到正确的目录
- 生成截图、日志、文档时，自动使用规范的目录路径
- 如发现根目录有不符合规范的文件，应立即移动到正确位置
