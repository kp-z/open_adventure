# Task 页面重构为 Execution 页面实现计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将 Task 页面重构为 Execution 页面，统一展示 Workflow、Agent Test、AgentTeam 的执行历史记录

**Architecture:** 保持最小改动原则，不修改数据库 schema（task_id 保持必填），扩展后端 API 支持 execution_type 过滤，前端页面重命名并添加类型筛选器

**Tech Stack:** Python + FastAPI + SQLAlchemy (后端), TypeScript + React + TanStack Query (前端)

---

## Task 1: 添加 AGENT_TEAM 执行类型枚举

**Files:**
- Modify: `backend/app/models/task.py:31-35`

**Step 1: 添加 AGENT_TEAM 枚举值**

在 `ExecutionType` 枚举中添加 `AGENT_TEAM` 类型：

```python
class ExecutionType(str, enum.Enum):
    """执行类型"""
    WORKFLOW = "workflow"
    AGENT_TEST = "agent_test"
    AGENT_TEAM = "agent_team"  # 新增
```

**Step 2: 验证枚举值**

Run: `python -c "from backend.app.models.task import ExecutionType; print(list(ExecutionType))"`
Expected: 输出包含三个枚举值：`['workflow', 'agent_test', 'agent_team']`

**Step 3: Commit**

```bash
git add backend/app/models/task.py
git commit -m "feat: add AGENT_TEAM execution type enum

- Add AGENT_TEAM to ExecutionType enum for future agent team execution tracking
- Maintains backward compatibility with existing WORKFLOW and AGENT_TEST types

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: 扩展 Execution Schema 支持 execution_type

**Files:**
- Modify: `backend/app/schemas/executions.py:27-39`

**Step 1: 导入 ExecutionType 枚举**

在文件顶部添加导入：

```python
from app.models.task import ExecutionStatus, ExecutionType
```

**Step 2: 在 ExecutionResponse 中添加字段**

```python
class ExecutionResponse(BaseModel):
    """执行响应"""
    id: int
    task_id: int
    workflow_id: int
    status: ExecutionStatus
    execution_type: ExecutionType  # 新增
    agent_id: Optional[int] = None  # 新增
    test_input: Optional[str] = None  # 新增
    test_output: Optional[str] = None  # 新增
    started_at: Optional[datetime] = None  # 修改为 Optional
    finished_at: Optional[datetime] = None
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
```

**Step 3: 验证 Schema**

Run: `python -c "from backend.app.schemas.executions import ExecutionResponse; print(ExecutionResponse.model_fields.keys())"`
Expected: 输出包含 `execution_type`, `agent_id`, `test_input`, `test_output` 字段

**Step 4: Commit**

```bash
git add backend/app/schemas/executions.py
git commit -m "feat: add execution_type and agent fields to ExecutionResponse

- Add execution_type field to distinguish workflow/agent_test/agent_team executions
- Add agent_id, test_input, test_output fields for agent test support
- Make started_at optional to match database model

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: 扩展 ExecutionRepository 支持类型过滤和统计

**Files:**
- Modify: `backend/app/repositories/executions_repo.py`

**Step 1: 添加按类型统计方法**

在 `ExecutionRepository` 类中添加新方法：

```python
async def count_by_type(self) -> Dict[str, int]:
    """
    统计各类型的执行数量

    Returns:
        Dict[str, int]: {"workflow": 10, "agent_test": 5, "agent_team": 0}
    """
    from app.models.task import ExecutionType

    result = {}
    for exec_type in ExecutionType:
        count_result = await self.db.execute(
            select(func.count())
            .select_from(Execution)
            .where(Execution.execution_type == exec_type)
        )
        result[exec_type.value] = count_result.scalar_one()

    return result
```

**Step 2: 验证方法存在**

Run: `python -c "from backend.app.repositories.executions_repo import ExecutionRepository; print(hasattr(ExecutionRepository, 'count_by_type'))"`
Expected: `True`

**Step 3: Commit**

```bash
git add backend/app/repositories/executions_repo.py
git commit -m "feat: add count_by_type method to ExecutionRepository

- Add method to count executions by type (workflow/agent_test/agent_team)
- Returns dictionary with counts for each execution type
- Supports execution history statistics

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: 扩展 Executions API 支持类型过滤

**Files:**
- Modify: `backend/app/api/routers/executions.py:91-127`

**Step 1: 添加 execution_type 过滤参数**

修改 `list_executions` 函数签名：

```python
@router.get("/", response_model=ExecutionListResponse)
async def list_executions(
    skip: int = 0,
    limit: int = 20,
    task_id: int | None = None,
    workflow_id: int | None = None,
    execution_type: ExecutionType | None = None,  # 新增
    db: AsyncSession = Depends(get_db)
):
    """
    获取执行列表

    Args:
        skip: 跳过记录数
        limit: 返回记录数
        task_id: 按任务 ID 过滤
        workflow_id: 按工作流 ID 过滤
        execution_type: 按执行类型过滤 (workflow/agent_test/agent_team)

    Returns:
        ExecutionListResponse: 执行列表
    """
    repo = ExecutionRepository(db)

    filters = {}
    if task_id is not None:
        filters["task_id"] = task_id
    if workflow_id is not None:
        filters["workflow_id"] = workflow_id
    if execution_type is not None:
        filters["execution_type"] = execution_type  # 新增

    executions = await repo.list(skip=skip, limit=limit, filters=filters)
    total = await repo.count(filters=filters)

    return ExecutionListResponse(
        items=[ExecutionResponse.model_validate(e) for e in executions],
        total=total,
        skip=skip,
        limit=limit
    )
```

**Step 2: 添加类型统计端点**

在文件末尾添加新端点：

```python
@router.get("/stats/by-type")
async def get_execution_stats_by_type(
    db: AsyncSession = Depends(get_db)
):
    """
    获取各类型执行数量统计

    Returns:
        Dict: {"workflow": 10, "agent_test": 5, "agent_team": 0}
    """
    repo = ExecutionRepository(db)
    return await repo.count_by_type()
```

**Step 3: 导入 ExecutionType**

在文件顶部添加导入：

```python
from app.models.task import ExecutionType
```

**Step 4: 测试 API（手动）**

启动后端服务后，访问：
- `http://localhost:8000/api/executions/?execution_type=workflow`
- `http://localhost:8000/api/executions/stats/by-type`

Expected: 返回正确的过滤结果和统计数据

**Step 5: Commit**

```bash
git add backend/app/api/routers/executions.py
git commit -m "feat: add execution_type filter and stats endpoint

- Add execution_type query parameter to list_executions endpoint
- Add /stats/by-type endpoint for execution type statistics
- Support filtering by workflow/agent_test/agent_team types

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: 更新前端 API 类型定义

**Files:**
- Modify: `frontend/src/lib/api/types.ts:429-451`

**Step 1: 添加 ExecutionType 类型**

在 Execution 相关类型定义之前添加：

```typescript
// ============ Execution 相关类型 ============
export type ExecutionType = 'workflow' | 'agent_test' | 'agent_team';

export type ExecutionStatus = 'pending' | 'running' | 'succeeded' | 'failed' | 'cancelled';
```

**Step 2: 更新 Execution 接口**

```typescript
export interface Execution {
  id: number;
  task_id: number;
  workflow_id: number;
  status: ExecutionStatus;
  execution_type: ExecutionType;  // 新增
  agent_id?: number;  // 新增
  test_input?: string;  // 新增
  test_output?: string;  // 新增
  started_at?: string;  // 修改为可选
  finished_at?: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
  task?: Task;
}
```

**Step 3: 添加统计响应类型**

```typescript
export interface ExecutionStatsByType {
  workflow: number;
  agent_test: number;
  agent_team: number;
}
```

**Step 4: 验证类型定义**

Run: `cd frontend && npm run type-check`
Expected: 无类型错误

**Step 5: Commit**

```bash
git add frontend/src/lib/api/types.ts
git commit -m "feat: add execution_type and agent fields to frontend types

- Add ExecutionType and ExecutionStatus type aliases
- Add execution_type, agent_id, test_input, test_output to Execution interface
- Add ExecutionStatsByType interface for statistics
- Make started_at optional to match backend

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: 更新前端 Executions API 服务

**Files:**
- Modify: `frontend/src/lib/api/services/executions.ts`

**Step 1: 更新 list 方法参数**

```typescript
/**
 * Executions API 服务
 */

import { apiClient } from '../client';
import type { Execution, ExecutionListResponse, ExecutionType, ExecutionStatsByType } from '../types';

export const executionsApi = {
  /**
   * 获取执行历史列表
   */
  list: (params?: {
    skip?: number;
    limit?: number;
    task_id?: number;
    workflow_id?: number;
    execution_type?: ExecutionType;  // 新增
  }) =>
    apiClient.get<ExecutionListResponse>('/executions/', { params }),

  /**
   * 获取单个执行详情
   */
  get: (id: number) =>
    apiClient.get<Execution>(`/executions/${id}`),

  /**
   * 获取各类型执行数量统计
   */
  getStatsByType: () =>
    apiClient.get<ExecutionStatsByType>('/executions/stats/by-type'),  // 新增

  /**
   * 删除执行记录
   */
  delete: (id: number) =>
    apiClient.delete<void>(`/executions/${id}`),
};
```

**Step 2: 验证类型定义**

Run: `cd frontend && npm run type-check`
Expected: 无类型错误

**Step 3: Commit**

```bash
git add frontend/src/lib/api/services/executions.ts
git commit -m "feat: add execution_type filter and stats API

- Add execution_type parameter to list method
- Add getStatsByType method for execution statistics
- Update TypeScript types for better type safety

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: 重命名前端页面文件

**Files:**
- Rename: `frontend/src/app/pages/Tasks.tsx` → `frontend/src/app/pages/Executions.tsx`

**Step 1: 重命名文件**

```bash
cd frontend/src/app/pages
mv Tasks.tsx Executions.tsx
```

**Step 2: 更新组件名称**

在 `Executions.tsx` 中，将组件名从 `Tasks` 改为 `Executions`：

```typescript
const Executions = () => {
  // ... 组件代码
};

export default Executions;
```

**Step 3: 验证文件重命名**

Run: `ls -la frontend/src/app/pages/ | grep -E "(Tasks|Executions)"`
Expected: 只看到 `Executions.tsx`，没有 `Tasks.tsx`

**Step 4: Commit**

```bash
git add frontend/src/app/pages/Tasks.tsx frontend/src/app/pages/Executions.tsx
git commit -m "refactor: rename Tasks page to Executions

- Rename Tasks.tsx to Executions.tsx
- Update component name from Tasks to Executions
- Prepare for unified execution history display

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: 更新前端路由配置

**Files:**
- Modify: `frontend/src/app/routes.tsx`

**Step 1: 更新导入语句**

```typescript
import Executions from './pages/Executions';  // 改名
```

**Step 2: 更新路由配置**

```typescript
{
  path: 'executions',  // 改名
  Component: Executions,  // 改名
}
```

**Step 3: 验证路由配置**

Run: `cd frontend && npm run type-check`
Expected: 无类型错误

**Step 4: Commit**

```bash
git add frontend/src/app/routes.tsx
git commit -m "refactor: update route from /tasks to /executions

- Change route path from 'tasks' to 'executions'
- Update component import to use Executions
- Align route with new unified execution history page

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 9: 重构 Executions 页面 - 添加类型筛选器

**Files:**
- Modify: `frontend/src/app/pages/Executions.tsx`

**Step 1: 更新页面标题和描述**

将页面标题从 "EXECUTION TASKS" 改为 "EXECUTION HISTORY"：

```typescript
<h1 className="text-2xl md:text-3xl font-bold tracking-tight uppercase">EXECUTION HISTORY</h1>
<p className="text-sm md:text-base text-gray-400">
  查看所有执行历史记录（Workflow、Agent、AgentTeam）
</p>
```

**Step 2: 添加类型筛选状态**

在组件顶部添加状态：

```typescript
const [selectedType, setSelectedType] = useState<ExecutionType | 'all'>('all');
```

**Step 3: 更新 API 调用**

修改 `fetchTasks` 函数（重命名为 `fetchExecutions`）：

```typescript
const fetchExecutions = async () => {
  try {
    setLoading(true);
    setError(null);
    const params: any = { limit: 50 };
    if (selectedType !== 'all') {
      params.execution_type = selectedType;
    }
    const response = await executionsApi.list(params);
    setTasks(response.items);  // 后续会重命名为 setExecutions
  } catch (err) {
    console.error('Failed to fetch executions:', err);
    setError(err instanceof Error ? err.message : 'Failed to load executions');
  } finally {
    setLoading(false);
  }
};
```

**Step 4: 添加类型筛选按钮**

在搜索框下方添加类型筛选器：

```typescript
{/* 类型筛选器 */}
<div className="flex gap-2 flex-wrap">
  {(['all', 'workflow', 'agent_test', 'agent_team'] as const).map((type) => (
    <button
      key={type}
      onClick={() => setSelectedType(type)}
      className={`
        px-4 py-2 rounded-xl text-sm font-bold transition-all
        ${selectedType === type
          ? 'bg-blue-500/20 border-2 border-blue-500/50 text-blue-400'
          : 'bg-white/5 border border-white/10 text-gray-400 hover:text-white'
        }
      `}
    >
      {type === 'all' ? 'All' :
       type === 'workflow' ? 'Workflow' :
       type === 'agent_test' ? 'Agent' :
       'AgentTeam'}
    </button>
  ))}
</div>
```

**Step 5: 添加类型标签显示**

在表格的每一行添加类型标签：

```typescript
<td className="px-6 py-4">
  <span className={`
    px-2 py-1 rounded text-xs font-bold
    ${execution.execution_type === 'workflow' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
      execution.execution_type === 'agent_test' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
      'bg-purple-500/20 text-purple-400 border border-purple-500/30'}
  `}>
    {execution.execution_type === 'workflow' ? 'Workflow' :
     execution.execution_type === 'agent_test' ? 'Agent' :
     'AgentTeam'}
  </span>
</td>
```

**Step 6: 更新 useEffect 依赖**

```typescript
useEffect(() => {
  fetchExecutions();
}, [selectedType]);  // 添加 selectedType 依赖
```

**Step 7: 验证编译**

Run: `cd frontend && npm run build`
Expected: 编译成功，无错误

**Step 8: Commit**

```bash
git add frontend/src/app/pages/Executions.tsx
git commit -m "feat: add execution type filter to Executions page

- Add type filter buttons (All/Workflow/Agent/AgentTeam)
- Add type badges to execution list
- Update page title to 'EXECUTION HISTORY'
- Filter executions by type when button clicked
- Update API call to include execution_type parameter

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 10: 更新导航菜单

**Files:**
- Modify: `frontend/src/app/components/layout.tsx`

**Step 1: 查找导航菜单配置**

Run: `grep -n "tasks" frontend/src/app/components/layout.tsx`
Expected: 找到导航菜单中的 tasks 配置

**Step 2: 更新菜单项**

将 "Tasks" 菜单项改为 "Executions"：

```typescript
{
  name: 'Executions',  // 改名
  path: '/executions',  // 改路径
  icon: History,  // 可以保持或更换图标
}
```

**Step 3: 验证编译**

Run: `cd frontend && npm run build`
Expected: 编译成功

**Step 4: Commit**

```bash
git add frontend/src/app/components/layout.tsx
git commit -m "refactor: update navigation menu from Tasks to Executions

- Change menu item from 'Tasks' to 'Executions'
- Update path from '/tasks' to '/executions'
- Align navigation with unified execution history page

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 11: 测试和验证

**Files:**
- Test: 所有修改的文件

**Step 1: 启动后端服务**

```bash
cd backend
python -m uvicorn app.main:app --reload
```

Expected: 后端服务启动成功，监听 8000 端口

**Step 2: 启动前端服务**

```bash
cd frontend
npm run dev
```

Expected: 前端服务启动成功，监听 5173 端口

**Step 3: 测试 Executions 页面**

访问 `http://localhost:5173/executions`，验证：
- [ ] 页面标题显示 "EXECUTION HISTORY"
- [ ] 类型筛选按钮显示正确（All/Workflow/Agent/AgentTeam）
- [ ] 点击筛选按钮可以过滤执行记录
- [ ] 执行记录显示类型标签（Workflow/Agent/AgentTeam）
- [ ] 搜索功能正常工作

**Step 4: 测试 API 端点**

使用浏览器或 curl 测试：
```bash
curl http://localhost:8000/api/executions/?execution_type=workflow
curl http://localhost:8000/api/executions/stats/by-type
```

Expected: 返回正确的 JSON 数据

**Step 5: 测试导航菜单**

- [ ] 侧边栏显示 "Executions" 菜单项
- [ ] 点击菜单项跳转到 `/executions` 路由
- [ ] 页面正确加载

**Step 6: 验证 Agent 页面未受影响**

访问 `http://localhost:5173/agents`，验证：
- [ ] Agent 页面正常显示
- [ ] Agent 测试功能正常工作
- [ ] 没有任何功能受到影响

**Step 7: 记录测试结果**

如果所有测试通过，创建最终提交：

```bash
git add -A
git commit -m "test: verify Task to Execution refactor

- Verified Executions page displays correctly
- Verified type filtering works (All/Workflow/Agent/AgentTeam)
- Verified type badges display correctly
- Verified navigation menu updated
- Verified Agent page unaffected
- All tests passing

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## 完成检查清单

实现完成后，确认以下所有项目：

- [ ] `ExecutionType` 枚举包含 `AGENT_TEAM`
- [ ] `ExecutionResponse` schema 包含 `execution_type` 和 agent 相关字段
- [ ] `ExecutionRepository` 有 `count_by_type` 方法
- [ ] `/api/executions/` 端点支持 `execution_type` 过滤
- [ ] `/api/executions/stats/by-type` 端点返回统计数据
- [ ] 前端类型定义包含 `ExecutionType` 和相关字段
- [ ] `executionsApi` 服务支持类型过滤和统计
- [ ] `Tasks.tsx` 重命名为 `Executions.tsx`
- [ ] 路由从 `/tasks` 改为 `/executions`
- [ ] Executions 页面有类型筛选器
- [ ] Executions 页面显示类型标签
- [ ] 导航菜单更新为 "Executions"
- [ ] Agent 页面功能完全不受影响
- [ ] 所有测试通过

---

## 注意事项

1. **不修改 Agent 页面**：整个重构过程中，`frontend/src/app/pages/Agents.tsx` 和 `AgentTestPanel` 组件保持完全不变
2. **保持向后兼容**：现有的 Workflow 执行功能不受影响
3. **数据库不变**：不需要数据库迁移，`task_id` 保持必填
4. **Agent 测试继续创建临时 Task**：`AgentTestService` 的逻辑保持不变
5. **频繁提交**：每完成一个 Task 就提交一次，便于回滚和审查

---

## 后续扩展

完成此重构后，未来可以轻松添加：
- AgentTeam 执行记录（已预留 `AGENT_TEAM` 类型）
- 更详细的执行详情页面
- 执行记录的导出功能
- 执行记录的搜索和高级过滤
