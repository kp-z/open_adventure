# 🎮 Godot 游戏模式快速启动指南

**创建日期**: 2026-03-17
**状态**: ✅ 准备就绪

---

## ✅ 系统状态

### 后端服务
- ✅ 后端已启动：http://localhost:38080
- ✅ API 健康检查通过
- ✅ 10 个 Agent API 端点已就绪

### Godot 项目
- ✅ 核心 GDScript 文件已创建（15+ 个）
- ✅ 测试场景已创建：`scene/AgentRuntimeTest.tscn`
- ✅ 像素 Shader 已实现（3 个）

---

## 🚀 启动步骤

### 1. 确认后端运行
```bash
curl http://localhost:38080/api/system/health
# 应该返回：{"status":"healthy","app_name":"Open Adventure","version":"0.1.3"}
```

### 2. 打开 Godot 项目
```bash
cd /Users/kp/项目/Proj/claude_manager/microverse
open -a Godot project.godot
```

### 3. 运行测试场景
在 Godot 编辑器中：
1. 打开场景：`scene/AgentRuntimeTest.tscn`
2. 点击右上角的"运行当前场景"按钮（▶️）
3. 或按快捷键：`F6`

---

## 🎮 测试功能

### 1. 对话系统测试
- 点击"打开对话"按钮
- 在输入框输入消息（例如："你好，帮我创建一个 Python 脚本"）
- 按 Enter 发送
- 查看 Agent 的回复

### 2. 任务监控测试
- 点击"打开监控面板"按钮
- 查看当前运行的任务列表
- 点击任务查看详细信息
- 实时查看任务状态变化

### 3. 任务控制测试
- 点击"开始工作"按钮
- 输入任务描述
- 选择 Agent
- 点击"启动任务"
- 在监控面板查看任务执行

---

## 📁 核心文件位置

### GDScript 脚本
```
microverse/script/
├── ui/
│   ├── AgentDialogSystem.gd      # 对话系统（237 行）
│   ├── TaskMonitorPanel.gd       # 任务监控（344 行）
│   ├── TaskControlPanel.gd       # 任务控制（225 行）
│   └── ...
├── api/
│   └── MicroverseAPIClient.gd    # API 客户端
└── AgentRuntimeTest.gd           # 测试场景脚本
```

### 场景文件
```
microverse/scene/
├── AgentRuntimeTest.tscn         # 测试场景
└── ui/
    ├── AgentDialogSystem.tscn    # 对话 UI
    ├── TaskMonitorPanel.tscn     # 监控 UI
    └── TaskControlPanel.tscn     # 控制 UI
```

### Shader 文件
```
microverse/shader/
├── crt_shader.gdshader           # CRT 效果
├── pixel_perfect.gdshader        # 像素完美渲染
└── post_process.gdshader         # 后处理效果
```

---

## 🔧 API 端点

### 对话 API
- `POST /api/agent/conversations` - 创建对话
- `POST /api/agent/conversations/{id}/messages` - 发送消息
- `GET /api/agent/conversations/{id}/messages` - 获取消息历史

### 任务控制 API
- `POST /api/agent/executions` - 启动任务
- `POST /api/agent/executions/{id}/pause` - 暂停任务
- `POST /api/agent/executions/{id}/resume` - 恢复任务
- `POST /api/agent/executions/{id}/stop` - 停止任务

### 任务监控 API
- `GET /api/agent/executions` - 获取任务列表
- `GET /api/agent/executions/{id}` - 获取任务详情

### 询问响应 API
- `POST /api/agent/questions/{id}/answer` - 回答 Agent 询问

### WebSocket
- `ws://localhost:38080/ws/agent/executions/{id}` - 实时任务状态

---

## 🎨 UI 特性

### 像素风格
- ✅ 像素字体（8x8）
- ✅ 像素边框和按钮
- ✅ CRT 扫描线效果
- ✅ 像素完美渲染

### 交互特性
- ✅ 多轮对话支持
- ✅ 消息历史滚动
- ✅ 实时状态更新
- ✅ 任务进度显示
- ✅ 日志输出

---

## 🐛 故障排查

### 后端未运行
```bash
cd /Users/kp/项目/Proj/claude_manager
./start.sh
```

### Godot 无法连接后端
1. 检查后端是否运行：`curl http://localhost:38080/api/system/health`
2. 检查 Godot 控制台是否有错误信息
3. 确认 API 客户端配置正确（`script/api/MicroverseAPIClient.gd`）

### 场景无法加载
1. 确认所有 GDScript 文件无语法错误
2. 检查场景文件路径是否正确
3. 查看 Godot 控制台的错误信息

---

## 📚 完整文档

- **架构设计**: `docs/plans/godot-agent-runtime-architecture.md`
- **实现报告**: `docs/godot-frontend-implementation-report.md`
- **集成指南**: `docs/godot-frontend-integration-guide.md`
- **完成报告**: `docs/godot-game-mode-completion-report.md`
- **Shader 指南**: `docs/godot-shader-implementation-guide.md`

---

## ✨ 下一步

1. **测试核心功能** - 运行 AgentRuntimeTest 场景
2. **集成到主游戏** - 将 Agent 系统集成到你的主游戏场景
3. **自定义 UI** - 根据游戏风格调整 UI 样式
4. **添加更多功能** - 扩展对话、监控、控制功能

---

**准备就绪！现在你可以打开 Godot 并测试游戏模式了！** 🎮
