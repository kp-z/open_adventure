"""
测试模块 API 路由
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from typing import List, Optional

from app.core.database import get_db
from app.testing.models import TestNode, TestExecution
from app.testing.test_tree import TestTreeManager
from app.testing.test_runner import TestRunner

router = APIRouter(prefix="/api/testing", tags=["testing"])


@router.get("/tree")
async def get_test_tree(db: AsyncSession = Depends(get_db)):
    """获取测试树"""
    manager = TestTreeManager()
    tree = await manager.get_tree(db)
    return {"tree": tree}


@router.post("/tree/reload")
async def reload_test_tree(db: AsyncSession = Depends(get_db)):
    """重新加载测试树（从 YAML 配置）"""
    manager = TestTreeManager()
    await manager.load_tree(db)
    tree = await manager.get_tree(db)
    return {"message": "测试树已重新加载", "tree": tree}


@router.get("/nodes/{node_id}")
async def get_test_node(node_id: str, db: AsyncSession = Depends(get_db)):
    """获取单个测试节点详情"""
    manager = TestTreeManager()
    node = await manager.get_node(node_id, db)

    if not node:
        raise HTTPException(status_code=404, detail="测试节点不存在")

    # 获取最近的执行记录
    result = await db.execute(
        select(TestExecution)
        .where(TestExecution.test_node_id == node_id)
        .order_by(desc(TestExecution.started_at))
        .limit(10)
    )
    executions = list(result.scalars().all())

    return {
        "id": node.id,
        "name": node.name,
        "type": node.type,
        "test_file": node.test_file,
        "test_command": node.test_command,
        "enabled": node.enabled,
        "recent_executions": [
            {
                "id": ex.id,
                "status": ex.status,
                "started_at": ex.started_at.isoformat() if ex.started_at else None,
                "duration": ex.duration,
                "passed": ex.passed_tests,
                "failed": ex.failed_tests,
                "total": ex.total_tests
            }
            for ex in executions
        ]
    }


@router.post("/run/{node_id}")
async def run_test(node_id: str, db: AsyncSession = Depends(get_db)):
    """执行测试"""
    runner = TestRunner()

    try:
        execution = await runner.run_test_node(node_id, db)

        return {
            "id": execution.id,
            "node_id": execution.test_node_id,
            "status": execution.status,
            "started_at": execution.started_at.isoformat() if execution.started_at else None,
            "completed_at": execution.completed_at.isoformat() if execution.completed_at else None,
            "duration": execution.duration,
            "total": execution.total_tests,
            "passed": execution.passed_tests,
            "failed": execution.failed_tests,
            "skipped": execution.skipped_tests,
            "output": execution.output,
            "error_message": execution.error_message
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"测试执行失败: {str(e)}")


@router.get("/executions")
async def get_executions(
    node_id: Optional[str] = None,
    limit: int = 50,
    db: AsyncSession = Depends(get_db)
):
    """获取测试执行历史"""
    query = select(TestExecution).order_by(desc(TestExecution.started_at))

    if node_id:
        query = query.where(TestExecution.test_node_id == node_id)

    query = query.limit(limit)

    result = await db.execute(query)
    executions = list(result.scalars().all())

    return {
        "executions": [
            {
                "id": ex.id,
                "node_id": ex.test_node_id,
                "status": ex.status,
                "started_at": ex.started_at.isoformat() if ex.started_at else None,
                "completed_at": ex.completed_at.isoformat() if ex.completed_at else None,
                "duration": ex.duration,
                "total": ex.total_tests,
                "passed": ex.passed_tests,
                "failed": ex.failed_tests,
                "skipped": ex.skipped_tests
            }
            for ex in executions
        ]
    }


@router.get("/executions/{execution_id}")
async def get_execution_detail(execution_id: int, db: AsyncSession = Depends(get_db)):
    """获取测试执行详情"""
    result = await db.execute(
        select(TestExecution).where(TestExecution.id == execution_id)
    )
    execution = result.scalar_one_or_none()

    if not execution:
        raise HTTPException(status_code=404, detail="执行记录不存在")

    return {
        "id": execution.id,
        "node_id": execution.test_node_id,
        "status": execution.status,
        "started_at": execution.started_at.isoformat() if execution.started_at else None,
        "completed_at": execution.completed_at.isoformat() if execution.completed_at else None,
        "duration": execution.duration,
        "total": execution.total_tests,
        "passed": execution.passed_tests,
        "failed": execution.failed_tests,
        "skipped": execution.skipped_tests,
        "output": execution.output,
        "error_message": execution.error_message
    }


@router.get("/coverage")
async def get_coverage(db: AsyncSession = Depends(get_db)):
    """获取测试覆盖率统计"""
    # 获取所有测试套件节点
    result = await db.execute(
        select(TestNode).where(TestNode.type == "test_suite")
    )
    test_suites = list(result.scalars().all())

    total_suites = len(test_suites)
    enabled_suites = sum(1 for suite in test_suites if suite.enabled)

    # 获取最近的执行统计
    result = await db.execute(
        select(TestExecution).order_by(desc(TestExecution.started_at)).limit(100)
    )
    recent_executions = list(result.scalars().all())

    total_tests = sum(ex.total_tests for ex in recent_executions)
    passed_tests = sum(ex.passed_tests for ex in recent_executions)
    failed_tests = sum(ex.failed_tests for ex in recent_executions)

    pass_rate = (passed_tests / total_tests * 100) if total_tests > 0 else 0

    return {
        "total_suites": total_suites,
        "enabled_suites": enabled_suites,
        "total_tests": total_tests,
        "passed_tests": passed_tests,
        "failed_tests": failed_tests,
        "pass_rate": round(pass_rate, 2)
    }
