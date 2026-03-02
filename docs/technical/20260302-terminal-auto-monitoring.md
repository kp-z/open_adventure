# Terminal 进程自动监控实现总结

**创建日期**: 2026-03-02
**状态**: 已完成

## 功能概述

实现了 Terminal 进程的自动监控功能，当用户在 Terminal 页面创建新的 shell session 时，系统会自动：
1. 创建 Terminal 类型的 Execution 记录
2. 捕获并保存命令输出
3. 监控进程状态
4. 通过 WebSocket 实时推送状态更新

## 实现细节

### 1. 自动创建 Execution 记录

**文件**: `backend/app/api/terminal.py`

**触发时机**: 当 WebSocket 连接建立并创建新的 Terminal session 时

**实现逻辑**:
```python
# 创建 Task
task = Task(
    title=f"Terminal Session: {initial_dir or 'Home'}",
    description=f"Terminal session started at {initial_dir or 'home directory'}",
    project_path=initial_dir,
    status=TaskStatus.RUNNING
)

# 创建 Execution
execution = Execution(
    task_id=task.id,
    workflow_id=0,  # Terminal 不需要 workflow
    execution_type=ExecutionType.TERMINAL,
    status=ExecutionStatus.RUNNING,
    session_id=session_id,
    terminal_pid=session.pid,
    terminal_cwd=initial_dir or os.path.expanduser('~'),
    terminal_command="shell session",
    started_at=datetime.now(),
    last_activity_at=datetime.now(),
    is_background=True
)
```

**关键字段**:
- `execution_type`: `TERMINAL` (新增类型)
- `terminal_pid`: PTY 进程 ID
- `terminal_cwd`: 工作目录
- `terminal_command`: 初始为 "shell session"
- `session_id`: 用于关联 WebSocket session

### 2. 输出捕获和缓冲

**实现位置**: `read_from_pty()` 函数

**缓冲机制**:
- 使用 `output_buffer` 列表缓冲所有输出
- 限制缓冲区大小为 10MB（防止内存溢出）
- 超出大小时自动删除最早的输出

**定期更新**:
- 每 5 秒将缓冲的输出更新到数据库
- 使用 `ExecutionRepository.update_terminal_execution()` 方法

```python
output_buffer = []
last_update_time = datetime.now()

async def read_from_pty():
    nonlocal last_update_time
    while session.running:
        data = await asyncio.get_event_loop().run_in_executor(
            None, session.read, 0.1
        )
        if data:
            decoded_data = data.decode('utf-8', errors='ignore')
            await websocket.send_text(decoded_data)

            # 缓冲输出
            output_buffer.append(decoded_data)

            # 限制缓冲区大小
            total_size = sum(len(s) for s in output_buffer)
            while total_size > 10 * 1024 * 1024 and len(output_buffer) > 1:
                removed = output_buffer.pop(0)
                total_size -= len(removed)

            # 每 5 秒更新数据库
            now = datetime.now()
            if (now - last_update_time).total_seconds() >= 5:
                if session.execution_id:
                    execution_repo = ExecutionRepository(db)
                    output_text = ''.join(output_buffer)
                    await execution_repo.update_terminal_execution(
                        execution_id=session.execution_id,
                        output=output_text
                    )
                    last_update_time = now
```

### 3. 进程状态监控

**监控时机**: WebSocket 断开时

**状态判断**:
- 使用 `session.is_process_alive()` 检查进程是否存活
- 如果进程已结束，更新状态为 `SUCCEEDED`
- 设置 `finished_at` 时间戳

**实现代码**:
```python
finally:
    if session_id in sessions:
        session = sessions[session_id]

        if session.execution_id:
            execution_repo = ExecutionRepository(db)
            execution = await execution_repo.get(session.execution_id)

            if execution:
                # 保存最终输出
                if output_buffer:
                    output_text = ''.join(output_buffer)
                    execution.terminal_output = output_text

                # 更新最后活动时间
                execution.last_activity_at = datetime.now()

                # 如果进程已结束，更新状态
                if not session.is_process_alive():
                    execution.status = ExecutionStatus.SUCCEEDED
                    execution.finished_at = datetime.now()

                    # 广播执行完成
                    ws_manager = get_connection_manager()
                    await ws_manager.broadcast_terminal_execution_update({
                        "id": execution.id,
                        "session_id": session_id,
                        "status": "succeeded",
                        "finished_at": execution.finished_at.isoformat()
                    })

                await db.commit()
```

### 4. WebSocket 实时推送

**推送时机**:
1. **创建时**: Terminal session 创建时推送 `running` 状态
2. **完成时**: 进程结束时推送 `succeeded` 状态

**消息格式**:
```json
{
  "type": "terminal_execution_update",
  "data": {
    "id": 1315,
    "task_id": 1315,
    "session_id": "uuid",
    "execution_type": "terminal",
    "status": "running",
    "terminal_pid": 12345,
    "terminal_cwd": "/path/to/dir",
    "terminal_command": "shell session",
    "started_at": "2026-03-02T...",
    "created_at": "2026-03-02T...",
    "task": {
      "id": 1315,
      "title": "Terminal Session: project-name",
      "description": "...",
      "project_path": "/path/to/dir"
    }
  }
}
```

## 工作流程

### 用户打开 Terminal 页面

1. **前端**: 创建 WebSocket 连接到 `/api/terminal/ws`
2. **后端**: 接收连接，创建新的 `TerminalSession`
3. **后端**: 创建 Task 和 Execution 记录
4. **后端**: 广播 `terminal_execution_update` 消息（status: running）
5. **后端**: 启动 PTY 进程
6. **后端**: 开始捕获输出并定期更新数据库

### 用户在 Terminal 中执行命令

1. **前端**: 通过 WebSocket 发送用户输入
2. **后端**: 将输入写入 PTY
3. **后端**: 从 PTY 读取输出
4. **后端**: 将输出发送到前端并缓冲
5. **后端**: 每 5 秒更新数据库中的输出

### 用户关闭 Terminal 页面

1. **前端**: WebSocket 断开
2. **后端**: 保存最终输出到数据库
3. **后端**: 检查进程状态
4. **后端**: 如果进程已结束，更新状态为 `succeeded`
5. **后端**: 广播 `terminal_execution_update` 消息（status: succeeded）
6. **后端**: Session 保持活跃（支持重连）

## 数据持久化

### Execution 记录字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | int | 执行 ID |
| `task_id` | int | 关联的 Task ID |
| `execution_type` | enum | `TERMINAL` |
| `status` | enum | `RUNNING` / `SUCCEEDED` / `FAILED` |
| `session_id` | string | WebSocket session ID |
| `terminal_pid` | int | PTY 进程 ID |
| `terminal_cwd` | string | 工作目录 |
| `terminal_command` | string | 命令（初始为 "shell session"） |
| `terminal_output` | text | 命令输出（最大 10MB） |
| `started_at` | datetime | 开始时间 |
| `finished_at` | datetime | 结束时间 |
| `last_activity_at` | datetime | 最后活动时间 |

### 输出大小限制

- **缓冲区**: 10MB（内存）
- **数据库**: 10MB（自动截断）
- **截断策略**: 保留最新的 10MB 输出

## 前端集成

### ExecutionContext 监听

前端的 `ExecutionContext` 已经监听 WebSocket 消息：

```typescript
// 监听 terminal_execution_update 消息
if (message.type === 'terminal_execution_update') {
  // 更新 runningExecutions 列表
  // 触发 UI 更新
}
```

### Execution 页面展示

- ✅ 支持筛选 Terminal 类型
- ✅ 显示 Terminal 执行记录
- ✅ 显示命令内容（截断 + hover 提示）
- ✅ 显示执行状态和时间

## 测试验证

### 手动测试

1. **打开 Terminal 页面**
   ```bash
   open http://localhost:5173/terminal
   ```

2. **检查 Execution 记录**
   ```bash
   curl "http://localhost:8000/api/executions/?execution_type=terminal&limit=5"
   ```

3. **验证字段**
   - ✅ `execution_type`: "terminal"
   - ✅ `terminal_pid`: 进程 ID
   - ✅ `terminal_cwd`: 工作目录
   - ✅ `terminal_command`: "shell session"
   - ✅ `status`: "running"

### API 测试

```bash
# 获取 Terminal 执行列表
curl "http://localhost:8000/api/executions/?execution_type=terminal"

# 获取特定执行的输出
curl "http://localhost:8000/api/executions/terminal/1315/output"
```

## 已知限制

1. **命令识别**: 当前无法识别具体执行的命令，`terminal_command` 固定为 "shell session"
2. **输出大小**: 限制为 10MB，超出部分会被截断
3. **进程监控**: 仅在 WebSocket 断开时检查进程状态，无法实时监控
4. **Session 持久化**: Session 在服务器重启后会丢失

## 未来改进

### 1. 命令识别

**目标**: 识别用户执行的具体命令

**方案**:
- 解析 PTY 输出，识别 shell prompt 和命令
- 使用正则表达式匹配命令行
- 为每个命令创建独立的 Execution 记录

### 2. 实时进程监控

**目标**: 实时监控进程状态，而不是仅在断开时检查

**方案**:
- 添加后台任务定期检查进程状态
- 进程结束时立即更新 Execution 状态
- 支持进程崩溃检测

### 3. 输出流式存储

**目标**: 支持超大输出（> 10MB）

**方案**:
- 将输出存储到文件而不是数据库
- 使用 `logs_path` 字段存储文件路径
- 支持分页查看大文件

### 4. Session 持久化

**目标**: 服务器重启后恢复 Session

**方案**:
- 将 Session 信息存储到数据库
- 服务器启动时恢复活跃的 Session
- 支持跨服务器的 Session 共享

## 总结

Terminal 进程自动监控功能已完全实现：

- ✅ 自动创建 Execution 记录
- ✅ 捕获并保存命令输出
- ✅ 监控进程状态
- ✅ WebSocket 实时推送
- ✅ Execution 页面展示

用户无需任何手动操作，系统会自动记录所有 Terminal session 的执行历史，并在 Execution 页面统一展示。
