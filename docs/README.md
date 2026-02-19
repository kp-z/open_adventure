# Claude Manager 文档中心

欢迎来到 Claude Manager 文档中心。这里包含了项目的所有文档资源。

## 📚 文档导航

### 快速开始
- [项目概述](../README.md) - 项目介绍和快速开始指南
- [项目状态](../STATUS.md) - 当前开发进度和功能清单
- [重构计划](../Refactor.md) - 完整的架构设计和分阶段计划

### 开发文档
- [AI 生成指南](development/AI_GENERATION_GUIDE.md) - 使用 AI 辅助开发的指南
- [安装指南](development/AUTO_INSTALL_GUIDE.md) - 详细的安装和配置步骤
- [Claude 集成 V2](development/CLAUDE_CODE_INTEGRATION_V2.md) - Claude Code 集成文档

### 部署文档
- [部署指南](deployment/DEPLOYMENT.md) - 生产环境部署指南

### 归档文档
以下文档已过时，仅供参考：
- [重构分析](archive/REFACTOR_ANALYSIS.md) - 早期重构分析报告
- [API 测试报告](archive/API_TEST_REPORT.md) - 早期 API 测试报告
- [API 文档状态](archive/API_DOCUMENTATION_STATUS.md) - 早期 API 文档状态
- [API 文档完成](archive/API_DOCUMENTATION_COMPLETED.md) - 早期 API 文档
- [Claude 集成 V1](archive/CLAUDE_CODE_INTEGRATION.md) - 旧版集成文档

---

## 🏗️ 项目架构

Claude Manager 采用三层架构：

```
┌─────────────────────────────────────────┐
│           Frontend (UI Layer)           │
│    Next.js 15 + React 19 + TypeScript   │
└─────────────────────────────────────────┘
                    ↓ HTTP/REST
┌─────────────────────────────────────────┐
│        Backend (Service Layer)          │
│         FastAPI + SQLAlchemy            │
│  ┌─────────────────────────────────┐   │
│  │   Services (Business Logic)     │   │
│  └─────────────────────────────────┘   │
│  ┌─────────────────────────────────┐   │
│  │   Repositories (Data Access)    │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│       Adapter Layer (Integration)       │
│         ClaudeAdapter + Sync            │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│          Claude Code / CLI              │
│    Skills / Agents / Teams / Plugins    │
└─────────────────────────────────────────┘
```

---

## 🎯 核心概念

### Skills (技能)
可重用的 AI 能力单元，可以是全局技能、插件技能或项目技能。

### Agents (智能体)
配置了特定系统提示和能力的 AI 代理，可以执行复杂任务。

### Agent Teams (队伍)
多个智能体的协作组合，用于处理需要多角色配合的任务。

### Workflows (工作流)
由多个节点和边组成的 DAG（有向无环图），定义任务执行流程。

### Tasks (任务)
工作流的实例化，代表一次具体的执行请求。

### Executions (执行记录)
任务执行的完整记录，包括每个节点的执行状态和结果。

---

## 🔧 技术栈

### 后端
- **框架**: FastAPI 0.115+
- **ORM**: SQLAlchemy 2.0 (async)
- **数据验证**: Pydantic v2
- **数据库**: SQLite (开发) / PostgreSQL (生产)
- **迁移**: Alembic
- **服务器**: Uvicorn

### 前端
- **框架**: Next.js 15 (App Router)
- **UI 库**: React 19
- **语言**: TypeScript
- **样式**: Tailwind CSS
- **HTTP 客户端**: Fetch API

### 开发工具
- **Python**: 3.14+
- **Node.js**: 18+
- **包管理**: pip (Python) / npm (Node.js)

---

## 📖 API 文档

启动后端服务后，访问以下地址查看完整的 API 文档：

- **Swagger UI**: http://127.0.0.1:8000/docs
- **ReDoc**: http://127.0.0.1:8000/redoc

### API 端点概览

| 模块 | 端点 | 说明 |
|------|------|------|
| System | `/api/system/health` | 健康检查 |
| System | `/api/system/status` | 系统状态 |
| Skills | `/api/skills` | 技能 CRUD |
| Agents | `/api/agents` | 智能体 CRUD |
| Teams | `/api/agent-teams` | 队伍 CRUD |
| Workflows | `/api/workflows` | 工作流 CRUD |
| Tasks | `/api/tasks` | 任务 CRUD |
| Executions | `/api/executions` | 执行记录和控制 |
| Claude | `/api/claude/sync` | Claude 数据同步 |
| Claude | `/api/claude/health` | Claude 环境检查 |

---

## 🚀 开发路线图

- ✅ **Phase 0**: 项目骨架搭建
- ✅ **Phase 1**: 核心领域模型
- ✅ **Phase 2**: ClaudeAdapter 实现
- ✅ **Phase 3**: 前端集成
- ✅ **Phase 4**: 工作流执行引擎
- 🚧 **Phase 5**: 可视化编辑器 + 游戏化 UI
- 📋 **Phase 6**: 深度协作 + 自动编队
- 📋 **Phase 7**: 配置导出/分享 + 多框架支持

---

## 🤝 贡献指南

欢迎贡献代码、报告问题或提出建议！

### 开发流程
1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

### 代码规范
- 后端: 遵循 PEP 8
- 前端: 遵循 ESLint 配置
- 提交信息: 使用清晰的描述性信息

---

## 📝 许可证

MIT License

---

## 📧 联系方式

如有问题或建议，请提交 Issue。

---

最后更新: 2024-01
