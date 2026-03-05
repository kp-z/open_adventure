# Release Notes v1.3.1

**发布日期**: 2026-03-05

## 本次更新重点

本次更新主要实现了 Terminal 页面的 Claude 会话恢复功能，并修复了 Terminal 页面的 UI 问题。

## 🔴 严重问题修复

无

## 🟡 中等问题修复

- **Terminal 页面红色 Debug 框移除**: 移除了 Terminal 页面右上角的红色诊断信息覆盖层，该 debug 框会遮挡终端内容，影响使用体验

## ✨ 新增功能

- **Claude 会话恢复功能**: 实现完整的 Claude Code 会话恢复流程
  - 用户可以在 Terminal 页面选择"Claude 会话恢复"，从列表中选择历史会话
  - 系统自动执行 `claude --resume <session_id>` 命令恢复会话
  - 添加会话 ID 格式验证（UUID 格式）
  - 统一通过 Notification 组件显示错误提示
  - 避免重复创建相同会话的终端

## 📝 技术实现细节

### 后端改进 (`backend/app/api/terminal.py`)
- 在 `TerminalSession` 类中添加 `claude_resume_session` 参数
- WebSocket 端点支持 `claude_resume_session` 查询参数
- 自动在 shell 初始化后执行 `claude --resume <session_id>` 命令
- 命令执行失败时通过 WebSocket 发送错误消息到前端

### 前端改进
- **Terminal 页面** (`frontend/src/app/pages/Terminal.tsx`)
  - 添加会话 ID 验证逻辑（非空检查、UUID 格式验证）
  - 通过 Notification 组件统一显示错误提示
  - 移除红色 debug 框，提升用户体验

- **TerminalContext** (`frontend/src/app/contexts/TerminalContext.tsx`)
  - 添加 `claudeResumeSession` 参数支持
  - 修改 `restoreClaudeConversation` 函数，使用 `create` 模式创建新终端
  - 检查是否已存在相同会话的终端，避免重复创建
  - 添加更详细的通知消息

## 使用指南

### Claude 会话恢复使用流程

1. 在 Terminal 页面点击"Claude 会话恢复"按钮
2. 系统显示可恢复的 Claude Code 会话列表
3. 选择一个会话（显示会话 ID、标题、项目路径、最后更新时间）
4. 系统自动创建新终端并执行 `claude --resume <session_id>` 命令
5. 会话恢复成功后，可以继续之前的对话

### 错误处理

- 如果会话 ID 为空或格式无效，系统会通过通知提示错误
- 如果会话已经在运行中，系统会切换到该终端并提示用户
- 如果命令执行失败，终端会显示错误消息

## 已知问题

无

## 升级指南

本次更新无破坏性变更，可以直接升级。

1. 停止当前运行的服务
2. 更新代码到 v1.3.1
3. 重新启动服务：`./start.sh`

## 文件变更统计

- 修改文件数: 3
- 新增代码行: 1476
- 删除代码行: 651
- 核心修改:
  - `backend/app/api/terminal.py`: +578 行
  - `frontend/src/app/contexts/TerminalContext.tsx`: +935 行
  - `frontend/src/app/pages/Terminal.tsx`: +614 行
