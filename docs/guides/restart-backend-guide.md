# 修复完成 - 需要重启后端

## 问题原因
1. 路由文件中有重复的 `test_agent` 函数定义
2. 第二个定义覆盖了第一个，导致路由冲突

## 已修复
✅ 删除了旧的 `/agents/{id}/test` 实现（第 433-532 行）
✅ 删除了 WebSocket 版本的实现（第 899-946 行）
✅ 保留了 SSE 流式版本 `/agents/{id}/test-stream`

## 重启步骤

### 1. 停止当前后端服务
按 `Ctrl+C` 停止正在运行的后端

### 2. 重新启动后端
```bash
cd /Users/kp/项目/Proj/claude_manager/backend
python3 -m uvicorn app.main:app --reload --port 8000
```

### 3. 验证路由
```bash
# 测试 SSE 端点
curl -N "http://localhost:8000/agents/1/test-stream?prompt=hello"

# 应该看到类似输出：
# data: {"type":"log","message":"开始执行 Agent: xxx"}
# data: {"type":"log","message":"使用模型: sonnet"}
# ...
```

### 4. 测试前端
1. 刷新浏览器页面
2. 进入 Agents 页面
3. 选择一个 Agent
4. 输入测试提示
5. 点击运行

### 5. 查看浏览器控制台
打开 F12，应该看到：
```
[AgentTest] 开始连接 SSE: http://localhost:8000/agents/1/test-stream?prompt=...
[AgentTest] SSE 连接已建立
[AgentTest] 收到 SSE 消息: {"type":"log","message":"开始执行 Agent: xxx"}
[AgentTest] 追加日志: 开始执行 Agent: xxx
[AgentTest] 收到 SSE 消息: {"type":"log","message":"使用模型: sonnet"}
[AgentTest] 追加日志: 使用模型: sonnet
...
```

## 如果仍然 404

检查后端日志，确认路由是否正确加载：
```bash
# 后端启动时应该显示：
INFO:     Application startup complete.
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
```

访问 API 文档查看可用端点：
```
http://localhost:8000/docs
```

搜索 "test-stream" 确认端点已注册。

## 预期效果

运行测试后，输出区域应该：
1. 立即显示 "Agent 正在处理请求..."
2. 下方实时显示日志（逐行追加）
3. 日志自动滚动到最新
4. 完成后显示最终结果和执行时间

## 关键文件修改

- ✅ `backend/app/adapters/claude/cli_client.py` - 添加 env 参数支持
- ✅ `backend/app/api/routers/agents.py` - 删除重复路由，修复环境变量
- ✅ `frontend-api-integration-migration/src/app/components/AgentTestPanel.tsx` - 使用 SSE 接收实时日志
