# AgentTeam 协作机制 - 架构设计文档

**设计日期**: 2026-02-24
**架构师**: architect (team lead 协助)
**项目**: Claude Manager Phase 6

## 1. 系统架构概述

### 1.1 整体架构

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React)                      │
│  - Dashboard UI                                          │
│  - Team Management Interface                             │
│  - Real-time Status Display (WebSocket)                 │
└─────────────────┬───────────────────────────────────────┘
                  │ HTTP/WebSocket
┌─────────────────▼───────────────────────────────────────┐
│                  API Layer (FastAPI)                     │
│  - RESTful Endpoints                                     │
│  - WebSocket Endpoints                                   │
│  - Request Validation                                    │
└─────────────────┬───────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────┐
│                  Service Layer                           │
│  ┌──────────────────┐  ┌──────────────────┐            │
│  │ Message Service  │  │ Task Scheduler   │            │
│  │ - P2P Messages   │  │ - Priority Queue │            │
│  │ - Broadcast      │  │ - Dependencies   │            │
│  │ - Queue Mgmt     │  │ - Assignment     │            │
│  └──────────────────┘  └──────────────────┘            │
│  ┌──────────────────────────────────────────┐          │
│  │      Team State Manager                   │          │
│  │      - Member Status                      │          │
│  │      - Team Status                        │          │
│  │      - State Sync                         │          │
│  └──────────────────────────────────────────┘          │
└─────────────────┬───────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────┐
│              Data Layer (SQLAlchemy)                     │
│  - AgentTeam Model                                       │
│  - TeamMessage Model                                     │
│  - TeamTask Model                                        │
│  - TeamState Model                                       │
└─────────────────┬───────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────┐
│              Database (SQLite/PostgreSQL)                │
└──────────────────────────────────────────────────────────┘
```

### 1.2 核心组件

1. **Message Service** - 成员间通信
2. **Task Scheduler** - 任务分配和调度
3. **Team State Manager** - 状态跟踪和同步

## 2. 消息传递机制设计

### 2.1 消息队列方案

**选择：内存队列（原型阶段）**

**理由**：
- 简单易实现，无需额外依赖
- 适合原型验证
- 后续可升级到 Redis

**数据结构**：
```python
class MessageQueue:
    def __init__(self):
        self._queues: Dict[int, asyncio.Queue] = {}  # agent_id -> Queue
        self._lock = asyncio.Lock()

    async def send(self, to_agent_id: int, message: Message):
        """发送消息到指定成员"""

    async def receive(self, agent_id: int, timeout: float = None) -> Message:
        """接收消息（阻塞）"""

    async def broadcast(self, from_agent_id: int, message: Message):
        """广播消息到所有成员"""
```

### 2.2 消息格式

```python
class Message(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    from_agent_id: int
    to_agent_id: Optional[int] = None  # None = broadcast
    type: MessageType  # task_assignment, status_update, data, error
    content: Dict[str, Any]
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    priority: int = 0  # 0 = normal, 1 = high, 2 = urgent
```

### 2.3 消息类型

```python
class MessageType(str, Enum):
    TASK_ASSIGNMENT = "task_assignment"
    STATUS_UPDATE = "status_update"
    DATA_TRANSFER = "data_transfer"
    ERROR_NOTIFICATION = "error_notification"
    HEARTBEAT = "heartbeat"
```

### 2.4 通信模式

**点对点（P2P）**：
```python
await message_service.send_message(
    from_agent_id=1,
    to_agent_id=2,
    type=MessageType.TASK_ASSIGNMENT,
    content={"task_id": 123, "description": "..."}
)
```

**广播（Broadcast）**：
```python
await message_service.broadcast_message(
    from_agent_id=1,
    type=MessageType.STATUS_UPDATE,
    content={"status": "completed", "task_id": 123}
)
```

## 3. 任务调度算法设计

### 3.1 任务数据模型

```python
class TeamTask(Base):
    __tablename__ = "team_tasks"

    id: Mapped[int] = mapped_column(primary_key=True)
    team_id: Mapped[int] = mapped_column(ForeignKey("agent_teams.id"))
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text)
    assigned_to: Mapped[Optional[int]] = mapped_column(ForeignKey("agents.id"))
    status: Mapped[str] = mapped_column(String(20))  # pending, in_progress, completed, failed
    priority: Mapped[int] = mapped_column(default=0)
    dependencies: Mapped[List[int]] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime]
    started_at: Mapped[Optional[datetime]]
    completed_at: Mapped[Optional[datetime]]
```

### 3.2 调度算法

**优先级队列 + 依赖解析**

```python
class TaskScheduler:
    def __init__(self):
        self._task_queue = PriorityQueue()
        self._dependency_graph: Dict[int, Set[int]] = {}

    async def schedule_task(self, task: TeamTask) -> bool:
        """调度任务（检查依赖）"""
        if self._has_unresolved_dependencies(task):
            return False

        # 按优先级加入队列
        await self._task_queue.put((task.priority, task.id, task))
        return True

    async def get_next_task(self, agent_id: int) -> Optional[TeamTask]:
        """获取下一个可执行任务"""
        while not self._task_queue.empty():
            priority, task_id, task = await self._task_queue.get()

            # 再次检查依赖（可能已变化）
            if not self._has_unresolved_dependencies(task):
                task.assigned_to = agent_id
                task.status = "in_progress"
                return task

        return None

    def _has_unresolved_dependencies(self, task: TeamTask) -> bool:
        """检查是否有未完成的依赖"""
        for dep_id in task.dependencies:
            dep_task = self._get_task(dep_id)
            if dep_task.status != "completed":
                return True
        return False
```

### 3.3 任务分配策略

**策略 1：手动分配**
- Team lead 明确指定任务给特定成员

**策略 2：自动分配**
- 成员完成当前任务后，自动领取下一个可用任务
- 基于优先级和依赖关系

**策略 3：负载均衡**
- 考虑成员当前负载
- 均匀分配任务

## 4. 状态管理方案

### 4.1 状态数据模型

```python
class TeamState(Base):
    __tablename__ = "team_states"

    id: Mapped[int] = mapped_column(primary_key=True)
    team_id: Mapped[int] = mapped_column(ForeignKey("agent_teams.id"))
    status: Mapped[str] = mapped_column(String(20))  # idle, running, paused, completed, error
    member_states: Mapped[Dict[int, str]] = mapped_column(JSON)  # agent_id -> status
    current_tasks: Mapped[Dict[int, int]] = mapped_column(JSON)  # agent_id -> task_id
    updated_at: Mapped[datetime]
```

### 4.2 成员状态

```python
class MemberStatus(str, Enum):
    AVAILABLE = "available"
    BUSY = "busy"
    OFFLINE = "offline"
    ERROR = "error"
```

### 4.3 状态同步机制

**实时同步（WebSocket）**：
```python
class TeamStateManager:
    def __init__(self):
        self._connections: Dict[int, WebSocket] = {}
        self._state_cache: Dict[int, TeamState] = {}

    async def update_member_status(
        self,
        team_id: int,
        agent_id: int,
        status: MemberStatus
    ):
        """更新成员状态并广播"""
        # 更新数据库
        await self._update_db(team_id, agent_id, status)

        # 更新缓存
        self._state_cache[team_id].member_states[agent_id] = status

        # 广播到所有连接
        await self._broadcast_state_change(team_id, {
            "type": "member_status_change",
            "agent_id": agent_id,
            "status": status,
            "timestamp": datetime.utcnow().isoformat()
        })
```

### 4.4 心跳机制

```python
class HeartbeatMonitor:
    HEARTBEAT_INTERVAL = 30  # seconds
    TIMEOUT_THRESHOLD = 90  # seconds

    async def monitor_member(self, team_id: int, agent_id: int):
        """监控成员心跳"""
        last_heartbeat = time.time()

        while True:
            await asyncio.sleep(self.HEARTBEAT_INTERVAL)

            # 检查超时
            if time.time() - last_heartbeat > self.TIMEOUT_THRESHOLD:
                await self._mark_member_offline(team_id, agent_id)
                break
```

## 5. API 接口设计

### 5.1 RESTful 端点

**消息相关**：
```python
POST   /api/team-messages              # 发送消息
GET    /api/team-messages/{team_id}    # 获取消息历史
POST   /api/team-messages/broadcast    # 广播消息
```

**任务相关**：
```python
POST   /api/team-tasks                 # 创建任务
GET    /api/team-tasks/{team_id}       # 获取任务列表
PUT    /api/team-tasks/{task_id}       # 更新任务
DELETE /api/team-tasks/{task_id}       # 删除任务
POST   /api/team-tasks/{task_id}/assign # 分配任务
GET    /api/team-tasks/next/{agent_id} # 获取下一个任务
```

**状态相关**：
```python
GET    /api/team-state/{team_id}       # 获取团队状态
PUT    /api/team-state/{team_id}/member/{agent_id} # 更新成员状态
```

**执行控制**：
```python
POST   /api/team-execution/start       # 启动团队执行
POST   /api/team-execution/pause       # 暂停执行
POST   /api/team-execution/resume      # 恢复执行
POST   /api/team-execution/stop        # 停止执行
```

### 5.2 WebSocket 端点

```python
WS     /api/team-state/ws/{team_id}    # 实时状态推送
```

**消息格式**：
```json
{
  "type": "state_update",
  "team_id": 1,
  "data": {
    "status": "running",
    "member_states": {
      "1": "busy",
      "2": "available"
    },
    "current_tasks": {
      "1": 123
    }
  },
  "timestamp": "2026-02-24T10:00:00Z"
}
```

## 6. 数据模型设计

### 6.1 TeamMessage 模型

```python
class TeamMessage(Base):
    __tablename__ = "team_messages"

    id: Mapped[int] = mapped_column(primary_key=True)
    team_id: Mapped[int] = mapped_column(ForeignKey("agent_teams.id"))
    from_agent_id: Mapped[int]
    to_agent_id: Mapped[Optional[int]]  # None = broadcast
    type: Mapped[str] = mapped_column(String(50))
    content: Mapped[Dict] = mapped_column(JSON)
    priority: Mapped[int] = mapped_column(default=0)
    read: Mapped[bool] = mapped_column(default=False)
    created_at: Mapped[datetime]
```

### 6.2 TeamTask 模型

（见 3.1 节）

### 6.3 TeamState 模型

（见 4.1 节）

### 6.4 数据库关系

```
AgentTeam (1) ──< (N) TeamMessage
AgentTeam (1) ──< (N) TeamTask
AgentTeam (1) ──< (1) TeamState
```

## 7. 实施建议

### 7.1 Phase 1：核心功能（MVP）

**优先级 1**：
1. 内存消息队列
2. 基础任务调度（无依赖）
3. 简单状态管理

**预期时间**：2-3 天

### 7.2 Phase 2：增强功能

**优先级 2**：
1. 任务依赖管理
2. WebSocket 实时状态
3. 心跳监控

**预期时间**：3-4 天

### 7.3 Phase 3：优化和扩展

**优先级 3**：
1. Redis 消息队列
2. 负载均衡
3. 性能监控

**预期时间**：2-3 天

### 7.4 技术选型

**消息队列**：
- Phase 1: 内存队列（asyncio.Queue）
- Phase 2+: Redis（可选）

**状态存储**：
- 数据库：持久化状态
- 内存缓存：快速访问

**实时通信**：
- WebSocket（FastAPI 内置支持）

### 7.5 性能考虑

**预期负载**：
- 并发团队：10-20 个
- 每团队成员：3-5 个
- 消息频率：< 10 msg/sec/team

**性能目标**：
- 消息延迟：< 100ms
- 任务调度延迟：< 500ms
- 状态更新延迟：< 200ms

### 7.6 安全考虑

1. **消息验证**：验证发送者身份
2. **权限检查**：成员只能访问自己团队的数据
3. **输入验证**：所有 API 输入使用 Pydantic 验证
4. **SQL 注入防护**：使用 ORM，避免原生 SQL

## 8. 测试策略

### 8.1 单元测试

```python
# tests/services/test_message_service.py
async def test_send_message():
    service = MessageService()
    await service.send_message(from_id=1, to_id=2, content={})
    messages = await service.get_messages(agent_id=2)
    assert len(messages) == 1

# tests/services/test_task_scheduler.py
async def test_schedule_with_dependencies():
    scheduler = TaskScheduler()
    task1 = create_task(id=1, dependencies=[])
    task2 = create_task(id=2, dependencies=[1])

    assert await scheduler.schedule_task(task1) == True
    assert await scheduler.schedule_task(task2) == False  # blocked
```

### 8.2 集成测试

```python
# tests/integration/test_team_workflow.py
async def test_complete_workflow():
    # 1. 创建团队
    team = await create_team()

    # 2. 添加成员
    await add_members(team.id, [agent1, agent2])

    # 3. 创建任务
    task = await create_task(team.id)

    # 4. 分配任务
    await assign_task(task.id, agent1.id)

    # 5. 发送消息
    await send_message(agent1.id, agent2.id, "data")

    # 6. 验证状态
    state = await get_team_state(team.id)
    assert state.member_states[agent1.id] == "busy"
```

### 8.3 性能测试

```python
# tests/performance/test_message_throughput.py
async def test_message_throughput():
    service = MessageService()

    start = time.time()
    for i in range(1000):
        await service.send_message(from_id=1, to_id=2, content={})
    duration = time.time() - start

    throughput = 1000 / duration
    assert throughput > 100  # > 100 msg/sec
```

## 9. 部署考虑

### 9.1 环境要求

- Python 3.10+
- FastAPI 0.100+
- SQLAlchemy 2.0+
- asyncio 支持

### 9.2 配置管理

```python
# config/settings.py
class TeamSettings(BaseSettings):
    MESSAGE_QUEUE_SIZE: int = 1000
    TASK_SCHEDULER_INTERVAL: int = 5  # seconds
    HEARTBEAT_INTERVAL: int = 30  # seconds
    WEBSOCKET_PING_INTERVAL: int = 20  # seconds
```

### 9.3 监控指标

- 消息队列长度
- 任务完成率
- 成员在线率
- API 响应时间

---

**文档状态**: 已完成
**审核状态**: 待审核
**下一阶段**: 代码实现
