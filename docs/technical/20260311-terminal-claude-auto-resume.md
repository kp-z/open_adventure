# Terminal Claude 会话自动恢复功能

**创建日期**: 2026-03-11
**功能**: 重新打开 Terminal 页面时自动检测并恢复未关闭的 Claude 会话

## 功能概述

当用户关闭浏览器页面后，如果 Terminal 中有正在运行的 Claude 会话，重新打开 Terminal 页面时会自动检测并恢复这些会话。

## 实现原理

### 1. 后端检测逻辑

**新增方法**: `TerminalSession.get_claude_session_id()`
- 通过 `pgrep` 查找 shell 进程的所有子进程
- 使用 `ps` 获取每个子进程的完整命令行参数
- 检测是否有 `claude --resume <session_id>` 命令
- 提取并返回 Claude 会话 ID

**API 增强**: `/terminal/session/{session_id}/claude-status`
- 返回字段：
  - `running`: Claude 进程是否在运行
  - `claude_resume_session`: 检测到的 Claude 会话 ID
  - `session_exists`: Terminal session 是否存在
  - `process_alive`: PTY 进程是否存活
  - `initial_dir`: Terminal 初始目录

### 2. 前端自动恢复逻辑

**新增函数**: `autoRestoreClaudeSessions()`
- 在所有 Terminal session 恢复完成后自动触发
- 遍历每个恢复的 terminal session
- 调用 `/terminal/session/{session_id}/claude-status` API 检测 Claude 状态
- 如果检测到运行中的 Claude 会话，自动发送 `claude --resume <session_id>` 命令
- 显示通知告知用户会话已自动恢复

**触发时机**:
- `TerminalContext` 初始化时
- 所有 Terminal session WebSocket 连接恢复完成后
- 延迟 1.5 秒确保连接稳定

## 使用场景

### 场景 1: 正常关闭浏览器

1. 用户在 Terminal 中运行 `claude` 命令
2. Claude 会话正在进行中
3. 用户关闭浏览器标签页
4. 后端 Terminal session 继续运行
5. 用户重新打开 Terminal 页面
6. **自动恢复**: 系统自动检测到 Claude 会话并执行 `claude --resume`

### 场景 2: 浏览器崩溃

1. 用户在 Terminal 中运行 `claude --resume <session_id>` 命令
2. Claude 会话正在进行中
3. 浏览器意外崩溃
4. 后端 Terminal session 继续运行
5. 用户重新打开浏览器并访问 Terminal 页面
6. **自动恢复**: 系统自动检测到 Claude 会话并执行 `claude --resume <session_id>`

### 场景 3: 多个 Terminal 会话

1. 用户打开多个 Terminal 标签页
2. 其中 2 个 Terminal 运行了 Claude 会话
3. 用户关闭浏览器
4. 用户重新打开 Terminal 页面
5. **自动恢复**: 系统自动检测并恢复所有 2 个 Claude 会话

## 测试步骤

### 测试 1: 基本自动恢复

1. 打开 Terminal 页面
2. 创建一个新的 Terminal
3. 在 Terminal 中运行 `claude` 命令
4. 等待 Claude 启动完成
5. 关闭浏览器标签页（不要关闭 Terminal session）
6. 重新打开 Terminal 页面
7. **预期结果**: 
   - Terminal 自动恢复
   - 显示通知"Claude 会话自动恢复"
   - Claude 会话自动执行 `claude --resume` 命令

### 测试 2: 多个会话恢复

1. 打开 Terminal 页面
2. 创建 3 个 Terminal
3. 在其中 2 个 Terminal 中运行 `claude` 命令
4. 等待 Claude 启动完成
5. 关闭浏览器标签页
6. 重新打开 Terminal 页面
7. **预期结果**:
   - 所有 3 个 Terminal 自动恢复
   - 显示 2 个通知"Claude 会话自动恢复"
   - 2 个 Claude 会话自动执行 `claude --resume` 命令

### 测试 3: 无 Claude 会话

1. 打开 Terminal 页面
2. 创建一个新的 Terminal
3. 不运行 Claude 命令
4. 关闭浏览器标签页
5. 重新打开 Terminal 页面
6. **预期结果**:
   - Terminal 自动恢复
   - 不显示任何 Claude 恢复通知
   - Terminal 保持原样

## 技术细节

### 前端代码位置
- 文件: `frontend/src/app/contexts/TerminalContext.tsx`
- 函数: `autoRestoreClaudeSessions()`
- 触发位置: `restoreSessions()` 中的 `markConnectionSettled()` 回调

### 后端代码位置
- 文件: `backend/app/api/terminal.py`
- 类: `TerminalSession`
- 方法: `get_claude_session_id()`
- API: `/terminal/session/{session_id}/claude-status`

### 关键配置
- 恢复延迟: 1.5 秒（确保 WebSocket 连接稳定）
- 检测方式: `pgrep` + `ps` 命令
- 命令格式: `claude --resume <session_id>`

## 已知限制

1. **仅支持 macOS/Linux**: 使用 `pgrep` 和 `ps` 命令，Windows 需要不同的实现
2. **依赖进程检测**: 如果 Claude 进程已经退出，无法恢复
3. **会话 ID 提取**: 仅支持 `claude --resume <session_id>` 格式，不支持其他参数格式

## 未来改进

1. **Windows 支持**: 使用 `tasklist` 或 PowerShell 命令
2. **会话状态持久化**: 将 Claude 会话 ID 保存到数据库
3. **更智能的检测**: 支持检测 `claude` 命令（无 --resume 参数）
4. **用户配置**: 允许用户禁用自动恢复功能

## 相关文档

- [Terminal 自动重连功能](./20260311-terminal-auto-reconnect.md)
- [Terminal WebSocket 协议](./terminal-websocket-protocol.md)
- [Claude Code CLI 集成](../guides/claude-code-integration.md)
