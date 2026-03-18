# 🎮 前端测试指南

**创建日期**: 2026-03-17
**状态**: ✅ 准备就绪

---

## ✅ 系统状态

### 后端服务
- ✅ 运行中：http://localhost:38080
- ✅ API 健康检查通过
- ✅ 版本：v0.1.3

### 前端服务
- ✅ 运行中：http://localhost:5173
- ✅ 构建成功（3.74s）
- ✅ PWA 已生成

---

## 🚀 快速开始

### 1. 打开前端界面
在浏览器中访问：
```
http://localhost:5173
```

### 2. 测试核心功能

#### Dashboard（仪表盘）
- 访问：http://localhost:5173
- 功能：
  - 查看系统概览
  - 查看最近执行的任务
  - 查看统计数据

#### Agents（智能体管理）
- 访问：http://localhost:5173/agents
- 功能：
  - 查看所有 Agent
  - 创建新 Agent
  - 编辑 Agent 配置
  - 测试 Agent

#### Agent Test（Agent 测试）
- 访问：http://localhost:5173/agent-test
- 功能：
  - 与 Agent 对话
  - 实时查看 Agent 响应
  - 测试 Agent 能力

#### Skills（技能管理）
- 访问：http://localhost:5173/skills
- 功能：
  - 查看所有 Skills
  - 创建新 Skill
  - 编辑 Skill 配置

#### Workflows（工作流管理）
- 访问：http://localhost:5173/workflows
- 功能：
  - 查看所有 Workflow
  - 创建新 Workflow
  - 可视化编辑 Workflow

#### Teams（团队管理）
- 访问：http://localhost:5173/teams
- 功能：
  - 查看所有 AgentTeam
  - 创建新 Team
  - 配置 Team 成员

#### History（执行历史）
- 访问：http://localhost:5173/history
- 功能：
  - 查看所有执行记录
  - 查看执行详情
  - 实时监控运行中的任务

---

## 🎮 Godot 游戏模式测试

### 1. 打开 Godot 项目
```bash
cd /Users/kp/项目/Proj/claude_manager/microverse
open -a Godot project.godot
```

### 2. 运行测试场景
- 在 Godot 编辑器中打开：`scene/AgentRuntimeTest.tscn`
- 按 `F6` 运行当前场景

### 3. 测试游戏内功能
- **对话系统**：点击"打开对话"按钮，与 Agent 对话
- **任务监控**：点击"打开监控面板"，查看任务状态
- **任务控制**：点击"开始工作"，启动新任务

---

## 🔧 API 端点测试

### 健康检查
```bash
curl http://localhost:38080/api/system/health
```

### 获取 Agent 列表
```bash
curl http://localhost:38080/api/agents
```

### 创建对话
```bash
curl -X POST http://localhost:38080/api/agent/conversations \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": 1,
    "character_name": "Alice",
    "initial_message": "你好，我需要帮助"
  }'
```

### 发送消息
```bash
curl -X POST http://localhost:38080/api/agent/conversations/1/messages \
  -H "Content-Type: application/json" \
  -d '{
    "content": "帮我创建一个 Python 脚本",
    "sender": "user"
  }'
```

### 启动任务
```bash
curl -X POST http://localhost:38080/api/agent/executions \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": 1,
    "task_description": "创建一个简单的 Python 脚本",
    "context": {}
  }'
```

### 获取任务列表
```bash
curl http://localhost:38080/api/agent/executions
```

---

## 📊 测试场景

### 场景 1：创建并测试 Agent
1. 访问 http://localhost:5173/agents
2. 点击"创建 Agent"
3. 填写 Agent 信息：
   - 名称：TestAgent
   - 描述：测试用 Agent
   - 能力：代码生成
4. 保存 Agent
5. 访问 http://localhost:5173/agent-test
6. 选择 TestAgent
7. 输入测试消息："帮我写一个 Hello World"
8. 查看 Agent 响应

### 场景 2：创建并执行 Workflow
1. 访问 http://localhost:5173/workflows
2. 点击"创建 Workflow"
3. 添加节点：
   - Agent 节点（代码生成）
   - Agent 节点（代码审查）
4. 连接节点
5. 保存 Workflow
6. 点击"执行"
7. 在 History 页面查看执行状态

### 场景 3：Godot 游戏内对话
1. 打开 Godot 项目
2. 运行 AgentRuntimeTest 场景
3. 点击"打开对话"
4. 输入："你好，帮我创建一个游戏脚本"
5. 查看 Agent 回复
6. 点击"打开监控面板"
7. 查看任务执行状态

---

## 🐛 故障排查

### 前端无法访问
```bash
# 检查前端进程
ps aux | grep "vite"

# 重启前端
cd /Users/kp/项目/Proj/claude_manager/frontend
npm run dev
```

### 后端无法访问
```bash
# 检查后端进程
ps aux | grep "uvicorn"

# 重启后端
cd /Users/kp/项目/Proj/claude_manager
./start.sh
```

### API 请求失败
1. 检查 CORS 配置
2. 检查后端日志：`tail -f backend/logs/app.log`
3. 检查前端控制台错误

### Godot 无法连接后端
1. 确认后端运行：`curl http://localhost:38080/api/system/health`
2. 检查 Godot 控制台错误
3. 确认 API 客户端配置：`microverse/script/api/MicroverseAPIClient.gd`

---

## 📚 相关文档

- **Godot 快速启动**: `GODOT_QUICK_START.md`
- **Godot 完成报告**: `docs/godot-game-mode-completion-report.md`
- **架构设计**: `docs/plans/godot-agent-runtime-architecture.md`
- **API 文档**: 访问 http://localhost:38080/docs

---

## ✨ 下一步

1. **测试核心功能** - 按照上述场景测试
2. **创建自定义 Agent** - 根据需求创建专用 Agent
3. **设计 Workflow** - 组合多个 Agent 完成复杂任务
4. **游戏集成** - 将 Agent 系统集成到你的游戏中

---

**准备就绪！现在你可以开始测试了！** 🎮

## 🌐 快速访问链接

- 前端界面：http://localhost:5173
- API 文档：http://localhost:38080/docs
- 健康检查：http://localhost:38080/api/system/health
