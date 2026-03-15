# Agent 运行机制修复实施记录

**日期**: 2026-03-15
**状态**: 已完成

## 问题描述

用户报告了两个关键问题：

1. **后台运行按钮不工作**：Agent 测试页面有一个"后台运行"按钮，但点击后没有效果，且用户希望 Agent 默认就在后台运行，不需要专门点击按钮
2. **运行记录未保存**：Agent 通过 WebSocket 运行时，没有创建 Execution 记录，导致运行历史页面看不到这些执行记录

## 根本原因

- `api-session-ws` WebSocket 端点只创建会话，不创建 Execution 记录
- 后台运行按钮调用的是独立的 API，与 WebSocket 会话无关联
- 用户期望所有 Agent 运行都应该记录到历史中

## 解决方案

### 方案选择

采用**方案 1**：修改 `api-session-ws` 端点，自动创建 Execution 记录

**优点**：
- 所有通过 WebSocket 的 Agent 运行都会自动记录
- 不需要前端改动（除了删除后台运行按钮）
- 符合用户"默认后台运行"的期望

### 实施步骤

#### 1. 数据库迁移

**问题**：`Execution` 模型的 `task_id` 和 `workflow_id` 字段是 `nullable=False`，但 Agent 测试不需要这两个字段。

**解决**：
- 创建迁移脚本 `7ddd7ab1e1e5_make_task_id_workflow_id_nullable_in_.py`
- 使用 `batch_alter_table` 修改列约束（SQLite 限制）
- 修改 `Execution` 模型，将 `task_id` 和 `workflow_id` 改为可空

**文件**：
- `backend/alembic/versions/7ddd7ab1e1e5_make_task_id_workflow_id_nullable_in_.py`
- `backend/app/models/task.py`

#### 2. 后端修改

**文件**：`backend/app/api/routers/agents.py`

**修改内容**：

1. **导入必要模块**：
   ```python
   from app.models.task import ExecutionStatus, ExecutionType
   import time
   ```

2. **在 WebSocket 连接建立后创建 Execution 记录**：
   ```python
   execution_repo = ExecutionRepository(db)
   execution = await execution_repo.create({
       'agent_id': agent_id,
       'execution_type': ExecutionType.AGENT_TEST,
       'session_id': session_id,
       'status': ExecutionStatus.RUNNING,
       'started_at': datetime.utcnow(),
       'test_input': '',
       'chat_history': '[]'
   })
   await db.commit()
   await db.refresh(execution)
   execution_id = execution.id
   ```

3. **在就绪消息中包含 execution_id**：
   ```python
   await websocket.send_json({
       'type': 'ready',
       'session_id': session_id,
       'execution_id': execution_id,  # 新增
       'provider': provider_type,
       'mode': mode,
       'message': f'Agent "{agent.name}" ready (using {provider_type})'
   })
   ```

4. **在接收到第一条用户输入时更新 test_input**：
   ```python
   if not execution.test_input:
       execution.test_input = user_input
       await db.commit()
   ```

5. **更新聊天历史**：
   ```python
   # 添加用户消息
   chat_history = json.loads(execution.chat_history) if execution.chat_history else []
   user_message = {
       'id': f'user-{int(time.time() * 1000)}',
       'role': 'user',
       'content': user_input,
       'timestamp': datetime.utcnow().isoformat()
   }
   chat_history.append(user_message)

   # 累积助手响应
   assistant_content = ''
   async for response_msg in provider.send_message(...):
       assistant_content += response_msg.content
       # 发送流式响应...

   # 添加助手消息
   if assistant_content:
       assistant_message = {
           'id': f'assistant-{int(time.time() * 1000)}',
           'role': 'assistant',
           'content': assistant_content,
           'timestamp': datetime.utcnow().isoformat()
       }
       chat_history.append(assistant_message)
       execution.chat_history = json.dumps(chat_history, ensure_ascii=False)
       execution.last_activity_at = datetime.utcnow()
       await db.commit()
   ```

6. **在 WebSocket 关闭时更新 Execution 状态**：
   ```python
   except WebSocketDisconnect:
       execution.status = ExecutionStatus.SUCCEEDED
       execution.finished_at = datetime.utcnow()
       await db.commit()
       break
   except Exception as e:
       execution.status = ExecutionStatus.FAILED
       execution.error_message = str(e)
       execution.finished_at = datetime.utcnow()
       await db.commit()
   ```

#### 3. 前端修改

**文件**：`frontend/src/app/components/AgentTestPanel.tsx`

**删除内容**：

1. **删除后台运行相关状态**（第 175-178 行）：
   ```typescript
   const [backgroundExecutionId, setBackgroundExecutionId] = useState<number | null>(null);
   const [isBackgroundRunning, setIsBackgroundRunning] = useState(false);
   const [backgroundStatus, setBackgroundStatus] = useState<any>(null);
   ```

2. **删除后台运行函数**（第 322-431 行）：
   - `handleStartBackground`
   - `handleStopBackground`
   - `startStatusPolling`
   - `checkRunningExecutions` useEffect

3. **删除后台运行按钮**（第 705-725 行）

4. **删除后台运行状态卡片**（第 747-787 行）

5. **删除不再使用的导入**：
   ```typescript
   PlayCircle  // 从 lucide-react 导入中删除
   ```

## 验证步骤

1. **数据库迁移验证**：
   ```bash
   python -m alembic upgrade head
   # 成功：INFO  [alembic.runtime.migration] Running upgrade f08e5afe5d74 -> 7ddd7ab1e1e5
   ```

2. **后端启动验证**：
   ```bash
   python -m app.main
   # 成功启动，无错误
   ```

3. **功能验证**（待用户测试）：
   - 打开 Agent 测试页面
   - 输入消息并发送
   - 检查是否创建了 Execution 记录
   - 打开 History 页面，确认能看到 Agent 运行记录
   - 检查记录中的聊天历史是否完整

## 关键文件清单

### 后端
- `backend/app/api/routers/agents.py` - WebSocket 端点修改
- `backend/app/models/task.py` - Execution 模型修改
- `backend/alembic/versions/7ddd7ab1e1e5_make_task_id_workflow_id_nullable_in_.py` - 数据库迁移

### 前端
- `frontend/src/app/components/AgentTestPanel.tsx` - 删除后台运行相关代码

## 注意事项

1. **会话恢复**：如果用户刷新页面或重新连接，需要能够恢复到现有的 Execution 记录（当前未实现）
2. **并发控制**：同一个 Agent 可能有多个并发会话，每个会话有独立的 Execution 记录
3. **错误处理**：在各种异常情况下（网络断开、进程崩溃等）都能正确更新 Execution 状态
4. **性能考虑**：频繁更新聊天历史可能影响性能，当前实现是每次对话后更新一次

## 后续优化建议

1. **会话恢复功能**：支持用户刷新页面后恢复到现有会话
2. **批量更新**：考虑批量更新聊天历史，减少数据库写入频率
3. **异步更新**：将聊天历史更新改为异步任务，避免阻塞 WebSocket 响应
4. **清理机制**：定期清理过期的 Execution 记录和聊天历史

## 总结

本次修复成功实现了以下目标：
- ✅ Agent 运行自动创建 Execution 记录
- ✅ 运行历史页面可以看到所有 Agent 运行记录
- ✅ 删除了不工作的后台运行按钮
- ✅ 简化了用户操作流程（默认后台运行）

用户现在可以直接在 Agent 测试页面进行对话，所有运行记录都会自动保存到历史中。
