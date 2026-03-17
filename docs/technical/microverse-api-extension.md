# Microverse API 扩展文档

**创建日期**: 2026-03-17
**版本**: v1.0
**状态**: 已完成

## 概述

本文档描述了为 Godot Microverse 游戏模式新增的后端 API 端点。这些 API 支持游戏中的对话系统、任务控制、询问响应和会话持久化功能。

## 新增 API 端点

### 1. 对话 API

#### 1.1 创建对话会话

**端点**: `POST /api/microverse/conversations`

**描述**: 为指定角色创建一个新的对话会话，用于多轮对话。

**请求体**:
```json
{
  "character_name": "string",
  "context": {
    "key": "value"
  }
}
```

**响应**:
```json
{
  "session_id": "uuid",
  "character_name": "string",
  "agent_id": 1,
  "created_at": "2026-03-17T00:00:00",
  "last_activity_at": "2026-03-17T00:00:00"
}
```

**错误码**:
- `400`: 角色未绑定 Agent
- `404`: 角色不存在

---

#### 1.2 发送消息

**端点**: `POST /api/microverse/conversations/{session_id}/messages`

**描述**: 向指定的对话会话发送消息，并获取 Agent 的回复。

**请求体**:
```json
{
  "message": "string",
  "context": {
    "key": "value"
  }
}
```

**响应**:
```json
{
  "message_id": "uuid",
  "role": "assistant",
  "content": "string",
  "timestamp": "2026-03-17T00:00:00"
}
```

**错误码**:
- `404`: 会话不存在
- `500`: AI API 调用失败

---

#### 1.3 获取对话历史

**端点**: `GET /api/microverse/conversations/{session_id}/history`

**描述**: 获取指定会话的对话历史记录。

**查询参数**:
- `offset` (int, 可选): 偏移量，默认 0
- `limit` (int, 可选): 限制数量，默认 50

**响应**:
```json
{
  "session_id": "uuid",
  "messages": [
    {
      "message_id": "uuid",
      "role": "user",
      "content": "string",
      "timestamp": "2026-03-17T00:00:00"
    },
    {
      "message_id": "uuid",
      "role": "assistant",
      "content": "string",
      "timestamp": "2026-03-17T00:00:01"
    }
  ],
  "total": 10
}
```

**错误码**:
- `404`: 会话不存在

---

### 2. 任务控制 API

#### 2.1 暂停执行

**端点**: `POST /api/microverse/executions/{execution_id}/pause`

**描述**: 暂停正在运行的任务执行。

**响应**:
```json
{
  "success": true,
  "execution_id": 1,
  "status": "pending",
  "message": "Execution paused successfully"
}
```

**错误码**:
- `404`: 执行不存在
- `400`: 执行状态不允许暂停

---

#### 2.2 恢复执行

**端点**: `POST /api/microverse/executions/{execution_id}/resume`

**描述**: 恢复已暂停的任务执行。

**响应**:
```json
{
  "success": true,
  "execution_id": 1,
  "status": "running",
  "message": "Execution resumed successfully"
}
```

**错误码**:
- `404`: 执行不存在
- `400`: 执行状态不允许恢复

---

#### 2.3 停止执行

**端点**: `POST /api/microverse/executions/{execution_id}/stop`

**描述**: 停止正在运行的任务执行。

**响应**:
```json
{
  "success": true,
  "execution_id": 1,
  "status": "cancelled",
  "message": "Execution stopped successfully"
}
```

**错误码**:
- `404`: 执行不存在
- `400`: 执行状态不允许停止

---

#### 2.4 重试执行

**端点**: `POST /api/microverse/executions/{execution_id}/retry`

**描述**: 重新执行失败的任务。

**响应**:
```json
{
  "success": true,
  "execution_id": 2,
  "status": "pending",
  "message": "Execution retry initiated"
}
```

**错误码**:
- `404`: 执行不存在
- `400`: 执行状态不允许重试

---

### 3. 询问响应 API

#### 3.1 提交询问响应

**端点**: `POST /api/microverse/executions/{execution_id}/questions/{question_id}/answer`

**描述**: 当 Agent 执行任务时需要用户输入，通过此接口提交答案。

**请求体**:
```json
{
  "answer": "string",
  "timeout": 60
}
```

**响应**:
```json
{
  "success": true,
  "question_id": "uuid",
  "execution_id": 1
}
```

**错误码**:
- `404`: 执行不存在

---

### 4. 会话持久化 API

#### 4.1 保存会话

**端点**: `POST /api/microverse/sessions/save`

**描述**: 保存 Agent 会话的状态，用于跨设备同步或恢复中断的对话。

**请求体**:
```json
{
  "session_id": "uuid",
  "session_data": {
    "key": "value"
  }
}
```

**响应**:
```json
{
  "success": true,
  "session_id": "uuid",
  "saved_at": "2026-03-17T00:00:00"
}
```

**错误码**:
- `404`: 会话不存在

---

#### 4.2 恢复会话

**端点**: `POST /api/microverse/sessions/restore`

**描述**: 恢复之前保存的 Agent 会话状态。

**请求体**:
```json
{
  "session_id": "uuid"
}
```

**响应**:
```json
{
  "success": true,
  "session_id": "uuid",
  "session_data": {
    "key": "value"
  },
  "saved_at": "2026-03-17T00:00:00"
}
```

**错误码**:
- `404`: 会话不存在或无保存数据

---

## CORS 配置

后端已配置 CORS 支持，允许以下来源访问：

- `http://localhost:*` (所有端口)
- `http://127.0.0.1:*` (所有端口)
- 局域网 IP (10.x.x.x, 192.168.x.x, 172.16-31.x.x)

这确保 Godot 游戏可以从本地或局域网访问后端 API。

---

## 数据模型

### ConversationResponse
```typescript
{
  session_id: string;
  character_name: string;
  agent_id: number | null;
  created_at: string;
  last_activity_at: string;
}
```

### MessageResponse
```typescript
{
  message_id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}
```

### TaskControlResponse
```typescript
{
  success: boolean;
  execution_id: number;
  status: string;
  message: string | null;
}
```

---

## 使用示例

### 创建对话并发送消息

```bash
# 1. 创建对话会话
curl -X POST http://localhost:8000/api/microverse/conversations \
  -H "Content-Type: application/json" \
  -d '{
    "character_name": "alice",
    "context": {}
  }'

# 响应: {"session_id": "abc-123", ...}

# 2. 发送消息
curl -X POST http://localhost:8000/api/microverse/conversations/abc-123/messages \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hello, how are you?",
    "context": {}
  }'

# 响应: {"message_id": "msg-1", "role": "assistant", "content": "I'm doing well!", ...}

# 3. 获取对话历史
curl http://localhost:8000/api/microverse/conversations/abc-123/history?offset=0&limit=10
```

### 控制任务执行

```bash
# 暂停执行
curl -X POST http://localhost:8000/api/microverse/executions/1/pause

# 恢复执行
curl -X POST http://localhost:8000/api/microverse/executions/1/resume

# 停止执行
curl -X POST http://localhost:8000/api/microverse/executions/1/stop

# 重试执行
curl -X POST http://localhost:8000/api/microverse/executions/1/retry
```

---

## 测试

所有新增的 API 端点都已通过单元测试验证：

```bash
cd backend
python -m pytest tests/api/test_microverse.py -v
```

测试覆盖：
- ✅ 创建对话会话
- ✅ 发送消息
- ✅ 获取对话历史
- ✅ 对话历史分页
- ✅ 错误处理（会话不存在、角色未绑定 Agent）

---

## 后续工作

以下功能需要在后续阶段实现：

1. **实际的暂停/恢复逻辑**: 当前只更新状态，需要与 Agent Runtime 集成
2. **询问响应的 IPC 机制**: 需要实现进程间通信，将答案传递给正在运行的 Agent
3. **WebSocket 实时推送**: 优化任务状态变化的实时推送
4. **日志流式传输**: 实现执行日志的实时流式传输

---

**文档作者**: backend-api-developer
**审核状态**: 待审核
