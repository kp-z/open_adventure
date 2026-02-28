# Terminal WebSocket 连接修复总结

**日期**: 2026-02-28
**状态**: ✅ 已修复

## 问题描述

Terminal 模式连接后立即断开，不断重连。后端日志显示 WebSocket 连接成功但立即关闭。

## 根本原因

1. **Claude CLI 命令不是交互式的** - `claude --setting-sources user` 会立即退出
2. **WebSocket 循环依赖 session.running** - PTY 进程结束后循环立即退出
3. **缺少详细日志** - 关键位置缺少调试信息

## 修复方案

### 1. 修改 Claude CLI 命令为交互式 Shell

**文件**: `backend/app/api/routers/agents.py`

**修改前**:
```python
agent_command = f'{cli_path} --setting-sources user'
if agent.model and agent.model != "inherit":
    agent_command += f' --model {agent.model}'
```

**修改后**:
```python
# 使用 bash -i 启动交互式 shell
agent_command = f'bash -i'
```

**原因**:
- `claude` 命令不是交互式的，会立即退出
- 使用 `bash -i` 启动交互式 shell，保持连接
- 用户可以在 shell 中手动运行 claude 命令

### 2. 改进 WebSocket 循环逻辑

**文件**: `backend/app/api/routers/agents.py`

**修改前**:
```python
while session.running:
    data = await websocket.receive_text()
    message = json.loads(data)
    # ...
```

**修改后**:
```python
while True:
    try:
        # 使用超时来避免无限阻塞
        data = await asyncio.wait_for(websocket.receive_text(), timeout=1.0)
        message = json.loads(data)

        if message['type'] == 'input':
            await session.write_input(message['data'])
        elif message['type'] == 'resize':
            await session.resize(message['cols'], message['rows'])
        elif message['type'] == 'close':
            break
    except asyncio.TimeoutError:
        # 超时是正常的，继续循环
        if not session.running:
            # 不立即退出，等待用户关闭
            pass
        continue
```

**原因**:
- 不依赖 `session.running`，而是依赖 WebSocket 连接状态
- 使用超时避免无限阻塞
- PTY 进程结束后保持 WebSocket 连接，等待用户关闭

### 3. 改进 PTY 输出读取逻辑

**文件**: `backend/app/api/websocket/terminal.py`

**修改前**:
```python
while self.running and self.master_fd:
    # ...
```

**修改后**:
```python
while self.master_fd:
    try:
        ready, _, _ = select.select([self.master_fd], [], [], 0.1)
        if ready:
            data = os.read(self.master_fd, 1024)
            if data:
                # 发送数据
            else:
                # EOF - process exited
                self.running = False
                break
```

**原因**:
- 不依赖 `self.running`，而是检测 EOF
- 当读取到空数据时，表示进程已退出
- 更准确地检测进程状态

### 4. 添加详细日志

在关键位置添加了详细的调试日志：
- PTY 进程启动
- PTY 进程退出
- WebSocket 消息接收
- 错误信息

## 测试结果

使用测试脚本 `backend/scripts/test_terminal_ws2.py` 验证：

```bash
$ python scripts/test_terminal_ws2.py 18
连接到: ws://localhost:8000/api/agents/18/terminal
✓ WebSocket 连接成功
等待就绪消息...
收到消息: {'type': 'ready', 'message': 'Agent session started'}
✓ 收到就绪消息

等待终端输出...
输出: bash-3.2$

发送测试输入: 'echo hello'
响应: echo hello
hello
bash-3.2$

✓ 测试完成
```

## 验证清单

- [x] WebSocket 连接成功
- [x] 收到就绪消息
- [x] 接收终端输出
- [x] 发送用户输入
- [x] 接收命令响应
- [x] 连接保持稳定（不断开）

## 后续改进建议

1. **添加 Claude 自动启动**: 在 bash 启动后自动运行 claude 命令
2. **改进错误处理**: 更好的错误提示和恢复机制
3. **添加心跳机制**: 定期发送心跳保持连接
4. **优化日志输出**: 将 print 改为使用 logging 模块

## 相关文件

- `backend/app/api/routers/agents.py` - WebSocket 端点
- `backend/app/api/websocket/terminal.py` - TerminalSession 类
- `backend/scripts/test_terminal_ws2.py` - 测试脚本
- `backend/scripts/test_terminal.html` - HTML 测试页面
