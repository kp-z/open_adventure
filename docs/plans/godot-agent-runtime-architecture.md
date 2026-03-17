# Godot 游戏模式与 Agent Runtime 集成架构设计

**创建日期**: 2026-03-17
**文档版本**: v1.0
**状态**: 设计阶段

## 目录
1. [概述](#概述)
2. [核心功能设计](#核心功能设计)
3. [通信架构](#通信架构)
4. [实现路线图](#实现路线图)

---

## 概述

### 设计目标
将 Godot Microverse 游戏与 Open Adventure 后端的 Agent Runtime 深度集成，实现游戏化的 AI Agent 管理和任务执行体验。

### 核心价值
- **沉浸式交互**: 在像素风格游戏中与 AI Agent 对话和协作
- **实时监控**: 可视化展示 Agent 执行任务的实时状态
- **持久化运行**: Agent 可以在后台持续工作，游戏可随时恢复
- **游戏化体验**: 将专业的 AI 管理工具转化为有趣的游戏体验

---

## 核心功能设计

### 1. 对话框系统
- 角色与 Agent 进行自然语言对话
- 支持多轮对话上下文
- 显示 Agent 的思考过程和回复
- 支持快捷任务输入

### 2. 任务监控面板
- 实时显示 Agent 执行任务的状态
- 显示任务进度、当前步骤、输出日志
- 支持多任务并行监控
- 可视化展示任务依赖关系

### 3. 询问响应系统
- Agent 执行任务时可能需要用户输入
- 在游戏中弹出询问对话框
- 支持多种输入类型（文本、选择、确认）
- 超时自动使用默认值

### 4. 任务控制系统
- 打断正在执行的任务
- 暂停和恢复任务
- 查看任务执行历史
- 重试失败的任务

### 5. 后台运行系统
- Agent 可以在后台持续运行
- 游戏关闭后任务继续执行
- 重新打开游戏时恢复状态
- 显示后台任务通知

### 6. 持久化运行系统
- 保存 Agent 会话状态
- 恢复中断的对话
- 保存任务执行进度
- 支持跨设备同步

---

## 通信架构

### HTTP + WebSocket 双通道

#### HTTP API（RESTful）
用于：
- 创建/查询/更新资源
- 一次性操作
- 批量数据获取

#### WebSocket（实时推送）
用于：
- 实时状态更新
- 任务执行日志流
- Agent 询问通知
- 后台任务通知

### 新增后端 API 端点

#### 对话 API
- `POST /api/microverse/conversations` - 创建对话会话
- `POST /api/microverse/conversations/{session_id}/messages` - 发送消息
- `GET /api/microverse/conversations/{session_id}/history` - 获取历史

#### 任务控制 API
- `POST /api/executions/{execution_id}/pause` - 暂停执行
- `POST /api/executions/{execution_id}/resume` - 恢复执行
- `POST /api/executions/{execution_id}/stop` - 停止执行
- `POST /api/executions/{execution_id}/retry` - 重试执行

#### 询问响应 API
- `POST /api/executions/{execution_id}/questions/{question_id}/answer` - 提交答案

#### 会话持久化 API
- `POST /api/microverse/sessions/save` - 保存会话
- `POST /api/microverse/sessions/restore` - 恢复会话

---

## 实现路线图

### Phase 1: 基础通信（1-2 天）
- [ ] 扩展 MicroverseAPIClient.gd 支持新 API
- [ ] 实现 WebSocket 客户端
- [ ] 后端添加 Microverse 专用路由

### Phase 2: 对话系统（2-3 天）
- [ ] 实现 AgentDialogSystem.gd
- [ ] 创建对话气泡 UI
- [ ] 集成像素字体和 UI 资源
- [ ] 后端实现对话 API

### Phase 3: 任务监控（2-3 天）
- [ ] 实现 TaskMonitorPanel.gd
- [ ] 创建监控卡片 UI
- [ ] WebSocket 实时更新集成
- [ ] 后端优化 WebSocket 推送

### Phase 4: 任务控制（1-2 天）
- [ ] 实现 TaskControlPanel.gd
- [ ] 后端实现暂停/恢复/停止 API
- [ ] 询问响应对话框

### Phase 5: 后台运行（2-3 天）
- [ ] 实现 BackgroundTaskManager.gd
- [ ] 通知系统
- [ ] 后端会话持久化

### Phase 6: 集成测试（2-3 天）
- [ ] 端到端测试
- [ ] 性能优化
- [ ] Bug 修复

**总计**: 10-16 天

---

**文档作者**: godot-architect
**审核状态**: 待审核
