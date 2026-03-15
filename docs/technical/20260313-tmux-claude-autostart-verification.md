# Terminal tmux + Claude 自动启动验证指南

**日期**: 2026-03-13
**功能**: 根据 project 创建 Terminal 时自动启动 Claude

## 功能说明

当用户选择一个 project 创建 Terminal 时，系统会：
1. 创建一个 tmux 会话（在 project 目录中）
2. 自动启动 Claude Code CLI
3. 用户可以直接开始与 Claude 对话

## 实现状态 ✅

### 后端实现
- ✅ `TerminalSession.__init__()` 接收 `auto_start_claude` 参数
- ✅ `create_tmux_session()` 在指定目录创建 tmux 会话
- ✅ WebSocket 端点接收 `auto_start_claude` 参数
- ✅ 在 `session.start()` 后等待 1.5 秒
- ✅ 通过 `session.write('claude\n')` 发送命令

### 前端实现
- ✅ `handleSelectProject()` 调用 `createTerminal(projectPath, true)`
- ✅ `initTerminal()` 将 `autoStartClaude` 参数传递到 WebSocket URL
- ✅ WebSocket URL 包含 `auto_start_claude=true` 参数

## 验证步骤

### 方法 1: 浏览器 + 后端日志

1. **打开后端日志监控**：
   ```bash
   tail -f backend/docs/logs/backend.log | grep -E "Terminal|claude|tmux"
   ```

2. **在浏览器中创建 Terminal**：
   - 访问 http://localhost:5173
   - 导航到 Terminal 页面
   - 点击 "New Terminal" 按钮
   - 选择一个 project（例如：`/Users/kp/项目/Proj/claude_manager`）

3. **观察后端日志**：
   应该看到类似以下的日志：
   ```
   [Terminal] Starting new PTY session (use_tmux=True)...
   [Terminal] Created tmux session: oa_xxxxxxxx
   [Terminal] Auto-start Claude enabled, will send 'claude' command after shell initialization
   [Terminal] ✅ Sent 'claude' command to terminal
   ```

4. **在 Terminal 中观察**：
   - 应该看到 Claude Code CLI 启动
   - 显示 Claude 的欢迎信息
   - 可以直接输入问题与 Claude 对话

### 方法 2: 检查 tmux 会话

1. **创建 Terminal**（同上）

2. **列出 tmux 会话**：
   ```bash
   tmux list-sessions
   ```
   应该看到类似：
   ```
   oa_xxxxxxxx: 1 windows (created Fri Mar 13 15:00:00 2026)
   ```

3. **连接到 tmux 会话**：
   ```bash
   tmux attach -t oa_xxxxxxxx
   ```

4. **检查是否运行 Claude**：
   - 应该看到 Claude Code CLI 界面
   - 或者看到 Claude 的输出

5. **退出 tmux**（不终止会话）：
   - 按 `Ctrl+B`，然后按 `D`

### 方法 3: 检查进程

1. **创建 Terminal**（同上）

2. **查找 Claude 进程**：
   ```bash
   ps aux | grep -i claude | grep -v grep
   ```
   应该看到 claude 进程在运行

3. **检查 tmux 会话中的进程**：
   ```bash
   # 获取 tmux 会话名称
   SESSION_NAME=$(tmux list-sessions 2>/dev/null | grep "oa_" | head -1 | cut -d: -f1)
   
   # 获取 pane PID
   PANE_PID=$(tmux list-panes -t "$SESSION_NAME" -F "#{pane_pid}" | head -1)
   
   # 查看子进程
   pgrep -P "$PANE_PID"
   ps -p $(pgrep -P "$PANE_PID") -o pid,comm,args
   ```

## 预期结果

### ✅ 成功的标志

1. **后端日志**：
   - 看到 "Auto-start Claude enabled" 消息
   - 看到 "✅ Sent 'claude' command to terminal" 消息

2. **Terminal 界面**：
   - 看到 Claude Code CLI 启动
   - 看到 Claude 的欢迎信息
   - 可以直接输入问题

3. **tmux 会话**：
   - 会话在正确的 project 目录中
   - Claude 进程在会话中运行

### ❌ 失败的情况

1. **Claude 未启动**：
   - Terminal 只显示普通 shell 提示符
   - 没有 Claude 的欢迎信息

2. **目录错误**：
   - Claude 启动了，但不在正确的 project 目录

3. **命令发送失败**：
   - 后端日志显示 "❌ Failed to send 'claude' command"

## 故障排查

### 问题 1: Claude 未自动启动

**可能原因**：
1. `auto_start_claude` 参数未正确传递
2. 等待时间不够（1.5 秒可能不足）
3. tmux 会话初始化慢

**解决方法**：
1. 检查 WebSocket URL 是否包含 `auto_start_claude=true`
2. 增加等待时间（改为 2-3 秒）
3. 检查后端日志确认命令是否发送

### 问题 2: Claude 启动但目录错误

**可能原因**：
1. tmux 会话创建时目录参数错误
2. project_path 参数未正确传递

**解决方法**：
1. 检查 `create_tmux_session()` 的 `-c` 参数
2. 验证 `initial_dir` 是否正确

### 问题 3: 命令发送到错误的位置

**可能原因**：
1. `session.write()` 在 tmux attach 之前调用
2. PTY 未正确连接到 tmux

**解决方法**：
1. 确保在 `session.start()` 之后调用
2. 增加等待时间让 tmux attach 完成

## 测试脚本

已创建自动化测试脚本：`/tmp/verify_tmux_claude.sh`

使用方法：
```bash
/tmp/verify_tmux_claude.sh
```

脚本会：
1. 提示你在浏览器中创建 Terminal
2. 等待 3 秒
3. 检查 tmux 会话和 Claude 进程
4. 显示详细的诊断信息

## 手动测试清单

- [ ] 在浏览器中选择 project 创建 Terminal
- [ ] 观察 Terminal 是否自动启动 Claude
- [ ] 检查后端日志是否有 "Auto-start Claude" 消息
- [ ] 验证 tmux 会话在正确的目录
- [ ] 测试关闭浏览器后 tmux 会话是否保持
- [ ] 测试重新连接到 tmux 会话

## 相关文件

- 后端实现: `backend/app/api/terminal.py` (第 777-787 行)
- 前端调用: `frontend/src/app/pages/Terminal.tsx` (第 452 行)
- WebSocket 参数: `frontend/src/app/contexts/TerminalContext.tsx` (第 406-407 行)

## 下一步优化

1. **增加等待时间配置**：允许用户配置等待时间
2. **添加启动状态反馈**：在 UI 上显示 "Claude 正在启动..."
3. **错误处理改进**：如果 Claude 启动失败，显示错误信息
4. **支持自定义启动命令**：允许用户配置启动命令（如 `claude --model opus`）
