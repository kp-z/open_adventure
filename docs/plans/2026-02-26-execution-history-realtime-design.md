# Dashboard Execution History 实时更新设计文档

**创建日期**：2026-02-26
**章节编号**：01
**作者**：Claude AI
**状态**：已发布

## 目录
- [概述](#概述)
- [需求分析](#需求分析)
- [技术方案](#技术方案)
- [数据模型设计](#数据模型设计)
- [后端架构设计](#后端架构设计)
- [前端架构设计](#前端架构设计)
- [数据流设计](#数据流设计)
- [UI/UX 设计](#uiux-设计)
- [测试策略](#测试策略)
- [部署计划](#部署计划)
- [风险评估](#风险评估)

## 概述

本设计文档描述了 Dashboard Execution History 功能的重构方案，目标是实现 Agent 测试执行和 Workflow 执行的统一历史记录展示，支持实时状态更新、后台执行和消息监控。

### 核心目标

1. **统一执行记录**：Agent 测试和 Workflow 执行使用统一的数据模型
2. **实时状态更新**：通过 WebSocket 推送执行状态变化
3. **后台执行支持**：用户可以离开页面，执行继续进行
4. **可视化监控**：Dashboard 显示运行中的执行（高亮效果），右下角显示进度

## 需求分析

### 功能需求

1. **Dashboard Execution History 卡片**
   - 显示混合的执行历史（Agent 测试 + Workflow 执行）
   - 运行中的记录需要视觉高亮（"亮的"效果）
   - 按时间倒序排列
   - 显示执行类型、状态、时间信息

2. **Agent Test 页面**
   - 点击 Test 按钮触发后台执行
   - 执行过程中可以离开页面
   - 显示"测试已启动"提示

3. **右下角消息监控**
   - 实时显示后台执行的进度
   - 显示运行中的执行数量
   - 支持展开/折叠
   - 点击可跳转到对应的执行详情

### 非功能需求

1. **性能**：WebSocket 连接稳定，消息推送延迟 < 500ms
2. **可靠性**：WebSocket 断线自动重连，降级为轮询
3. **可扩展性**：支持未来添加更多执行类型
4. **用户体验**：流畅的动画效果，清晰的状态反馈

## 技术方案

### 方案选择

采用 **WebSocket 实时推送方案**：

**优点**：
- 实时性最佳（< 500ms 延迟）
- 双向通信，支持未来扩展（取消执行、暂停等）
- 架构清晰，适合多用户场景
- 技术成熟，FastAPI 和前端都有完善支持

**技术栈**：
- 后端：FastAPI WebSocket + asyncio 后台任务
- 前端：WebSocket API + React Context 全局状态管理
- 数据库：SQLite/PostgreSQL（扩展 Execution 表）

## 数据模型设计

### Execution 模型扩展

```python
class ExecutionType(str, enum.Enum):
    """执行类型"""
    WORKFLOW = "workflow"           # Workflow 执行
    AGENT_TEST = "agent_test"       # Agent 测试执行

class Execution(Base):
    __tablename__ = "executions"

    # 现有字段
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    task_id: Mapped[int] = mapped_column(ForeignKey("tasks.id"), nullable=False, index=True)
    workflow_id: Mapped[int] = mapped_column(ForeignKey("workflows.id"), nullable=False)
    status: Mapped[ExecutionStatus] = mapped_column(...)
    error_message: Mapped[Optional[str]] = mapped_column(String(2000), nullable=True)
    meta: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    finished_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # 新增字段
    execution_type: Mapped[ExecutionType] = mapped_column(
        SQLEnum(ExecutionType, native_enum=False),
        default=ExecutionType.WORKFLOW,
        nullable=False,
        index=True
    )
    agent_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True, index=True)
    test_input: Mapped[Optional[str]] = mapped_column(String(5000), nullable=True)
    test_output: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
```

### 数据库迁移

```python
# alembic/versions/xxxx_add_execution_type.py
def upgrade():
    op.add_column('executions', sa.Column('execution_type', sa.String(20), nullable=False, server_default='workflow'))
    op.add_column('executions', sa.Column('agent_id', sa.Integer(), nullable=True))
    op.add_column('executions', sa.Column('test_input', sa.String(5000), nullable=True))
    op.add_column('executions', sa.Column('test_output', sa.Text(), nullable=True))
    op.create_index('ix_executions_execution_type', 'executions', ['execution_type'])
    op.create_index('ix_executions_agent_id', 'executions', ['agent_id'])
```

## 后端架构设计

### WebSocket 连接管理器

```python
# backend/app/services/websocket_manager.py
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, client_id: str, websocket: WebSocket):
        await websocket.accept()
        self.active_connections[client_id] = websocket

    def disconnect(self, client_id: str):
        self.active_connections.pop(client_id, None)

    async def broadcast_execution_update(self, execution_data: dict):
        for connection in self.active_connections.values():
            await connection.send_json({
                "type": "execution_update",
                "data": execution_data
            })
```

### WebSocket API Endpoint

```python
# backend/app/api/routers/websocket.py
@router.websocket("/ws/executions")
async def websocket_executions(
    websocket: WebSocket,
    client_id: str = Query(...),
    manager: ConnectionManager = Depends(get_connection_manager)
):
    await manager.connect(client_id, websocket)
    try:
        while True:
            await websocket.receive_text()  # 心跳保活
    except WebSocketDisconnect:
        manager.disconnect(client_id)
```

### Agent 测试执行 API

```python
# backend/app/api/routers/agents.py
@router.post("/{agent_id}/test", response_model=ExecutionResponse)
async def test_agent(
    agent_id: int,
    test_input: str,
    db: AsyncSession = Depends(get_db),
    manager: ConnectionManager = Depends(get_connection_manager)
):
    # 1. 创建执行记录
    execution = await create_agent_test_execution(db, agent_id, test_input)

    # 2. 启动后台任务
    asyncio.create_task(execute_agent_test(execution.id, db, manager))

    # 3. 立即返回
    return ExecutionResponse.model_validate(execution)
```

### 后台执行逻辑

```python
async def execute_agent_test(execution_id: int, db: AsyncSession, manager: ConnectionManager):
    try:
        # 更新为 RUNNING
        await update_execution_status(db, execution_id, ExecutionStatus.RUNNING)
        await manager.broadcast_execution_update({"id": execution_id, "status": "running"})

        # 执行 Agent
        result = await call_claude_agent(...)

        # 更新为 SUCCEEDED
        await update_execution_status(db, execution_id, ExecutionStatus.SUCCEEDED, output=result.output)
        await manager.broadcast_execution_update({"id": execution_id, "status": "succeeded", "output": result.output})
    except Exception as e:
        # 更新为 FAILED
        await update_execution_status(db, execution_id, ExecutionStatus.FAILED, error_message=str(e))
        await manager.broadcast_execution_update({"id": execution_id, "status": "failed", "error": str(e)})
```

## 前端架构设计

### ExecutionContext 全局状态

```typescript
// frontend/src/app/contexts/ExecutionContext.tsx
export const ExecutionProvider: React.FC = ({ children }) => {
  const [executions, setExecutions] = useState<Map<number, Execution>>(new Map());
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  const connect = () => {
    const clientId = `client-${Date.now()}`;
    const ws = new WebSocket(`ws://localhost:8000/ws/executions?client_id=${clientId}`);

    ws.onopen = () => setIsConnected(true);
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === 'execution_update') {
        handleExecutionUpdate(message.data);
      }
    };

    wsRef.current = ws;
  };

  const runningExecutions = Array.from(executions.values())
    .filter(e => e.status === 'running');

  return (
    <ExecutionContext.Provider value={{ executions, runningExecutions, isConnected }}>
      {children}
    </ExecutionContext.Provider>
  );
};
```

### Dashboard 集成

```typescript
const ExecutionHistoryCard = () => {
  const { executions } = useExecutionContext();

  return (
    <GlassCard>
      <h2>Execution History</h2>
      {Array.from(executions.values()).map(execution => (
        <ExecutionItem
          key={execution.id}
          execution={execution}
          isRunning={execution.status === 'running'}
        />
      ))}
    </GlassCard>
  );
};
```

### 右下角监控组件

```typescript
export const ExecutionMonitor: React.FC = () => {
  const { runningExecutions } = useExecutionContext();
  const [expanded, setExpanded] = useState(false);

  if (runningExecutions.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {expanded ? (
        <div className="bg-gray-900 rounded-xl p-4 w-80">
          <h3>Running Executions</h3>
          {runningExecutions.map(execution => (
            <div key={execution.id}>
              <Loader className="animate-spin" />
              <span>{execution.execution_type === 'agent_test' ? 'Agent Test' : 'Workflow'}</span>
            </div>
          ))}
        </div>
      ) : (
        <button onClick={() => setExpanded(true)}>
          <Activity />
          <span>{runningExecutions.length}</span>
        </button>
      )}
    </div>
  );
};
```

## 数据流设计

### 完整执行流程

```
1. 用户点击 Agent Test "运行"按钮
   ↓
2. 前端调用 POST /agents/{id}/test
   ↓
3. 后端创建 Execution 记录（status=PENDING）
   ↓
4. 后端启动 asyncio 后台任务
   ↓
5. 后端立即返回 Execution 记录
   ↓
6. 前端显示"测试已启动"提示
   ↓
7. 后台任务更新状态为 RUNNING，通过 WebSocket 广播
   ↓
8. 前端 ExecutionContext 接收更新
   ↓
9. Dashboard 显示运行中记录（高亮）
   ↓
10. 右下角监控显示进度
   ↓
11. 后台任务完成，更新状态为 SUCCEEDED/FAILED
   ↓
12. WebSocket 广播最终状态
   ↓
13. 前端更新显示
```

### WebSocket 消息格式

```json
{
  "type": "execution_update",
  "data": {
    "id": 123,
    "execution_type": "agent_test",
    "status": "running",
    "agent_id": 5,
    "started_at": "2026-02-26T10:30:00Z",
    "output": null,
    "error": null
  }
}
```

## UI/UX 设计

### 运行中视觉效果

```css
.execution-item.running {
  animation: pulse-glow 2s ease-in-out infinite;
}

@keyframes pulse-glow {
  0%, 100% {
    box-shadow: 0 0 10px rgba(59, 130, 246, 0.3);
    border-color: rgba(59, 130, 246, 0.5);
  }
  50% {
    box-shadow: 0 0 20px rgba(59, 130, 246, 0.6);
    border-color: rgba(59, 130, 246, 0.8);
  }
}
```

### 状态颜色方案

- **运行中**：蓝色发光边框 + 脉动动画
- **成功**：绿色边框 + 静态指示器
- **失败**：红色边框 + 静态指示器
- **待处理**：灰色边框

## 测试策略

### 单元测试

- WebSocket 连接管理器测试
- 执行创建和状态更新测试
- 消息广播测试

### 集成测试

- 完整执行流程测试
- WebSocket 重连测试
- 多客户端同步测试

### 手动测试清单

- [ ] Agent 测试启动后立即显示
- [ ] 切换页面执行继续
- [ ] 右下角监控正常显示
- [ ] 执行完成状态正确
- [ ] WebSocket 断线自动重连
- [ ] 多执行同时运行互不干扰

## 部署计划

### 部署步骤

1. 运行数据库迁移：`alembic upgrade head`
2. 配置环境变量（WebSocket URL）
3. 启动后端服务
4. 部署前端（配置 Nginx WebSocket 代理）
5. 验证 WebSocket 连接

### Nginx 配置

```nginx
location /ws/ {
    proxy_pass http://backend:8000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_read_timeout 86400;
}
```

### 回滚计划

1. 数据库回滚：`alembic downgrade -1`
2. 代码回滚到上一版本
3. 前端降级为轮询模式

## 风险评估

### 技术风险

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|----------|
| WebSocket 连接不稳定 | 高 | 中 | 自动重连 + 降级轮询 |
| 并发执行过多导致性能问题 | 中 | 低 | 限制最大并发数 |
| 数据库迁移失败 | 高 | 低 | 充分测试 + 回滚脚本 |

### 业务风险

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|----------|
| 用户体验不符合预期 | 中 | 中 | 原型测试 + 用户反馈 |
| 执行历史数据量过大 | 低 | 中 | 定期清理 + 分页加载 |

## 参考资料

- FastAPI WebSocket 文档：https://fastapi.tiangolo.com/advanced/websockets/
- React Context API：https://react.dev/reference/react/useContext
- WebSocket API：https://developer.mozilla.org/en-US/docs/Web/API/WebSocket
