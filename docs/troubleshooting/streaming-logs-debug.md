# 实时日志不显示问题排查

## 问题描述
AgentTestPanel 显示"Agent 正在处理请求..."但没有显示实时日志。

## 可能的原因

### 1. 后端 SSE 端点问题
**症状**: 前端连接成功但收不到消息

**排查步骤**:
```bash
# 1. 检查后端日志
cd backend
python3 -m uvicorn app.main:app --reload --port 8000

# 2. 使用 curl 测试 SSE 端点
curl -N "http://localhost:8000/agents/1/test-stream?prompt=hello"

# 应该看到类似输出:
# data: {"type":"log","message":"开始执行 Agent: xxx"}
# data: {"type":"log","message":"使用模型: sonnet"}
# ...
```

### 2. 前端 EventSource 连接问题
**症状**: 浏览器控制台有错误

**排查步骤**:
```javascript
// 打开浏览器控制台 (F12)
// 查看 Network 标签
// 找到 test-stream 请求
// 检查:
// - 状态码是否为 200
// - Content-Type 是否为 text/event-stream
// - EventStream 标签是否有消息
```

### 3. CORS 问题
**症状**: 浏览器控制台显示 CORS 错误

**解决方案**:
```python
# backend/app/main.py
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # 前端地址
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### 4. 回调函数问题
**症状**: 后端执行但前端收不到日志

**原因**:
- `run_command_with_streaming()` 的回调函数是同步的
- 但 SSE 生成器是异步的
- 需要使用队列来桥接

**当前实现**:
```python
# 使用 asyncio.Queue 来传递日志
log_queue = asyncio.Queue()

def log_callback(stream_type: str, line: str):
    asyncio.create_task(log_queue.put((stream_type, line)))

# 在异步生成器中读取队列
while not execution_done.is_set() or not log_queue.empty():
    item = await asyncio.wait_for(log_queue.get(), timeout=0.1)
    yield f"data: {json.dumps({'type': 'log', 'message': line})}\n\n"
```

## 快速测试方案

### 方案 1: 使用 curl 测试后端
```bash
# 测试 SSE 端点是否正常工作
curl -N "http://localhost:8000/agents/1/test-stream?prompt=hello"

# 如果看到实时输出，说明后端正常
# 如果没有输出或报错，说明后端有问题
```

### 方案 2: 使用浏览器直接访问
```
打开浏览器访问:
http://localhost:8000/agents/1/test-stream?prompt=hello

应该看到 SSE 消息流
```

### 方案 3: 使用 Python 测试脚本
```bash
cd backend
python3 test_sse_endpoint.py
```

## 临时解决方案

如果实时日志仍然不工作，可以先使用原来的非流式端点：

### 前端修改
```typescript
// AgentTestPanel.tsx
const handleTest = async () => {
  // 使用原来的 API
  const response = await agentsApi.test(agent.id, input);
  setCurrentOutput(response.output);
  setCurrentSuccess(response.success);
};
```

## 推荐的调试流程

1. **先测试后端**
   ```bash
   curl -N "http://localhost:8000/agents/1/test-stream?prompt=hello"
   ```

2. **检查浏览器控制台**
   - 打开 F12 开发者工具
   - 查看 Console 标签是否有错误
   - 查看 Network 标签的 test-stream 请求

3. **添加前端日志**
   ```typescript
   eventSource.onmessage = (event) => {
     console.log('收到 SSE 消息:', event.data);
     // ...
   };

   eventSource.onerror = (error) => {
     console.error('SSE 错误:', error);
     // ...
   };
   ```

4. **添加后端日志**
   ```python
   async def generate_stream():
       print("开始生成流")
       yield f"data: {json.dumps({'type': 'log', 'message': '测试消息'})}\n\n"
       print("已发送测试消息")
   ```

## 已知问题

### 问题 1: Claude CLI 输出缓冲
**现象**: 命令执行完成后才一次性显示所有输出

**原因**: Claude CLI 可能使用了输出缓冲

**解决方案**:
- 使用 `--output-format stream-json` 参数
- 或者使用 `stdbuf -o0` 禁用缓冲

### 问题 2: asyncio.create_task 在回调中
**现象**: 回调函数中的 `asyncio.create_task` 可能不工作

**原因**: 回调函数在不同的事件循环中执行

**解决方案**: 使用线程安全的队列或者 `call_soon_threadsafe`

## 下一步优化

如果当前方案仍有问题，考虑以下替代方案：

1. **使用 WebSocket 替代 SSE**
   - 更好的双向通信
   - 更可靠的连接管理

2. **使用轮询方式**
   - 前端定时请求执行状态
   - 后端将日志存储到数据库或缓存

3. **使用 Redis Pub/Sub**
   - 后端将日志发布到 Redis
   - 前端通过 WebSocket 订阅
