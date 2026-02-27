# 终端进程验证指南

## 问题描述
需要验证每次创建新终端时，是否真的创建了新的 shell 进程。

## 验证方法

### 方法 1：查看后端日志
后端已添加详细的调试日志，每次创建终端时会输出：

```
[Terminal] WebSocket connection accepted, project_path param: /path/to/project
[Terminal] Using specified project path: /path/to/project
[Terminal] Starting new PTY session...
[Terminal] PTY forked - PID: 12345, FD: 6
[Terminal] Parent process - PTY session started with PID: 12345
[Terminal] Setting up auto-start commands for: /path/to/project
[Terminal] Sending cd command to: /path/to/project
[Terminal] Sending claude command
[Terminal] Startup commands sent successfully
```

查看日志：
```bash
tail -f /tmp/backend_new.log | grep Terminal
```

### 方法 2：使用测试脚本
运行测试脚本，它会自动检测 shell 进程数量的变化：

```bash
cd backend
python test_terminal_processes.py
```

然后在前端创建新终端，脚本会显示是否创建了新进程。

### 方法 3：手动检查进程
在创建终端前后，手动检查进程：

```bash
# 创建终端前
ps aux | grep -E "zsh|bash" | grep -v grep | wc -l

# 创建终端后
ps aux | grep -E "zsh|bash" | grep -v grep | wc -l
```

如果数字增加，说明创建了新进程。

### 方法 4：检查 PTY 设备
每个终端会创建一个 PTY 设备：

```bash
# 查看当前 PTY 设备
ls -la /dev/pts/
```

每创建一个新终端，应该会增加一个 PTY 设备。

## 预期行为

### 正常情况
每次创建新终端时：
1. 前端创建新的 WebSocket 连接
2. 后端接收连接并创建新的 `TerminalSession`
3. 调用 `pty.fork()` 创建新的子进程
4. 子进程执行 shell（zsh 或 bash）
5. 父进程管理 PTY 通信

### 每个终端应该有
- 独立的 PID（进程 ID）
- 独立的 PTY 文件描述符
- 独立的 shell 进程
- 独立的工作目录

## 可能的问题

### 问题 1：进程共享
**症状**：多个终端标签显示相同的内容，输入会影响所有终端

**原因**：
- WebSocket 连接复用
- PTY 文件描述符共享
- Session 对象被重用

**解决**：确保每次都创建新的 `TerminalSession` 对象

### 问题 2：进程立即退出
**症状**：终端创建后立即关闭或显示错误

**原因**：
- Shell 路径不正确
- 环境变量问题
- 权限问题

**解决**：检查后端日志中的错误信息

### 问题 3：PTY fork 失败
**症状**：后端日志显示错误，终端无法创建

**原因**：
- 系统资源不足
- 达到进程数限制
- PTY 设备不可用

**解决**：
```bash
# 检查系统限制
ulimit -a

# 检查 PTY 设备
ls -la /dev/ptmx
```

## 调试步骤

1. **启动后端服务**
   ```bash
   python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload > /tmp/backend_new.log 2>&1 &
   ```

2. **监控日志**
   ```bash
   tail -f /tmp/backend_new.log | grep Terminal
   ```

3. **在前端创建终端**
   - 打开 Terminal 页面
   - 点击 "New Tab" 或切换项目路径

4. **检查日志输出**
   - 应该看到 "Starting new PTY session"
   - 应该看到新的 PID
   - 应该看到 "PTY session started"

5. **验证进程**
   ```bash
   ps aux | grep -E "zsh|bash" | grep -v grep
   ```

## 代码关键点

### 前端 (TerminalContext.tsx)
```typescript
const createTerminal = (projectPath?: string): TerminalInstance => {
  const id = `terminal-${Date.now()}`; // 唯一 ID
  const ws = new WebSocket(wsUrl);     // 新的 WebSocket 连接
  // ...
}
```

### 后端 (terminal.py)
```python
# 每次 WebSocket 连接都创建新 session
session = TerminalSession(initial_dir=initial_dir, auto_start_claude=auto_start_claude)
session.start()  # 调用 pty.fork() 创建新进程
```

### PTY Fork
```python
def start(self):
    self.pid, self.master_fd = pty.fork()  # 创建新的子进程
    if self.pid == 0:
        # 子进程：执行 shell
        os.execvp(shell, [shell, '-l', '-i'])
    # 父进程：管理 PTY
```

## 总结
每次创建新终端时，应该：
- ✓ 创建新的 WebSocket 连接
- ✓ 创建新的 TerminalSession 对象
- ✓ Fork 新的子进程
- ✓ 分配新的 PTY 设备
- ✓ 启动独立的 shell 进程

如果以上任何一步失败，终端将无法正常工作。
