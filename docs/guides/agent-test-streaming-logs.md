# AgentTestPanel 实时日志集成测试指南

## 修改内容

### 前端修改 (AgentTestPanel.tsx)

1. **修改测试函数** - 使用 SSE (Server-Sent Events) 接收实时日志
   - 从 `/agents/{id}/test` 改为 `/agents/{id}/test-stream`
   - 使用 `EventSource` API 建立 SSE 连接
   - 实时接收并显示日志消息

2. **实时日志显示**
   - 在运行状态下显示累积的日志输出
   - 自动滚动到最新日志
   - 保持原有的输出区域布局

3. **自动滚动**
   - 添加 `logContainerRef` 引用日志容器
   - 使用 `useEffect` 监听日志更新，自动滚动到底部

## 后端 SSE 端点

后端已有 `/agents/{agent_id}/test-stream` 端点（第 536-663 行）：

**消息格式**：
```json
// 日志消息
{"type": "log", "message": "日志内容"}

// 完成消息
{"type": "complete", "data": {"success": true, "output": "...", "duration": 1.23, "model": "sonnet"}}

// 错误消息
{"type": "error", "message": "错误信息"}
```

## 测试步骤

### 1. 启动后端服务

```bash
cd backend
python3 -m uvicorn app.main:app --reload --port 8000
```

### 2. 启动前端服务

```bash
cd frontend-api-integration-migration
npm run dev
```

### 3. 测试实时日志

1. 打开浏览器访问前端页面
2. 进入 Agents 页面
3. 选择一个 Agent 进入测试面板
4. 输入测试提示，例如：
   ```
   请介绍一下你的能力
   ```
5. 点击"运行"按钮
6. 观察输出区域：
   - ✅ 应该立即显示"Agent 正在处理请求..."
   - ✅ 日志应该逐行实时显示（而非等待完成后一次性显示）
   - ✅ 日志容器应该自动滚动到最新内容
   - ✅ 完成后显示最终结果和执行时间

## 预期效果

### 运行中状态
```
┌─────────────────────────────────────┐
│ 🔄 Agent 正在处理请求...            │
├─────────────────────────────────────┤
│ [00:31:14] 开始执行 Agent: xxx      │
│ [00:31:14] 使用模型: sonnet         │
│ [00:31:14] 执行命令...              │
│ [00:31:15] 正在分析输入...          │
│ [00:31:16] 生成响应...              │
│ ↓ (自动滚动)                        │
└─────────────────────────────────────┘
```

### 完成状态
```
┌─────────────────────────────────────┐
│ ✅ 执行成功                          │
│ 1.23s · sonnet                      │
├─────────────────────────────────────┤
│ 我是一个专门的 Agent，我的能力包括：│
│ 1. 代码分析                         │
│ 2. 文档生成                         │
│ 3. ...                              │
└─────────────────────────────────────┘
```

## 关键改进

1. **真正的实时输出**
   - 不再等待命令完成后一次性显示
   - 日志逐行实时推送和显示

2. **更好的用户体验**
   - 用户可以看到执行进度
   - 长时间运行的任务不会让用户感到"卡住"
   - 类似终端的实时输出体验

3. **保持原有布局**
   - 没有新增日志显示区域
   - 直接在原输出区域实时更新
   - UI 保持一致性

## 技术细节

### EventSource API
```typescript
const eventSource = new EventSource(url);

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  // 处理消息
};

eventSource.onerror = (error) => {
  // 处理错误
  eventSource.close();
};
```

### 自动滚动
```typescript
useEffect(() => {
  if (isRunning && logContainerRef.current) {
    logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
  }
}, [currentOutput, isRunning]);
```

## 故障排查

### 问题 1: 日志不实时显示
- 检查后端 SSE 端点是否正常工作
- 检查浏览器控制台是否有 CORS 错误
- 确认 EventSource 连接是否成功建立

### 问题 2: 日志不自动滚动
- 检查 `logContainerRef` 是否正确绑定
- 确认 `useEffect` 依赖项是否正确

### 问题 3: 连接失败
- 确认后端服务运行在 `http://localhost:8000`
- 检查防火墙设置
- 查看后端日志是否有错误

## 下一步优化

1. **WebSocket 替代 SSE**
   - 支持双向通信
   - 更好的连接管理

2. **日志高亮**
   - 不同类型的日志使用不同颜色
   - stdout: 绿色
   - stderr: 红色
   - info: 蓝色

3. **日志过滤**
   - 允许用户过滤特定类型的日志
   - 搜索日志内容

4. **日志导出**
   - 支持导出完整日志到文件
   - 复制日志到剪贴板
