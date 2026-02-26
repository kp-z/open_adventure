# Dashboard Execution History 实时更新实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**目标**：实现 Agent 测试执行和 Workflow 执行的统一历史记录展示，支持 WebSocket 实时更新和后台执行监控

**架构**：采用 WebSocket 实时推送方案，扩展 Execution 数据模型支持多种执行类型，前端使用 React Context 管理全局执行状态，后端使用 asyncio 后台任务执行 Agent 测试

**技术栈**：FastAPI WebSocket, asyncio, SQLAlchemy, React Context API, TypeScript, Tailwind CSS

---

## 任务概览

1. 数据库迁移 - 扩展 Execution 模型
2. 后端 WebSocket 管理器
3. 后端 WebSocket API 路由
4. 后端 Agent 测试执行服务
5. 后端 Agent 测试 API 端点
6. 前端 ExecutionContext 全局状态
7. 前端 ExecutionMonitor 右下角监控
8. 前端 Dashboard 集成
9. 前端 Agent Test 页面集成
10. 样式和动画效果
11. 集成测试
12. 文档更新

---

### 任务 1: 数据库迁移 - 扩展 Execution 模型

**文件**:
- Create: `backend/alembic/versions/20260226_add_execution_type.py`
- Modify: `backend/app/models/task.py:22-29`

**步骤 1: 在 task.py 中添加 ExecutionType 枚举**

在 `backend/app/models/task.py` 的 `ExecutionStatus` 枚举后添加：

```python
class ExecutionType(str, enum.Enum):
    """执行类型"""
    WORKFLOW = "workflow"
    AGENT_TEST = "agent_test"
```

**步骤 2: 扩展 Execution 模型字段**

在 `Execution` 类中添加新字段（在 `meta` 字段后）：

```python
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

**步骤 3: 创建数据库迁移脚本**

```bash
cd backend
alembic revision -m "add execution type and agent test fields"
```

**步骤 4: 编写迁移脚本内容**

在生成的迁移文件中编写：

```python
"""add execution type and agent test fields

Revision ID: xxxx
Revises: previous
Create Date: 2026-02-26
"""
from alembic import op
import sqlalchemy as sa

def upgrade():
    op.add_column('executions',
        sa.Column('execution_type', sa.String(20), nullable=False, server_default='workflow')
    )
    op.add_column('executions',
        sa.Column('agent_id', sa.Integer(), nullable=True)
    )
    op.add_column('executions',
        sa.Column('test_input', sa.String(5000), nullable=True)
    )
    op.add_column('executions',
        sa.Column('test_output', sa.Text(), nullable=True)
    )
    op.create_index('ix_executions_execution_type', 'executions', ['execution_type'])
    op.create_index('ix_executions_agent_id', 'executions', ['agent_id'])

def downgrade():
    op.drop_index('ix_executions_agent_id')
    op.drop_index('ix_executions_execution_type')
    op.drop_column('executions', 'test_output')
    op.drop_column('executions', 'test_input')
    op.drop_column('executions', 'agent_id')
    op.drop_column('executions', 'execution_type')
```

**步骤 5: 运行迁移**

```bash
alembic upgrade head
```

预期输出：`INFO  [alembic.runtime.migration] Running upgrade ... -> xxxx, add execution type and agent test fields`

**步骤 6: 提交更改**

```bash
git add backend/app/models/task.py backend/alembic/versions/
git commit -m "feat(db): 扩展 Execution 模型支持 Agent 测试执行类型

- 添加 ExecutionType 枚举（workflow/agent_test）
- 添加 agent_id, test_input, test_output 字段
- 创建相应的数据库索引

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### 任务 2: 后端 WebSocket 连接管理器

**文件**:
- Create: `backend/app/services/websocket_manager.py`
- Create: `backend/tests/services/test_websocket_manager.py`

**步骤 1: 编写 WebSocket 管理器测试**

```python
# backend/tests/services/test_websocket_manager.py
import pytest
from unittest.mock import AsyncMock, MagicMock
from app.services.websocket_manager import ConnectionManager

@pytest.mark.asyncio
async def test_connect_websocket():
    """测试 WebSocket 连接"""
    manager = ConnectionManager()
    websocket = AsyncMock()

    await manager.connect("client-1", websocket)

    websocket.accept.assert_called_once()
    assert "client-1" in manager.active_connections

@pytest.mark.asyncio
async def test_disconnect_websocket():
    """测试 WebSocket 断开"""
    manager = ConnectionManager()
    websocket = AsyncMock()

    await manager.connect("client-1", websocket)
    manager.disconnect("client-1")

    assert "client-1" not in manager.active_connections

@pytest.mark.asyncio
async def test_broadcast_execution_update():
    """测试广播执行更新"""
    manager = ConnectionManager()
    ws1 = AsyncMock()
    ws2 = AsyncMock()

    await manager.connect("client-1", ws1)
    await manager.connect("client-2", ws2)

    await manager.broadcast_execution_update({
        "id": 1,
        "status": "running"
    })

    ws1.send_json.assert_called_once()
    ws2.send_json.assert_called_once()
```

**步骤 2: 运行测试确认失败**

```bash
pytest backend/tests/services/test_websocket_manager.py -v
```

预期输出：`ModuleNotFoundError: No module named 'app.services.websocket_manager'`

**步骤 3: 实现 WebSocket 管理器**

```python
# backend/app/services/websocket_manager.py
"""
WebSocket 连接管理器
负责管理所有活跃的 WebSocket 连接并广播消息
"""
from typing import Dict
from fastapi import WebSocket
import logging

logger = logging.getLogger(__name__)

class ConnectionManager:
    """WebSocket 连接管理器"""

    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, client_id: str, websocket: WebSocket):
        """
        接受并存储 WebSocket 连接

        Args:
            client_id: 客户端唯一标识
            websocket: WebSocket 连接对象
        """
        await websocket.accept()
        self.active_connections[client_id] = websocket
        logger.info(f"WebSocket connected: {client_id}, total connections: {len(self.active_connections)}")

    def disconnect(self, client_id: str):
        """
        移除 WebSocket 连接

        Args:
            client_id: 客户端唯一标识
        """
        self.active_connections.pop(client_id, None)
        logger.info(f"WebSocket disconnected: {client_id}, total connections: {len(self.active_connections)}")

    async def broadcast_execution_update(self, execution_data: dict):
        """
        广播执行状态更新到所有连接的客户端

        Args:
            execution_data: 执行数据字典
        """
        message = {
            "type": "execution_update",
            "data": execution_data
        }

        # 广播到所有活跃连接
        disconnected_clients = []
        for client_id, connection in self.active_connections.items():
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.error(f"Failed to send message to {client_id}: {e}")
                disconnected_clients.append(client_id)

        # 清理断开的连接
        for client_id in disconnected_clients:
            self.disconnect(client_id)

        logger.debug(f"Broadcasted execution update to {len(self.active_connections)} clients")

# 全局单例
_connection_manager = None

def get_connection_manager() -> ConnectionManager:
    """获取全局 ConnectionManager 实例"""
    global _connection_manager
    if _connection_manager is None:
        _connection_manager = ConnectionManager()
    return _connection_manager
```

**步骤 4: 运行测试确认通过**

```bash
pytest backend/tests/services/test_websocket_manager.py -v
```

预期输出：`3 passed`

**步骤 5: 提交更改**

```bash
git add backend/app/services/websocket_manager.py backend/tests/services/test_websocket_manager.py
git commit -m "feat(websocket): 实现 WebSocket 连接管理器

- 支持连接/断开管理
- 支持广播消息到所有客户端
- 自动清理断开的连接
- 添加单元测试

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### 任务 3: 后端 WebSocket API 路由

**文件**:
- Create: `backend/app/api/routers/websocket.py`
- Modify: `backend/app/api/deps.py` (添加依赖)

**步骤 1: 创建 WebSocket 路由文件**

```python
# backend/app/api/routers/websocket.py
"""
WebSocket API 路由
提供实时执行状态更新的 WebSocket 端点
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, Depends
from app.services.websocket_manager import ConnectionManager, get_connection_manager
import logging

logger = logging.getLogger(__name__)
router = APIRouter(tags=["websocket"])

@router.websocket("/ws/executions")
async def websocket_executions(
    websocket: WebSocket,
    client_id: str = Query(..., description="客户端唯一标识"),
    manager: ConnectionManager = Depends(get_connection_manager)
):
    """
    WebSocket 端点：实时执行状态更新

    客户端连接后会接收所有执行状态变化的广播消息

    消息格式：
    {
        "type": "execution_update",
        "data": {
            "id": 123,
            "status": "running",
            "execution_type": "agent_test",
            ...
        }
    }
    """
    await manager.connect(client_id, websocket)

    try:
        while True:
            # 接收心跳消息保持连接
            data = await websocket.receive_text()
            logger.debug(f"Received heartbeat from {client_id}: {data}")

            # 可选：响应心跳
            if data == "ping":
                await websocket.send_text("pong")

    except WebSocketDisconnect:
        manager.disconnect(client_id)
        logger.info(f"Client {client_id} disconnected")
    except Exception as e:
        logger.error(f"WebSocket error for {client_id}: {e}")
        manager.disconnect(client_id)
```

**步骤 2: 在主路由中注册 WebSocket 路由**

修改 `backend/app/api/deps.py` 或主应用文件，添加：

```python
from app.api.routers import websocket

# 在 app 初始化时
app.include_router(websocket.router)
```

**步骤 3: 手动测试 WebSocket 连接**

启动后端服务：
```bash
cd backend
uvicorn app.main:app --reload
```

使用 WebSocket 客户端工具（如 wscat）测试：
```bash
wscat -c "ws://localhost:8000/ws/executions?client_id=test-client"
```

预期：连接成功，可以发送 "ping" 收到 "pong"

**步骤 4: 提交更改**

```bash
git add backend/app/api/routers/websocket.py
git commit -m "feat(api): 添加 WebSocket 执行状态更新端点

- 实现 /ws/executions WebSocket 路由
- 支持心跳保活机制
- 自动处理连接断开

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### 任务 4: 后端 Agent 测试执行服务

**文件**:
- Create: `backend/app/services/agent_test_service.py`
- Create: `backend/tests/services/test_agent_test_service.py`

**步骤 1: 编写 Agent 测试服务测试**

```python
# backend/tests/services/test_agent_test_service.py
import pytest
from unittest.mock import AsyncMock, patch
from app.services.agent_test_service import AgentTestService
from app.models.task import ExecutionStatus, ExecutionType

@pytest.mark.asyncio
async def test_create_agent_test_execution():
    """测试创建 Agent 测试执行记录"""
    db = AsyncMock()
    service = AgentTestService(db)

    execution = await service.create_agent_test_execution(
        agent_id=1,
        test_input="测试输入"
    )

    assert execution.execution_type == ExecutionType.AGENT_TEST
    assert execution.agent_id == 1
    assert execution.test_input == "测试输入"
    assert execution.status == ExecutionStatus.PENDING

@pytest.mark.asyncio
async def test_execute_agent_test_success():
    """测试 Agent 测试执行成功"""
    db = AsyncMock()
    manager = AsyncMock()
    service = AgentTestService(db)

    with patch('app.services.agent_test_service.call_claude_agent') as mock_call:
        mock_call.return_value = AsyncMock(output="测试输出", success=True)

        await service.execute_agent_test(1, manager)

        # 验证状态更新
        assert manager.broadcast_execution_update.call_count >= 2  # RUNNING + SUCCEEDED
```

**步骤 2: 运行测试确认失败**

```bash
pytest backend/tests/services/test_agent_test_service.py -v
```

**步骤 3: 实现 Agent 测试服务**

```python
# backend/app/services/agent_test_service.py
"""
Agent 测试执行服务
负责创建和执行 Agent 测试任务
"""
from datetime import datetime
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update

from app.models.task import Execution, ExecutionStatus, ExecutionType, Task
from app.models.agent import Agent
from app.services.websocket_manager import ConnectionManager
from app.adapters.claude.cli_adapter import ClaudeCliAdapter
import logging

logger = logging.getLogger(__name__)

class AgentTestService:
    """Agent 测试服务"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_agent_test_execution(
        self,
        agent_id: int,
        test_input: str
    ) -> Execution:
        """
        创建 Agent 测试执行记录

        Args:
            agent_id: Agent ID
            test_input: 测试输入

        Returns:
            Execution: 执行记录
        """
        # 创建一个临时 Task（或使用现有的测试 Task）
        task = Task(
            title=f"Agent Test #{agent_id}",
            description=f"Testing agent {agent_id}",
            status="pending"
        )
        self.db.add(task)
        await self.db.flush()

        # 创建执行记录
        execution = Execution(
            task_id=task.id,
            workflow_id=None,  # Agent 测试不需要 workflow
            execution_type=ExecutionType.AGENT_TEST,
            agent_id=agent_id,
            test_input=test_input,
            status=ExecutionStatus.PENDING,
            created_at=datetime.utcnow()
        )

        self.db.add(execution)
        await self.db.commit()
        await self.db.refresh(execution)

        logger.info(f"Created agent test execution {execution.id} for agent {agent_id}")
        return execution

    async def execute_agent_test(
        self,
        execution_id: int,
        manager: ConnectionManager
    ):
        """
        执行 Agent 测试（后台任务）

        Args:
            execution_id: 执行 ID
            manager: WebSocket 管理器
        """
        try:
            # 获取执行记录
            result = await self.db.execute(
                select(Execution).where(Execution.id == execution_id)
            )
            execution = result.scalar_one()

            # 更新状态为 RUNNING
            execution.status = ExecutionStatus.RUNNING
            execution.started_at = datetime.utcnow()
            await self.db.commit()

            # 广播状态更新
            await manager.broadcast_execution_update({
                "id": execution.id,
                "status": "running",
                "execution_type": "agent_test",
                "agent_id": execution.agent_id,
                "started_at": execution.started_at.isoformat()
            })

            # 调用 Claude Agent 执行测试
            adapter = ClaudeCliAdapter()
            result = await adapter.test_agent(
                agent_id=execution.agent_id,
                test_input=execution.test_input
            )

            # 更新状态为 SUCCEEDED
            execution.status = ExecutionStatus.SUCCEEDED
            execution.test_output = result.output
            execution.finished_at = datetime.utcnow()
            await self.db.commit()

            # 广播完成状态
            await manager.broadcast_execution_update({
                "id": execution.id,
                "status": "succeeded",
                "execution_type": "agent_test",
                "agent_id": execution.agent_id,
                "test_output": result.output,
                "finished_at": execution.finished_at.isoformat()
            })

            logger.info(f"Agent test execution {execution_id} succeeded")

        except Exception as e:
            logger.error(f"Agent test execution {execution_id} failed: {e}")

            # 更新状态为 FAILED
            execution.status = ExecutionStatus.FAILED
            execution.error_message = str(e)
            execution.finished_at = datetime.utcnow()
            await self.db.commit()

            # 广播失败状态
            await manager.broadcast_execution_update({
                "id": execution.id,
                "status": "failed",
                "execution_type": "agent_test",
                "agent_id": execution.agent_id,
                "error": str(e),
                "finished_at": execution.finished_at.isoformat()
            })
```

**步骤 4: 运行测试确认通过**

```bash
pytest backend/tests/services/test_agent_test_service.py -v
```

**步骤 5: 提交更改**

```bash
git add backend/app/services/agent_test_service.py backend/tests/services/test_agent_test_service.py
git commit -m "feat(service): 实现 Agent 测试执行服务

- 创建 Agent 测试执行记录
- 后台异步执行 Agent 测试
- 通过 WebSocket 广播状态更新
- 添加单元测试

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### 任务 5: 后端 Agent 测试 API 端点

**文件**:
- Modify: `backend/app/api/routers/agents.py` (添加 test 端点)
- Create: `backend/app/schemas/agent_test.py` (请求/响应模型)

**步骤 1: 创建 Agent 测试 Schema**

```python
# backend/app/schemas/agent_test.py
"""Agent 测试相关的 Schema"""
from pydantic import BaseModel, Field

class AgentTestRequest(BaseModel):
    """Agent 测试请求"""
    test_input: str = Field(..., description="测试输入", max_length=5000)

class AgentTestResponse(BaseModel):
    """Agent 测试响应"""
    execution_id: int = Field(..., description="执行 ID")
    status: str = Field(..., description="执行状态")
    message: str = Field(..., description="提示消息")

    class Config:
        from_attributes = True
```

**步骤 2: 在 agents.py 中添加 test 端点**

在 `backend/app/api/routers/agents.py` 末尾添加：

```python
import asyncio
from app.schemas.agent_test import AgentTestRequest, AgentTestResponse
from app.services.agent_test_service import AgentTestService
from app.services.websocket_manager import get_connection_manager

@router.post(
    "/{agent_id}/test",
    response_model=AgentTestResponse,
    summary="测试 Agent"
)
async def test_agent(
    agent_id: int,
    request: AgentTestRequest,
    service: AgentService = Depends(get_agent_service),
    db: AsyncSession = Depends(get_db)
):
    """
    测试 Agent（异步执行）

    1. 创建执行记录
    2. 启动后台任务
    3. 立即返回执行 ID
    4. 通过 WebSocket 推送状态更新
    """
    # 验证 Agent 存在
    agent = await service.get(agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    # 创建执行记录
    test_service = AgentTestService(db)
    execution = await test_service.create_agent_test_execution(
        agent_id=agent_id,
        test_input=request.test_input
    )

    # 启动后台任务
    manager = get_connection_manager()
    asyncio.create_task(
        test_service.execute_agent_test(execution.id, manager)
    )

    return AgentTestResponse(
        execution_id=execution.id,
        status="pending",
        message="Agent 测试已启动，请通过 WebSocket 或右下角监控查看进度"
    )
```

**步骤 3: 手动测试 API**

```bash
curl -X POST "http://localhost:8000/agents/1/test" \
  -H "Content-Type: application/json" \
  -d '{"test_input": "你好，请介绍一下你自己"}'
```

预期输出：
```json
{
  "execution_id": 1,
  "status": "pending",
  "message": "Agent 测试已启动，请通过 WebSocket 或右下角监控查看进度"
}
```

**步骤 4: 提交更改**

```bash
git add backend/app/api/routers/agents.py backend/app/schemas/agent_test.py
git commit -m "feat(api): 添加 Agent 测试 API 端点

- POST /agents/{id}/test 启动 Agent 测试
- 异步执行，立即返回执行 ID
- 通过 WebSocket 推送状态更新

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### 任务 6: 前端 ExecutionContext 全局状态

**文件**:
- Create: `frontend/src/app/contexts/ExecutionContext.tsx`
- Modify: `frontend/src/app/App.tsx` (添加 Provider)

**步骤 1: 创建 ExecutionContext 文件**

```typescript
// frontend/src/app/contexts/ExecutionContext.tsx
import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { toast } from 'sonner';

export interface Execution {
  id: number;
  execution_type: 'workflow' | 'agent_test';
  status: 'pending' | 'running' | 'succeeded' | 'failed' | 'cancelled';
  agent_id?: number;
  workflow_id?: number;
  test_input?: string;
  test_output?: string;
  error?: string;
  started_at?: string;
  finished_at?: string;
  created_at: string;
}

interface ExecutionContextType {
  executions: Map<number, Execution>;
  runningExecutions: Execution[];
  isConnected: boolean;
  connect: () => void;
  disconnect: () => void;
}

const ExecutionContext = createContext<ExecutionContextType | undefined>(undefined);

export const useExecutionContext = () => {
  const context = useContext(ExecutionContext);
  if (!context) {
    throw new Error('useExecutionContext must be used within ExecutionProvider');
  }
  return context;
};

interface ExecutionProviderProps {
  children: ReactNode;
}

export const ExecutionProvider: React.FC<ExecutionProviderProps> = ({ children }) => {
  const [executions, setExecutions] = useState<Map<number, Execution>>(new Map());
  const [isConnected, setIsConnected] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);

  const connect = () => {
    const clientId = `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const wsUrl = `ws://localhost:8000/ws/executions?client_id=${clientId}`;

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);
      setReconnectAttempts(0);

      // 启动心跳
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
      }
      heartbeatRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send('ping');
        }
      }, 30000);
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);

      // 清理心跳
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }

      // 自动重连（指数退避）
      const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
      console.log(`Reconnecting in ${delay}ms...`);
      setTimeout(() => {
        setReconnectAttempts(prev => prev + 1);
        connect();
      }, delay);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'execution_update') {
          handleExecutionUpdate(message.data);
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    wsRef.current = ws;
  };

  const disconnect = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
  };

  const handleExecutionUpdate = (data: Partial<Execution>) => {
    setExecutions(prev => {
      const updated = new Map(prev);
      const existing = prev.get(data.id!);

      // 合并更新
      updated.set(data.id!, {
        ...existing,
        ...data,
      } as Execution);

      // 状态变化通知
      if (existing && existing.status !== data.status) {
        if (data.status === 'succeeded') {
          toast.success(
            `${data.execution_type === 'agent_test' ? 'Agent 测试' : 'Workflow'} 执行成功`,
            {
              description: `执行 #${data.id} 已完成`,
            }
          );
        } else if (data.status === 'failed') {
          toast.error(
            `${data.execution_type === 'agent_test' ? 'Agent 测试' : 'Workflow'} 执行失败`,
            {
              description: data.error || '未知错误',
            }
          );
        }
      }

      return updated;
    });
  };

  // 自动连接
  useEffect(() => {
    connect();
    return () => disconnect();
  }, []);

  // 计算运行中的执行
  const runningExecutions = Array.from(executions.values())
    .filter(e => e.status === 'running')
    .slice(0, 10); // 最多显示 10 个

  return (
    <ExecutionContext.Provider
      value={{
        executions,
        runningExecutions,
        isConnected,
        connect,
        disconnect,
      }}
    >
      {children}
    </ExecutionContext.Provider>
  );
};
```

**步骤 2: 在 App.tsx 中添加 Provider**

在 `frontend/src/app/App.tsx` 中，将 ExecutionProvider 添加到 Provider 树中：

```typescript
import { ExecutionProvider } from './contexts/ExecutionContext';

// 在其他 Provider 内部添加
<ExecutionProvider>
  {/* 现有的路由和组件 */}
</ExecutionProvider>
```

**步骤 3: 测试 WebSocket 连接**

启动前端开发服务器：
```bash
cd frontend
npm run dev
```

打开浏览器控制台，应该看到：`WebSocket connected`

**步骤 4: 提交更改**

```bash
git add frontend/src/app/contexts/ExecutionContext.tsx frontend/src/app/App.tsx
git commit -m "feat(frontend): 实现 ExecutionContext 全局状态管理

- WebSocket 连接管理
- 自动重连机制（指数退避）
- 心跳保活
- 执行状态更新和通知
- 运行中执行列表计算

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### 任务 7: 前端 ExecutionMonitor 右下角监控

**文件**:
- Create: `frontend/src/app/components/ExecutionMonitor.tsx`
- Modify: `frontend/src/app/App.tsx` (添加组件)

**步骤 1: 创建 ExecutionMonitor 组件**

```typescript
// frontend/src/app/components/ExecutionMonitor.tsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Activity, Loader, ChevronDown, ChevronUp, X } from 'lucide-react';
import { useExecutionContext } from '../contexts/ExecutionContext';
import { useNavigate } from 'react-router';

export const ExecutionMonitor: React.FC = () => {
  const { runningExecutions } = useExecutionContext();
  const [expanded, setExpanded] = useState(false);
  const navigate = useNavigate();

  // 如果没有运行中的执行，不显示
  if (runningExecutions.length === 0) return null;

  const handleExecutionClick = (execution: any) => {
    if (execution.execution_type === 'agent_test') {
      navigate(`/agents/${execution.agent_id}/test`);
    } else {
      navigate(`/executions/${execution.id}`);
    }
    setExpanded(false);
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return `${seconds}秒前`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}分钟前`;
    return `${Math.floor(seconds / 3600)}小时前`;
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <AnimatePresence mode="wait">
        {expanded ? (
          <motion.div
            key="expanded"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="bg-gray-900/95 backdrop-blur-xl border border-white/20 rounded-2xl p-4 w-80 shadow-2xl"
          >
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Activity size={16} className="text-blue-400" />
                运行中的任务
              </h3>
              <button
                onClick={() => setExpanded(false)}
                className="p-1 hover:bg-white/10 rounded-lg transition-colors"
              >
                <ChevronDown size={16} className="text-gray-400" />
              </button>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {runningExecutions.map(execution => (
                <button
                  key={execution.id}
                  onClick={() => handleExecutionClick(execution)}
                  className="w-full text-left p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-colors border border-white/10"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Loader size={14} className="animate-spin text-blue-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">
                        {execution.execution_type === 'agent_test'
                          ? `Agent 测试 #${execution.agent_id}`
                          : `Workflow #${execution.workflow_id}`}
                      </p>
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-500">
                    开始于 {execution.started_at ? formatRelativeTime(execution.started_at) : '刚刚'}
                  </p>
                </button>
              ))}
            </div>

            <div className="mt-3 pt-3 border-t border-white/10">
              <p className="text-[10px] text-gray-500 text-center">
                点击任务查看详情
              </p>
            </div>
          </motion.div>
        ) : (
          <motion.button
            key="collapsed"
            onClick={() => setExpanded(true)}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            transition={{ duration: 0.2 }}
            className="relative bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-full p-4 shadow-2xl transition-all"
          >
            <Activity size={24} />
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center border-2 border-gray-900">
              {runningExecutions.length}
            </span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
};
```

**步骤 2: 在 App.tsx 中添加 ExecutionMonitor**

```typescript
import { ExecutionMonitor } from './components/ExecutionMonitor';

// 在主布局中添加（在路由外部）
<ExecutionProvider>
  <Routes>
    {/* 路由配置 */}
  </Routes>
  <ExecutionMonitor />
</ExecutionProvider>
```

**步骤 3: 测试监控组件**

1. 启动一个 Agent 测试
2. 右下角应该出现蓝色圆形按钮，显示数字 1
3. 点击按钮展开，显示运行中的任务
4. 点击任务应该跳转到对应页面

**步骤 4: 提交更改**

```bash
git add frontend/src/app/components/ExecutionMonitor.tsx frontend/src/app/App.tsx
git commit -m "feat(frontend): 实现右下角执行监控组件

- 显示运行中任务数量徽章
- 支持展开/折叠
- 点击跳转到任务详情
- 流畅的动画效果

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### 任务 8: 前端 Dashboard 集成

**文件**:
- Modify: `frontend/src/app/pages/Dashboard.tsx` (更新 Execution History 卡片)

**步骤 1: 更新 Dashboard 的 Execution History 卡片**

在 `Dashboard.tsx` 中，找到 Execution History 部分并替换为：

```typescript
import { useExecutionContext } from '../contexts/ExecutionContext';

// 在组件内部
const { executions, isConnected } = useExecutionContext();
const [allExecutions, setAllExecutions] = useState<Execution[]>([]);

// 合并 WebSocket 实时数据和历史数据
useEffect(() => {
  const wsExecutions = Array.from(executions.values());
  // 合并并去重
  const merged = [...wsExecutions, ...allExecutions]
    .reduce((acc, curr) => {
      if (!acc.find(e => e.id === curr.id)) {
        acc.push(curr);
      }
      return acc;
    }, [] as Execution[])
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 10);

  setAllExecutions(merged);
}, [executions]);

// 渲染部分
<GlassCard className="lg:col-span-2">
  <div className="flex justify-between items-center mb-6">
    <div className="flex items-center gap-3">
      <h2 className="text-xl font-bold">Execution History</h2>
      {!isConnected && (
        <span className="text-xs text-yellow-500 bg-yellow-500/10 px-2 py-1 rounded-full">
          离线模式
        </span>
      )}
    </div>
    <button
      onClick={() => navigate('/executions')}
      className="text-sm text-blue-400 hover:underline"
    >
      查看全部
    </button>
  </div>

  <div className="space-y-4">
    {loadingExecutions ? (
      <>
        <SkeletonListItem />
        <SkeletonListItem />
        <SkeletonListItem />
      </>
    ) : allExecutions.length > 0 ? (
      allExecutions.map((execution) => {
        const isRunning = execution.status === 'running';
        const isSuccess = execution.status === 'succeeded';
        const isFailed = execution.status === 'failed';

        return (
          <div
            key={execution.id}
            className={`flex items-center justify-between p-4 rounded-xl transition-all ${
              isRunning
                ? 'bg-blue-500/10 border-2 border-blue-500/50 animate-pulse-glow'
                : 'bg-white/5 hover:bg-white/10 border border-white/10'
            }`}
          >
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-10 h-10 rounded-lg overflow-hidden border border-white/10 bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                  {execution.execution_type === 'agent_test' ? (
                    <Cpu className="w-6 h-6 text-white" />
                  ) : (
                    <MapIcon className="w-6 h-6 text-white" />
                  )}
                </div>
                <div
                  className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-[#1a1b26] ${
                    isRunning
                      ? 'bg-blue-500 animate-pulse'
                      : isSuccess
                      ? 'bg-green-500'
                      : isFailed
                      ? 'bg-red-500'
                      : 'bg-gray-500'
                  }`}
                />
              </div>
              <div>
                <p className="font-medium text-sm">
                  {execution.execution_type === 'agent_test'
                    ? `Agent 测试 #${execution.agent_id}`
                    : `Workflow #${execution.workflow_id}`}
                </p>
                <p className="text-[10px] text-gray-500 uppercase font-bold">
                  执行 #{execution.id} •{' '}
                  {new Date(execution.created_at).toLocaleString()}
                </p>
              </div>
            </div>
            <ActionButton
              variant="secondary"
              className="py-1 px-3 text-xs"
              onClick={() => navigate(`/executions/${execution.id}`)}
            >
              详情
            </ActionButton>
          </div>
        );
      })
    ) : (
      <div className="text-center py-8 text-gray-500">
        <p>暂无执行历史</p>
      </div>
    )}
  </div>
</GlassCard>
```

**步骤 2: 添加脉动发光动画样式**

在 `frontend/src/styles/globals.css` 或相应的样式文件中添加：

```css
@keyframes pulse-glow {
  0%, 100% {
    box-shadow: 0 0 10px rgba(59, 130, 246, 0.3);
  }
  50% {
    box-shadow: 0 0 20px rgba(59, 130, 246, 0.6);
  }
}

.animate-pulse-glow {
  animation: pulse-glow 2s ease-in-out infinite;
}
```

**步骤 3: 测试 Dashboard 集成**

1. 打开 Dashboard
2. 启动一个 Agent 测试
3. 应该立即在 Execution History 中看到运行中的记录（蓝色发光边框）
4. 执行完成后，边框变为绿色（成功）或红色（失败）

**步骤 4: 提交更改**

```bash
git add frontend/src/app/pages/Dashboard.tsx frontend/src/styles/
git commit -m "feat(frontend): Dashboard 集成实时执行历史

- 显示混合的执行历史（Agent 测试 + Workflow）
- 运行中的记录高亮显示（蓝色发光边框）
- 实时状态更新
- 离线模式提示

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### 任务 9: 前端 Agent Test 页面集成

**文件**:
- Modify: `frontend/src/app/components/AgentTestPanel.tsx`
- Modify: `frontend/src/lib/api/services/agents.ts` (添加 test API)

**步骤 1: 在 agents.ts 中添加 test API**

```typescript
// frontend/src/lib/api/services/agents.ts
export const agentsApi = {
  // ... 现有方法 ...

  async test(agentId: number, testInput: string) {
    const response = await apiClient.post(`/agents/${agentId}/test`, {
      test_input: testInput
    });
    return response.data;
  },
};
```

**步骤 2: 更新 AgentTestPanel 的 handleTest 方法**

在 `AgentTestPanel.tsx` 中，替换 `handleTest` 函数：

```typescript
import { toast } from 'sonner';

const handleTest = async () => {
  if (!input.trim() || isRunning) return;

  setIsRunning(true);

  try {
    // 调用后端 API 启动测试
    const response = await agentsApi.test(agent.id, input);

    // 显示成功提示
    toast.success('测试已启动', {
      description: '请在右下角查看执行进度，或在 Dashboard 查看历史记录',
    });

    // 清空输入
    setInput('');

  } catch (error) {
    console.error('Test failed:', error);
    toast.error('启动测试失败', {
      description: error instanceof Error ? error.message : '请检查后端服务',
    });
  } finally {
    setIsRunning(false);
  }
};
```

**步骤 3: 测试 Agent Test 页面**

1. 打开 Agent Test 页面
2. 输入测试内容并点击"运行"
3. 应该看到"测试已启动"提示
4. 右下角出现监控徽章
5. Dashboard 显示运行中的记录

**步骤 4: 提交更改**

```bash
git add frontend/src/app/components/AgentTestPanel.tsx frontend/src/lib/api/services/agents.ts
git commit -m "feat(frontend): Agent Test 页面集成后台执行

- 调用后台 API 启动测试
- 显示启动成功提示
- 用户可以离开页面，执行继续进行

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### 任务 10: 集成测试

**文件**:
- Create: `backend/tests/integration/test_execution_flow.py`

**步骤 1: 编写集成测试**

```python
# backend/tests/integration/test_execution_flow.py
import pytest
import asyncio
from fastapi.testclient import TestClient
from app.main import app

@pytest.mark.asyncio
async def test_full_execution_flow():
    """测试完整的执行流程"""
    client = TestClient(app)

    # 1. 启动 Agent 测试
    response = client.post("/agents/1/test", json={
        "test_input": "测试输入"
    })
    assert response.status_code == 200
    data = response.json()
    execution_id = data["execution_id"]

    # 2. 等待执行完成（最多 30 秒）
    for _ in range(30):
        response = client.get(f"/executions/{execution_id}")
        if response.status_code == 200:
            execution = response.json()
            if execution["status"] in ["succeeded", "failed"]:
                break
        await asyncio.sleep(1)

    # 3. 验证执行结果
    assert execution["status"] in ["succeeded", "failed"]
    assert execution["execution_type"] == "agent_test"
```

**步骤 2: 运行集成测试**

```bash
pytest backend/tests/integration/test_execution_flow.py -v
```

**步骤 3: 提交更改**

```bash
git add backend/tests/integration/test_execution_flow.py
git commit -m "test: 添加执行流程集成测试

- 测试完整的 Agent 测试执行流程
- 验证状态更新和结果

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### 任务 11: 文档更新

**文件**:
- Modify: `README.md` (添加功能说明)
- Modify: `CLAUDE.md` (更新文档索引)

**步骤 1: 更新 README.md**

在 README.md 的功能列表中添加：

```markdown
### 实时执行监控

- **统一执行历史**：Agent 测试和 Workflow 执行统一展示
- **WebSocket 实时更新**：执行状态变化实时推送
- **后台执行支持**：用户可以离开页面，执行继续进行
- **可视化监控**：Dashboard 高亮显示运行中的任务，右下角实时监控
```

**步骤 2: 更新 CLAUDE.md 文档索引**

在 CLAUDE.md 的文档索引表格中添加：

```markdown
| 2026-02-26 | 01 | Dashboard Execution History 实时更新设计文档 | docs/plans/2026-02-26-execution-history-realtime-design.md | 已发布 |
| 2026-02-26 | 02 | Dashboard Execution History 实施计划 | docs/plans/2026-02-26-execution-history-implementation.md | 已发布 |
```

**步骤 3: 提交更改**

```bash
git add README.md CLAUDE.md
git commit -m "docs: 更新文档说明实时执行监控功能

- 添加功能说明到 README
- 更新 CLAUDE.md 文档索引

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## 实施完成检查清单

完成所有任务后，进行以下验证：

### 后端验证
- [ ] 数据库迁移成功执行
- [ ] WebSocket 端点可以连接
- [ ] Agent 测试 API 返回正确响应
- [ ] 后台任务正常执行
- [ ] 状态更新通过 WebSocket 广播

### 前端验证
- [ ] WebSocket 自动连接成功
- [ ] Dashboard 显示实时执行历史
- [ ] 运行中的记录有发光效果
- [ ] 右下角监控正常显示
- [ ] Agent Test 页面可以启动测试
- [ ] 离开页面后执行继续进行

### 集成验证
- [ ] 完整流程端到端测试通过
- [ ] WebSocket 断线自动重连
- [ ] 多个执行同时运行互不干扰
- [ ] 通知系统正常工作

---

## 执行选项

计划已完成并保存到 `docs/plans/2026-02-26-execution-history-implementation.md`。

**两种执行方式：**

**1. Subagent-Driven（当前会话）**
- 我在当前会话中为每个任务派发新的子代理
- 每个任务完成后进行代码审查
- 快速迭代，实时反馈

**2. Parallel Session（独立会话）**
- 在新会话中使用 executing-plans 技能
- 批量执行，设置检查点
- 适合长时间运行的任务

**您选择哪种方式？**

