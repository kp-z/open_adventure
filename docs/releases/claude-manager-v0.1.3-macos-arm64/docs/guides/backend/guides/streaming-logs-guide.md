# 实时日志功能使用指南

## 快速开始

### 1. 基本使用

```python
from app.adapters.claude.cli_client import ClaudeCliClient

# 创建客户端
client = ClaudeCliClient()

# 定义日志回调函数
def log_callback(stream_type: str, line: str):
    print(f"[{stream_type}] {line}")

# 执行命令并实时输出日志
result = await client.run_command_with_streaming(
    cmd=["claude", "code", "ctl", "skill", "run", "my-skill"],
    log_callback=log_callback,
    timeout=300
)

# 检查结果
if result["success"]:
    print(f"执行成功，耗时 {result['duration']:.2f} 秒")
else:
    print(f"执行失败: {result['error']}")
```

### 2. 回调函数参数

**stream_type** 可能的值：
- `"stdout"`: 标准输出
- `"stderr"`: 标准错误
- `"info"`: 系统信息（开始、结束等）
- `"error"`: 系统错误

**line**: 日志内容（已包含时间戳）

### 3. 返回结果

```python
{
    "success": bool,           # 是否成功（returncode == 0）
    "output": str,             # stdout 完整输出
    "error": str,              # stderr 错误信息（仅失败时）
    "stderr": str,             # stderr 完整输出
    "returncode": int,         # 进程退出码
    "logs": List[str],         # 所有日志行（stdout + stderr）
    "duration": float          # 执行耗时（秒）
}
```

## 高级用法

### 1. WebSocket 实时推送

```python
from fastapi import WebSocket

@router.websocket("/ws/execution/{execution_id}")
async def execution_logs_ws(websocket: WebSocket, execution_id: str):
    await websocket.accept()

    async def ws_log_callback(stream_type: str, line: str):
        await websocket.send_json({
            "type": stream_type,
            "line": line,
            "timestamp": datetime.now().isoformat()
        })

    try:
        result = await client.run_command_with_streaming(
            cmd=cmd,
            log_callback=ws_log_callback,
            timeout=timeout
        )

        # 发送完成消息
        await websocket.send_json({
            "type": "complete",
            "result": result
        })

    except Exception as e:
        await websocket.send_json({
            "type": "error",
            "error": str(e)
        })
    finally:
        await websocket.close()
```

### 2. 保存日志到数据库

```python
from app.models.execution import Execution

async def execute_with_logging(execution_id: str, cmd: List[str]):
    execution = await get_execution(execution_id)
    logs = []

    def db_log_callback(stream_type: str, line: str):
        log_entry = {
            "type": stream_type,
            "line": line,
            "timestamp": datetime.now().isoformat()
        }
        logs.append(log_entry)

        # 可选：实时更新数据库
        # await update_execution_logs(execution_id, logs)

    result = await client.run_command_with_streaming(
        cmd=cmd,
        log_callback=db_log_callback,
        timeout=300
    )

    # 保存完整日志
    execution.logs = logs
    execution.duration = result["duration"]
    execution.status = "completed" if result["success"] else "failed"
    await save_execution(execution)

    return result
```

### 3. 多任务并行执行

```python
async def execute_parallel_tasks(tasks: List[Dict]):
    results = await asyncio.gather(*[
        client.run_command_with_streaming(
            cmd=task["cmd"],
            log_callback=lambda t, l: print(f"[{task['name']}] {l}"),
            timeout=task.get("timeout", 300)
        )
        for task in tasks
    ])

    return results
```

## 测试

运行测试脚本：

```bash
# 基础功能测试
python3 backend/test_streaming_logs.py

# 演示脚本（带彩色输出）
python3 backend/demo_streaming_logs.py
```

## 注意事项

1. **回调函数性能**
   - 回调函数应该快速执行，避免阻塞日志读取
   - 如需耗时操作（如数据库写入），考虑使用队列异步处理

2. **超时设置**
   - 根据命令预期执行时间合理设置 timeout
   - 超时后进程会被强制终止

3. **错误处理**
   - 始终检查 `result["success"]` 判断执行状态
   - 失败时 `result["error"]` 包含错误信息

4. **内存管理**
   - 对于输出量极大的命令，考虑分批处理日志
   - 避免在内存中累积过多日志行

## 性能指标

| 场景 | 延迟 | 吞吐量 |
|------|------|--------|
| 单行输出 | < 10ms | - |
| 大量输出 (1000行) | < 100ms | ~10000 行/秒 |
| WebSocket 推送 | < 50ms | - |

## 相关文档

- [测试报告](./docs/test_reports/20260227-streaming-logs-test.md)
- [API 文档](./docs/api/execution-api.md)
- [架构设计](./docs/architecture/adapter-layer.md)
