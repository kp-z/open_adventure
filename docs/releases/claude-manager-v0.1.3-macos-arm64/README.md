# Claude Manager

AI 配置和管理工具 - 全面管理 Claude AI 生态系统中的 Skills、Agents、Teams、Workflows 和 Tasks。

## 项目概述

Claude Manager 是一个基于三层架构的 AI 管理系统，提供：
- **Adapter 层**: 与 Claude Code 集成，扫描和执行本地配置
- **Service 层**: 业务逻辑和工作流编排
- **UI 层**: 现代化的 Web 管理界面

## 功能特性

### 核心功能
- **Skills 管理**: 管理可重用的 AI 技能
- **Agents 管理**: 配置和管理 AI 智能体
- **Agent Teams 管理**: 组织多智能体协作
- **Workflows 管理**: 可视化工作流编排
- **Tasks 管理**: 任务创建和执行
- **Executions 管理**: 执行历史和回放

### 技术特性
- 三层架构（Adapter → Service → UI）
- 异步数据库操作（SQLAlchemy 2.0）
- RESTful API（FastAPI）
- 现代化前端（Next.js 15 + React 19）
- 实时执行监控

## 技术栈

### 后端
- Python 3.14
- FastAPI 0.115+
- SQLAlchemy 2.0 (async)
- Pydantic v2
- Uvicorn
- Alembic

### 前端
- Next.js 15
- React 19
- TypeScript
- Tailwind CSS

### 数据库
- SQLite (开发环境)
- 支持 PostgreSQL/MySQL (生产环境)

## 快速开始

### 前置要求
- Python 3.14+
- Node.js 18+
- Claude Code CLI (可选)

### 安装

#### 1. 后端安装

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

#### 2. 配置环境变量

```bash
cd backend
cp .env.example .env
# 编辑 .env 文件配置必要参数
```

#### 3. 初始化数据库

```bash
cd backend
alembic upgrade head
```

#### 4. 启动后端

```bash
cd backend
python run.py
```

后端将在 http://127.0.0.1:8000 启动

#### 5. 前端安装和启动

```bash
cd frontend
npm install
npm run dev
```

前端将在 http://localhost:3000 启动

### 访问应用

- **前端**: http://localhost:3000
- **后端 API**: http://127.0.0.1:8000
- **API 文档**: http://127.0.0.1:8000/docs

## 项目结构

```
claude_manager/
├── backend/                    # 后端服务
│   ├── app/
│   │   ├── adapters/          # Adapter 层（Claude 集成）
│   │   ├── api/               # API 路由
│   │   ├── config/            # 配置管理
│   │   ├── core/              # 核心功能
│   │   ├── models/            # ORM 模型
│   │   ├── repositories/      # 数据访问层
│   │   ├── schemas/           # Pydantic schemas
│   │   ├── services/          # 业务逻辑层
│   │   └── main.py            # FastAPI 入口
│   ├── alembic/               # 数据库迁移
│   ├── venv/                  # 虚拟环境
│   └── run.py                 # 启动脚本
├── frontend/                   # 前端应用
│   ├── app/                   # Next.js App Router
│   ├── components/            # React 组件
│   ├── lib/                   # 工具库
│   └── public/                # 静态资源
├── docs/                      # 文档
│   ├── development/           # 开发文档
│   ├── deployment/            # 部署文档
│   └── archive/               # 归档文档
├── README.md                  # 项目说明
├── STATUS.md                  # 项目状态
└── Refactor.md                # 重构计划
```

## API 端点

### 系统
- `GET /api/system/health` - 健康检查
- `GET /api/system/status` - 系统状态

### Skills
- `GET /api/skills` - 获取技能列表
- `GET /api/skills/{id}` - 获取技能详情
- `POST /api/skills` - 创建技能
- `PUT /api/skills/{id}` - 更新技能
- `DELETE /api/skills/{id}` - 删除技能

### Agents
- `GET /api/agents` - 获取智能体列表
- `GET /api/agents/{id}` - 获取智能体详情
- `POST /api/agents` - 创建智能体
- `PUT /api/agents/{id}` - 更新智能体
- `DELETE /api/agents/{id}` - 删除智能体

### Agent Teams
- `GET /api/agent-teams` - 获取队伍列表
- `GET /api/agent-teams/{id}` - 获取队伍详情
- `POST /api/agent-teams` - 创建队伍
- `PUT /api/agent-teams/{id}` - 更新队伍
- `DELETE /api/agent-teams/{id}` - 删除队伍

### Workflows
- `GET /api/workflows` - 获取工作流列表
- `GET /api/workflows/{id}` - 获取工作流详情
- `POST /api/workflows` - 创建工作流
- `PUT /api/workflows/{id}` - 更新工作流
- `DELETE /api/workflows/{id}` - 删除工作流

### Tasks
- `GET /api/tasks` - 获取任务列表
- `GET /api/tasks/{id}` - 获取任务详情
- `POST /api/tasks` - 创建任务
- `PUT /api/tasks/{id}` - 更新任务
- `DELETE /api/tasks/{id}` - 删除任务

### Executions
- `GET /api/executions` - 获取执行列表
- `GET /api/executions/{id}` - 获取执行详情
- `GET /api/executions/{id}/nodes` - 获取节点执行记录
- `POST /api/executions/{task_id}/start` - 启动任务执行

### Claude 同步
- `POST /api/claude/sync` - 完整同步
- `POST /api/claude/sync/skills` - 同步技能
- `POST /api/claude/sync/agents` - 同步智能体
- `POST /api/claude/sync/agent-teams` - 同步队伍
- `GET /api/claude/health` - Claude 环境健康检查

## 开发指南

详细的开发文档请查看：
- [开发指南](docs/development/AI_GENERATION_GUIDE.md)
- [安装指南](docs/development/AUTO_INSTALL_GUIDE.md)
- [Claude 集成](docs/development/CLAUDE_CODE_INTEGRATION_V2.md)

## 部署

详细的部署文档请查看：
- [部署指南](docs/deployment/DEPLOYMENT.md)

## 项目状态

当前进度：**Phase 4 完成**

查看详细状态：[STATUS.md](STATUS.md)

## 开发路线图

- ✅ Phase 0: 项目骨架搭建
- ✅ Phase 1: 核心领域模型
- ✅ Phase 2: ClaudeAdapter 实现
- ✅ Phase 3: 前端集成
- ✅ Phase 4: 工作流执行引擎
- 🚧 Phase 5: 可视化编辑器
- 📋 Phase 6: 深度协作
- 📋 Phase 7: 配置导出/分享

## 贡献

欢迎提交 Issue 和 Pull Request！

## 许可证

MIT License

## 联系方式

如有问题或建议，请提交 Issue。
