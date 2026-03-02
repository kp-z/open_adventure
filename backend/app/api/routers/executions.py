"""
执行相关 API 路由
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_claude_adapter
from app.services.execution_engine import ExecutionEngine, WorkflowValidationError
from app.repositories.executions_repo import ExecutionRepository
from app.models.task import ExecutionType
from app.schemas.executions import (
    ExecutionResponse,
    NodeExecutionResponse,
    ExecutionListResponse
)

router = APIRouter(prefix="/executions", tags=["executions"])


@router.post("/{task_id}/start", response_model=ExecutionResponse)
async def start_execution(
    task_id: int,
    db: AsyncSession = Depends(get_db),
    adapter = Depends(get_claude_adapter)
):
    """
    启动任务执行

    Args:
        task_id: 任务 ID

    Returns:
        ExecutionResponse: 执行记录
    """
    engine = ExecutionEngine(db, adapter)

    try:
        execution = await engine.execute_task(task_id)
        return ExecutionResponse.model_validate(execution)
    except WorkflowValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Execution failed: {str(e)}")


@router.get("/{execution_id}", response_model=ExecutionResponse)
async def get_execution(
    execution_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    获取执行详情

    Args:
        execution_id: 执行 ID

    Returns:
        ExecutionResponse: 执行记录
    """
    repo = ExecutionRepository(db)
    execution = await repo.get(execution_id)

    if not execution:
        raise HTTPException(status_code=404, detail="Execution not found")

    return ExecutionResponse.model_validate(execution)


@router.get("/{execution_id}/nodes", response_model=List[NodeExecutionResponse])
async def get_execution_nodes(
    execution_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    获取执行的所有节点记录

    Args:
        execution_id: 执行 ID

    Returns:
        List[NodeExecutionResponse]: 节点执行记录列表
    """
    repo = ExecutionRepository(db)
    nodes = await repo.get_node_executions(execution_id)

    return [NodeExecutionResponse.model_validate(node) for node in nodes]


@router.get("/", response_model=ExecutionListResponse)
async def list_executions(
    skip: int = 0,
    limit: int = 20,
    task_id: int | None = None,
    workflow_id: int | None = None,
    execution_type: ExecutionType | None = None,
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
        filters["execution_type"] = execution_type

    executions = await repo.list(skip=skip, limit=limit, filters=filters)
    total = await repo.count(filters=filters)

    return ExecutionListResponse(
        items=[ExecutionResponse.model_validate(e) for e in executions],
        total=total,
        skip=skip,
        limit=limit
    )


@router.post("/workflows/{workflow_id}/validate")
async def validate_workflow(
    workflow_id: int,
    db: AsyncSession = Depends(get_db),
    adapter = Depends(get_claude_adapter)
):
    """
    验证工作流

    Args:
        workflow_id: 工作流 ID

    Returns:
        Dict: 验证结果
    """
    engine = ExecutionEngine(db, adapter)

    try:
        result = await engine.validate_workflow(workflow_id)
        return result
    except WorkflowValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Validation failed: {str(e)}")


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


@router.get("/session/{session_id}", response_model=ExecutionResponse)
async def get_execution_by_session(
    session_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    根据 session_id 获取执行记录（用于页面恢复）

    Args:
        session_id: Terminal session ID

    Returns:
        ExecutionResponse: 执行记录
    """
    repo = ExecutionRepository(db)
    execution = await repo.get_by_session_id(session_id)

    if not execution:
        raise HTTPException(status_code=404, detail="Execution not found for this session")

    return ExecutionResponse.model_validate(execution)


@router.get("/active-sessions", response_model=List[ExecutionResponse])
async def get_active_sessions(
    db: AsyncSession = Depends(get_db)
):
    """
    获取所有活跃的 session 执行记录

    Returns:
        List[ExecutionResponse]: 活跃的执行记录列表
    """
    repo = ExecutionRepository(db)
    executions = await repo.get_active_sessions()

    return [ExecutionResponse.model_validate(e) for e in executions]
