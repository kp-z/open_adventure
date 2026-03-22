"""
Agent Runtime Service
管理 Agent 后台运行的核心服务
"""
import asyncio
import json
import os
import psutil
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.agent import Agent
from app.models.task import Task, TaskStatus, Execution, ExecutionStatus, ExecutionType
from app.core.logging import get_logger

logger = get_logger(__name__)


class AgentRuntimeService:
    """Agent 运行时服务"""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.work_dir = Path.home() / ".open_adventure" / "agents"
        self.work_dir.mkdir(parents=True, exist_ok=True)

    async def start_agent(
        self,
        agent: Agent,
        task_description: str,
        project_path: Optional[str] = None,
        background: bool = True
    ) -> Execution:
        """
        启动 Agent 后台运行

        Args:
            agent: Agent 实例
            task_description: 任务描述
            project_path: 项目路径
            background: 是否后台运行

        Returns:
            Execution: 执行记录
        """
        try:
            # 生成 session_id
            session_id = f"agent_{agent.id}_{int(datetime.utcnow().timestamp())}"

            # 创建工作目录
            session_dir = self.work_dir / session_id
            session_dir.mkdir(parents=True, exist_ok=True)

            # 写入任务描述
            task_file = session_dir / "task.txt"
            task_file.write_text(task_description, encoding="utf-8")

            # 创建日志文件
            log_file = session_dir / "output.log"

            # 构建命令
            cmd = [
                "claude",
                "--agent", agent.name,
                "--memory", agent.memory or "project",
            ]

            if project_path:
                cmd.extend(["--project", project_path])

            logger.info(f"Starting agent {agent.name} with command: {' '.join(cmd)}")

            # 启动进程
            with open(log_file, "w") as f:
                process = await asyncio.create_subprocess_exec(
                    *cmd,
                    stdin=asyncio.subprocess.PIPE,
                    stdout=f,
                    stderr=asyncio.subprocess.STDOUT,
                    cwd=project_path or str(Path.home())
                )

            # 发送任务描述
            if process.stdin:
                process.stdin.write(task_description.encode())
                await process.stdin.drain()
                process.stdin.close()

            # 创建 Task（如果不存在）
            task = Task(
                title=f"Agent Execution: {agent.name}",
                description=task_description,
                status=TaskStatus.RUNNING,
                agent_id=agent.id
            )
            self.db.add(task)
            await self.db.flush()

            # 创建 Execution 记录
            execution = Execution(
                task_id=task.id,
                workflow_id=1,  # 虚拟 workflow_id
                execution_type=ExecutionType.AGENT_TEST,
                agent_id=agent.id,
                status=ExecutionStatus.RUNNING,
                session_id=session_id,
                process_pid=process.pid,
                work_dir=str(session_dir),
                log_file=str(log_file),
                is_background=background,
                test_input=task_description,
                started_at=datetime.utcnow(),
                last_activity_at=datetime.utcnow()
            )

            self.db.add(execution)
            await self.db.commit()
            await self.db.refresh(execution)

            logger.info(f"Agent {agent.name} started with PID {process.pid}, execution_id={execution.id}")

            # 启动心跳监控
            if background:
                from app.services.agent_monitor_service import get_monitor_service
                monitor_service = get_monitor_service()
                await monitor_service.start_monitoring(execution.id)
                logger.info(f"Started monitoring for execution {execution.id}")

            return execution

        except Exception as e:
            logger.error(f"Failed to start agent {agent.name}: {e}")
            raise

    async def get_agent_status(self, execution_id: int) -> Dict[str, Any]:
        """
        获取 Agent 运行状态

        Args:
            execution_id: Execution ID

        Returns:
            Dict: 状态信息
        """
        result = await self.db.execute(select(Execution).where(Execution.id == execution_id))
        execution = result.scalar_one_or_none()

        if not execution:
            raise ValueError(f"Execution {execution_id} not found")

        if not execution.process_pid:
            return {
                "status": "unknown",
                "error": "No process PID recorded"
            }

        # 检查进程是否存在
        try:
            process = psutil.Process(execution.process_pid)
            is_running = process.is_running()

            if is_running:
                status = "running"
                cpu_percent = process.cpu_percent(interval=0.1)
                memory_info = process.memory_info()
            else:
                status = "stopped"
                cpu_percent = 0
                memory_info = None
        except psutil.NoSuchProcess:
            status = "stopped"
            cpu_percent = 0
            memory_info = None

        # 读取日志文件信息
        output_lines = 0
        last_activity = None

        if execution.log_file and Path(execution.log_file).exists():
            log_file = Path(execution.log_file)
            loop = asyncio.get_event_loop()
            output_lines = await loop.run_in_executor(
                None,
                lambda: sum(1 for _ in open(log_file, encoding="utf-8", errors="ignore"))
            )
            last_activity = datetime.fromtimestamp(log_file.stat().st_mtime)

        return {
            "status": status,
            "pid": execution.process_pid,
            "started_at": execution.started_at.isoformat() if execution.started_at else None,
            "last_activity": last_activity.isoformat() if last_activity else None,
            "output_lines": output_lines,
            "cpu_percent": cpu_percent if status == "running" else 0,
            "memory_mb": memory_info.rss / 1024 / 1024 if memory_info else 0
        }

    async def get_agent_logs(
        self,
        execution_id: int,
        offset: int = 0,
        limit: int = 100
    ) -> Dict[str, Any]:
        """
        获取 Agent 日志

        Args:
            execution_id: Execution ID
            offset: 偏移量
            limit: 限制数量

        Returns:
            Dict: 日志信息
        """
        result = await self.db.execute(select(Execution).where(Execution.id == execution_id))
        execution = result.scalar_one_or_none()

        if not execution:
            raise ValueError(f"Execution {execution_id} not found")

        if not execution.log_file or not Path(execution.log_file).exists():
            return {"logs": [], "total": 0, "has_more": False}

        # 读取日志
        log_file = Path(execution.log_file)
        with open(log_file, "r", encoding="utf-8", errors="ignore") as f:
            all_lines = f.readlines()

        total = len(all_lines)
        logs = all_lines[offset:offset + limit]
        has_more = offset + limit < total

        return {
            "logs": [line.rstrip() for line in logs],
            "total": total,
            "has_more": has_more
        }

    async def stop_agent(self, execution_id: int) -> bool:
        """
        停止 Agent

        Args:
            execution_id: Execution ID

        Returns:
            bool: 是否成功停止
        """
        result = await self.db.execute(select(Execution).where(Execution.id == execution_id))
        execution = result.scalar_one_or_none()

        if not execution:
            raise ValueError(f"Execution {execution_id} not found")

        if not execution.process_pid:
            return False

        try:
            process = psutil.Process(execution.process_pid)
            process.terminate()

            # 等待进程结束（使用 run_in_executor 避免阻塞事件循环）
            loop = asyncio.get_event_loop()
            try:
                await asyncio.wait_for(
                    loop.run_in_executor(None, process.wait),
                    timeout=10
                )
            except (asyncio.TimeoutError, psutil.TimeoutExpired):
                process.kill()

            # 更新 Execution 状态
            execution.status = ExecutionStatus.CANCELLED
            execution.finished_at = datetime.utcnow()
            await self.db.commit()

            logger.info(f"Agent execution {execution_id} stopped successfully")
            return True

        except psutil.NoSuchProcess:
            # 进程已经不存在
            execution.status = ExecutionStatus.CANCELLED
            execution.finished_at = datetime.utcnow()
            await self.db.commit()
            return False
