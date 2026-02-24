# AgentTeam 协作机制 - 需求分析文档

**分析日期**: 2026-02-24
**分析师**: requirements-analyst
**项目**: Claude Manager Phase 6

## 1. 现有功能分析

### 1.1 数据模型 (backend/app/models/agent_team.py)

**AgentTeam 模型**：
- 字段：id, name, description, members, tags, meta, created_at, updated_at
- members 字段：JSON 格式，存储成员列表
- 支持基础的 CRUD 操作

**现有功能**：
- 团队的创建、读取、更新、删除
- 成员信息存储（agent_id, role, priority）
- 标签和元数据支持

**局限性**：
- 缺少团队状态管理（运行中、空闲、错误）
- 缺少成员间的通信机制
- 缺少任务分配和调度功能

### 1.2 服务层 (backend/app/services/agent_team_service.py)

**AgentTeamService**：
- 基础 CRUD 操作
- 团队列表查询（分页、过滤）
- 成员管理（添加、删除）

**现有功能**：
- 团队配置管理
- 数据持久化
- 基础验证

**局限性**：
- 没有运行时状态管理
- 没有任务调度逻辑
- 没有消息传递机制

### 1.3 API 层 (backend/app/api/routers/agent_teams.py)

**现有端点**：
- POST /agent-teams - 创建团队
- GET /agent-teams - 列表查询
- GET /agent-teams/{id} - 获取详情
- PUT /agent-teams/{id} - 更新团队
- DELETE /agent-teams/{id} - 删除团队
- POST /agent-teams/generate - AI 生成团队配置

**现有功能**：
- RESTful API 接口
- AI 辅助生成团队配置
- 基础的增删改查

**局限性**：
- 缺少团队执行相关的端点
- 缺少实时状态查询
- 缺少消息传递接口

## 2. 需要新增的功能

### 2.1 消息传递机制

**功能描述**：
实现 AgentTeam 成员之间的消息传递，支持点对点通信和广播。

**核心需求**：
1. **消息队列**：
   - 每个成员有独立的消息队列
   - 支持异步消息传递
   - 消息持久化（可选）

2. **消息类型**：
   - 任务分配消息
   - 状态更新消息
   - 数据传递消息
   - 错误通知消息

3. **通信模式**：
   - 点对点（P2P）：成员间直接通信
   - 广播（Broadcast）：向所有成员发送
   - 订阅（Subscribe）：订阅特定类型的消息

**技术方案选项**：
- 选项 A：基于 Redis 的消息队列
- 选项 B：基于 RabbitMQ 的消息代理
- 选项 C：基于内存的简单队列（适合原型）

### 2.2 任务调度机制

**功能描述**：
实现任务的分配、调度和执行管理。

**核心需求**：
1. **任务管理**：
   - 任务创建和分配
   - 任务状态跟踪（pending, in_progress, completed, failed）
   - 任务依赖关系管理
   - 任务优先级排序

2. **调度算法**：
   - 基于优先级的调度
   - 基于依赖关系的调度
   - 负载均衡（成员间任务分配）

3. **执行监控**：
   - 任务执行进度跟踪
   - 超时检测和处理
   - 失败重试机制

**数据结构**：
```python
Task:
  - id: int
  - team_id: int
  - title: str
  - description: str
  - assigned_to: int (agent_id)
  - status: str
  - priority: int
  - dependencies: List[int]
  - created_at: datetime
  - started_at: datetime
  - completed_at: datetime
```

### 2.3 团队状态管理

**功能描述**：
实时跟踪和管理团队及成员的运行状态。

**核心需求**：
1. **团队状态**：
   - idle：空闲，等待任务
   - running：执行中
   - paused：暂停
   - completed：已完成
   - error：错误状态

2. **成员状态**：
   - available：可用
   - busy：忙碌
   - offline：离线
   - error：错误

3. **状态同步**：
   - 实时状态更新
   - 状态变更通知
   - 状态持久化

**实现方式**：
- 使用 WebSocket 实现实时状态推送
- 使用 Redis 存储运行时状态
- 定期状态检查和同步

## 3. 影响的模块和文件

### 3.1 需要新增的文件

**服务层**：
- `backend/app/services/message_service.py` - 消息传递服务
- `backend/app/services/task_scheduler.py` - 任务调度服务
- `backend/app/services/team_state_manager.py` - 团队状态管理服务

**数据模型**：
- `backend/app/models/team_message.py` - 消息模型
- `backend/app/models/team_task.py` - 任务模型
- `backend/app/models/team_state.py` - 状态模型

**API 路由**：
- `backend/app/api/routers/team_messages.py` - 消息 API
- `backend/app/api/routers/team_tasks.py` - 任务 API
- `backend/app/api/routers/team_execution.py` - 执行控制 API

**WebSocket**：
- `backend/app/api/websocket/team_status.py` - 状态推送

**测试**：
- `backend/tests/services/test_message_service.py`
- `backend/tests/services/test_task_scheduler.py`
- `backend/tests/services/test_team_state_manager.py`

### 3.2 需要修改的文件

**现有服务**：
- `backend/app/services/agent_team_service.py` - 集成新功能
- `backend/app/api/routers/agent_teams.py` - 添加新端点

**数据库迁移**：
- 新增表：team_messages, team_tasks, team_states
- 修改表：agent_teams（添加 status 字段）

## 4. 技术依赖

### 4.1 Python 包依赖

**消息队列**（选择其一）：
- `redis>=4.5.0` - Redis 客户端
- `aio-pika>=9.0.0` - RabbitMQ 异步客户端

**WebSocket**：
- `websockets>=11.0` - WebSocket 支持
- `python-socketio>=5.9.0` - Socket.IO 支持（可选）

**任务调度**：
- `apscheduler>=3.10.0` - 定时任务调度（可选）

### 4.2 基础设施依赖

**必需**：
- PostgreSQL 或 SQLite（已有）
- FastAPI（已有）

**可选**：
- Redis（用于消息队列和状态缓存）
- RabbitMQ（用于高级消息传递）

### 4.3 前端依赖

**实时通信**：
- WebSocket 客户端
- Socket.IO 客户端（如果使用 Socket.IO）

**状态管理**：
- React Context 或 Redux（用于团队状态）

## 5. 实施优先级

### 5.1 Phase 1（核心功能）
1. 任务调度机制（基础版）
2. 简单的消息传递（内存队列）
3. 基础状态管理

### 5.2 Phase 2（增强功能）
1. Redis 消息队列
2. WebSocket 实时状态
3. 任务依赖管理

### 5.3 Phase 3（高级功能）
1. 负载均衡
2. 失败重试
3. 性能监控

## 6. 风险和挑战

### 6.1 技术风险
- **并发控制**：多个成员同时访问共享资源
- **消息丢失**：网络故障导致消息丢失
- **状态不一致**：分布式状态同步问题

### 6.2 性能风险
- **消息队列性能**：高频消息传递的性能瓶颈
- **数据库压力**：频繁的状态更新
- **WebSocket 连接数**：大量并发连接

### 6.3 缓解措施
- 使用事务保证数据一致性
- 实现消息确认机制
- 使用连接池管理数据库连接
- 实现消息批处理减少网络开销

## 7. 成功标准

### 7.1 功能完整性
- ✅ 成员间可以发送和接收消息
- ✅ 任务可以被分配和执行
- ✅ 团队状态实时更新
- ✅ 支持任务依赖关系

### 7.2 性能指标
- 消息延迟 < 100ms
- 任务调度延迟 < 500ms
- 状态更新延迟 < 200ms
- 支持至少 10 个并发团队

### 7.3 可靠性
- 消息传递成功率 > 99.9%
- 任务执行成功率 > 95%
- 系统可用性 > 99%

## 8. 下一步行动

1. **架构设计**：基于本需求分析，设计详细的技术方案
2. **技术选型**：确定消息队列和状态管理的具体实现
3. **原型开发**：实现核心功能的最小可行版本
4. **测试验证**：编写测试用例，验证功能正确性

---

**文档状态**: 已完成
**审核状态**: 待审核
**下一阶段**: 架构设计
