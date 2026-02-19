"""
执行引擎服务

负责工作流的执行编排和节点调度
"""
import asyncio
from datetime import datetime
from typing import Dict, List, Optional, Any, Set
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.workflow import Workflow, WorkflowNode, WorkflowEdge, WorkflowNodeType
from app.models.task import Task, TaskStatus, Execution, NodeExecution, ExecutionStatus
from app.repositories.workflow_repository import WorkflowRepository
from app.repositories.task_repository import TaskRepository
from app.repositories.executions_repo import ExecutionRepository
from app.adapters.claude.adapter import ClaudeAdapter
from app.core.logging import get_logger

logger = get_logger(__name__)


class WorkflowValidationError(Exception):
    """工作流验证错误"""
    pass


class ConditionEvaluator:
    """条件表达式评估器 - 使用安全的表达式解析"""

    @staticmethod
    def evaluate(expression: str, context: Dict[str, Any]) -> bool:
        """
        评估条件表达式（安全版本）

        支持简单的比较表达式：
        - variable == value
        - variable > value
        - variable < value
        - status == "completed"

        Args:
            expression: 条件表达式字符串
            context: 执行上下文数据

        Returns:
            bool: 评估结果
        """
        if not expression:
            return True

        try:
            expression = expression.strip()

            # 支持简单的比较操作
            for op in ['==', '!=', '>=', '<=', '>', '<']:
                if op in expression:
                    parts = expression.split(op, 1)
                    if len(parts) == 2:
                        left = parts[0].strip()
                        right = parts[1].strip().strip('"').strip("'")

                        # 从上下文获取左侧值
                        left_value = context.get(left, left)

                        # 尝试转换为数字
                        try:
                            left_value = float(left_value) if '.' in str(left_value) else int(left_value)
                            right = float(right) if '.' in right else int(right)
                        except (ValueError, TypeError):
                            pass

                        # 执行比较
                        if op == '==':
                            return left_value == right
                        elif op == '!=':
                            return left_value != right
                        elif op == '>':
                            return left_value > right
                        elif op == '<':
                            return left_value < right
                        elif op == '>=':
                            return left_value >= right
                        elif op == '<=':
                            return left_value <= right

            # 如果没有操作符，检查变量是否为真值
            return bool(context.get(expression, False))

        except Exception as e:
            logger.error(f"Failed to evaluate condition '{expression}': {e}")
            return False


class ExecutionEngine:
    """
    执行引擎

    负责：
    1. 工作流 DAG 验证
    2. 节点拓扑排序
    3. 节点执行调度（顺序/并行）
    4. 执行状态管理
    5. 日志记录
    """

    def __init__(
        self,
        db: AsyncSession,
        adapter: ClaudeAdapter
    ):
        self.db = db
        self.adapter = adapter
        self.workflow_repo = WorkflowRepository(db)
        self.task_repo = TaskRepository(db)
        self.execution_repo = ExecutionRepository(db)
        self.execution_context: Dict[str, Any] = {}  # 执行上下文
        self.condition_evaluator = ConditionEvaluator()

    async def validate_workflow(self, workflow_id: int) -> Dict[str, Any]:
        """
        验证工作流 DAG 合法性

        检查：
        1. 是否有环
        2. 是否有孤立节点
        3. 入度/出度约束

        Returns:
            Dict: 验证结果
        """
        logger.info(f"Validating workflow {workflow_id}")

        # 获取工作流
        workflow = await self.workflow_repo.get(workflow_id)
        if not workflow:
            raise WorkflowValidationError(f"Workflow {workflow_id} not found")

        # 获取节点和边
        nodes_result = await self.db.execute(
            select(WorkflowNode).where(WorkflowNode.workflow_id == workflow_id)
        )
        nodes = nodes_result.scalars().all()

        edges_result = await self.db.execute(
            select(WorkflowEdge).where(WorkflowEdge.workflow_id == workflow_id)
        )
        edges = edges_result.scalars().all()

        if not nodes:
            raise WorkflowValidationError("Workflow has no nodes")

        # 构建邻接表
        node_ids = {node.id for node in nodes}
        adjacency = {node_id: [] for node_id in node_ids}
        in_degree = {node_id: 0 for node_id in node_ids}

        for edge in edges:
            if edge.source_node_id not in node_ids or edge.target_node_id not in node_ids:
                raise WorkflowValidationError(f"Edge references non-existent node")

            adjacency[edge.source_node_id].append(edge.target_node_id)
            in_degree[edge.target_node_id] += 1

        # 拓扑排序检测环
        queue = [node_id for node_id, degree in in_degree.items() if degree == 0]
        sorted_nodes = []

        while queue:
            current = queue.pop(0)
            sorted_nodes.append(current)

            for neighbor in adjacency[current]:
                in_degree[neighbor] -= 1
                if in_degree[neighbor] == 0:
                    queue.append(neighbor)

        if len(sorted_nodes) != len(nodes):
            raise WorkflowValidationError("Workflow contains cycles")

        # 检查孤立节点
        isolated = [node_id for node_id in node_ids
                   if not adjacency[node_id] and in_degree[node_id] == 0 and len(nodes) > 1]

        return {
            "valid": True,
            "node_count": len(nodes),
            "edge_count": len(edges),
            "topological_order": sorted_nodes,
            "isolated_nodes": isolated,
            "has_isolated": len(isolated) > 0
        }

    async def execute_task(self, task_id: int) -> Execution:
        """
        执行任务

        Args:
            task_id: 任务 ID

        Returns:
            Execution: 执行记录
        """
        logger.info(f"Starting execution for task {task_id}")

        # 获取任务
        task = await self.task_repo.get(task_id)
        if not task:
            raise ValueError(f"Task {task_id} not found")

        if not task.workflow_id:
            raise ValueError(f"Task {task_id} has no workflow")

        # 验证工作流
        validation = await self.validate_workflow(task.workflow_id)
        if not validation["valid"]:
            raise WorkflowValidationError("Workflow validation failed")

        # 创建执行记录
        execution = Execution(
            task_id=task_id,
            workflow_id=task.workflow_id,
            status=ExecutionStatus.RUNNING,
            started_at=datetime.utcnow()
        )
        self.db.add(execution)
        await self.db.commit()
        await self.db.refresh(execution)

        # 更新任务状态
        task.status = TaskStatus.RUNNING
        await self.db.commit()

        # 初始化执行上下文
        self.execution_context = {
            "task_id": task_id,
            "execution_id": execution.id,
            "workflow_id": task.workflow_id,
        }

        try:
            # 获取所有节点和边
            nodes_result = await self.db.execute(
                select(WorkflowNode).where(WorkflowNode.workflow_id == task.workflow_id)
            )
            nodes = {node.id: node for node in nodes_result.scalars().all()}

            edges_result = await self.db.execute(
                select(WorkflowEdge).where(WorkflowEdge.workflow_id == task.workflow_id)
            )
            edges = list(edges_result.scalars().all())

            # 执行工作流（支持并行和条件）
            await self._execute_workflow_advanced(execution.id, nodes, edges)

            # 执行成功
            execution.status = ExecutionStatus.SUCCEEDED
            execution.finished_at = datetime.utcnow()
            task.status = TaskStatus.COMPLETED

        except Exception as e:
            logger.error(f"Execution failed: {e}", exc_info=True)
            execution.status = ExecutionStatus.FAILED
            execution.finished_at = datetime.utcnow()
            execution.error_message = str(e)
            task.status = TaskStatus.FAILED

        await self.db.commit()
        await self.db.refresh(execution)

        logger.info(f"Execution {execution.id} finished with status {execution.status}")

        return execution

    async def _execute_workflow_advanced(
        self,
        execution_id: int,
        nodes: Dict[int, WorkflowNode],
        edges: List[WorkflowEdge]
    ) -> None:
        """
        高级工作流执行（支持并行、条件、循环）

        Args:
            execution_id: 执行 ID
            nodes: 节点字典
            edges: 边列表
        """
        # 构建邻接表
        adjacency: Dict[int, List[int]] = {node_id: [] for node_id in nodes.keys()}
        for edge in edges:
            adjacency[edge.from_node_id].append(edge.to_node_id)

        # 找到起始节点（入度为0的节点）
        in_degree = {node_id: 0 for node_id in nodes.keys()}
        for edge in edges:
            in_degree[edge.to_node_id] += 1

        start_nodes = [node_id for node_id, degree in in_degree.items() if degree == 0]

        # 已执行的节点集合
        executed: Set[int] = set()

        # 从起始节点开始执行
        await self._execute_nodes_recursive(
            execution_id,
            start_nodes,
            nodes,
            adjacency,
            executed
        )

    async def _execute_nodes_recursive(
        self,
        execution_id: int,
        node_ids: List[int],
        nodes: Dict[int, WorkflowNode],
        adjacency: Dict[int, List[int]],
        executed: Set[int]
    ) -> None:
        """
        递归执行节点（支持并行）

        Args:
            execution_id: 执行 ID
            node_ids: 要执行的节点 ID 列表
            nodes: 节点字典
            adjacency: 邻接表
            executed: 已执行节点集合
        """
        if not node_ids:
            return

        # 过滤已执行的节点
        node_ids = [nid for nid in node_ids if nid not in executed]
        if not node_ids:
            return

        # 检查是否有并行网关
        parallel_gateway_nodes = [
            nid for nid in node_ids
            if nodes[nid].type == WorkflowNodeType.PARALLEL_GATEWAY
        ]

        if parallel_gateway_nodes:
            # 并行执行
            for gateway_id in parallel_gateway_nodes:
                executed.add(gateway_id)
                # 获取网关后的所有分支
                branch_nodes = adjacency[gateway_id]
                if branch_nodes:
                    # 并行执行所有分支
                    await asyncio.gather(*[
                        self._execute_node(execution_id, node_id)
                        for node_id in branch_nodes
                    ])
                    executed.update(branch_nodes)

                    # 继续执行后续节点
                    next_nodes = []
                    for branch_node in branch_nodes:
                        next_nodes.extend(adjacency[branch_node])
                    if next_nodes:
                        await self._execute_nodes_recursive(
                            execution_id,
                            next_nodes,
                            nodes,
                            adjacency,
                            executed
                        )
        else:
            # 顺序执行
            for node_id in node_ids:
                if node_id in executed:
                    continue

                node = nodes[node_id]

                # 处理条件分支
                if node.type == WorkflowNodeType.DECISION:
                    executed.add(node_id)
                    # 评估条件选择分支
                    next_node = await self._evaluate_decision_node(
                        node,
                        adjacency[node_id]
                    )
                    if next_node:
                        await self._execute_nodes_recursive(
                            execution_id,
                            [next_node],
                            nodes,
                            adjacency,
                            executed
                        )
                # 处理循环
                elif node.type == WorkflowNodeType.LOOP_START:
                    executed.add(node_id)
                    await self._execute_loop(
                        execution_id,
                        node,
                        adjacency,
                        nodes,
                        executed
                    )
                # 普通任务节点
                else:
                    await self._execute_node(execution_id, node_id)
                    executed.add(node_id)

                    # 继续执行后续节点
                    next_nodes = adjacency[node_id]
                    if next_nodes:
                        await self._execute_nodes_recursive(
                            execution_id,
                            next_nodes,
                            nodes,
                            adjacency,
                            executed
                        )

    async def _evaluate_decision_node(
        self,
        node: WorkflowNode,
        next_node_ids: List[int]
    ) -> Optional[int]:
        """
        评估决策节点，选择执行路径

        Args:
            node: 决策节点
            next_node_ids: 可能的下一个节点列表

        Returns:
            选中的节点 ID
        """
        if not node.condition_expression:
            # 没有条件，返回第一个节点
            return next_node_ids[0] if next_node_ids else None

        # 评估条件
        result = self.condition_evaluator.evaluate(
            node.condition_expression,
            self.execution_context
        )

        # 根据结果选择分支（True 选第一个，False 选第二个）
        if result and len(next_node_ids) > 0:
            return next_node_ids[0]
        elif not result and len(next_node_ids) > 1:
            return next_node_ids[1]

        return None

    async def _execute_loop(
        self,
        execution_id: int,
        loop_start_node: WorkflowNode,
        adjacency: Dict[int, List[int]],
        nodes: Dict[int, WorkflowNode],
        executed: Set[int]
    ) -> None:
        """
        执行循环

        Args:
            execution_id: 执行 ID
            loop_start_node: 循环起始节点
            adjacency: 邻接表
            nodes: 节点字典
            executed: 已执行节点集合
        """
        max_iterations = loop_start_node.max_iterations or 10
        iteration = 0

        while iteration < max_iterations:
            iteration += 1
            self.execution_context['loop_iteration'] = iteration

            # 检查循环条件
            if loop_start_node.loop_condition:
                should_continue = self.condition_evaluator.evaluate(
                    loop_start_node.loop_condition,
                    self.execution_context
                )
                if not should_continue:
                    break

            # 执行循环体内的节点
            loop_body_nodes = adjacency[loop_start_node.id]
            for node_id in loop_body_nodes:
                node = nodes[node_id]
                if node.type == WorkflowNodeType.LOOP_END:
                    break
                await self._execute_node(execution_id, node_id)

        logger.info(f"Loop completed after {iteration} iterations")

    async def _execute_node(self, execution_id: int, node_id: int) -> NodeExecution:
        """
        执行单个节点

        Args:
            execution_id: 执行 ID
            node_id: 节点 ID

        Returns:
            NodeExecution: 节点执行记录
        """
        logger.info(f"Executing node {node_id} for execution {execution_id}")

        # 获取节点
        node_result = await self.db.execute(
            select(WorkflowNode).where(WorkflowNode.id == node_id)
        )
        node = node_result.scalar_one_or_none()

        if not node:
            raise ValueError(f"Node {node_id} not found")

        # 创建节点执行记录
        node_execution = NodeExecution(
            execution_id=execution_id,
            node_id=node_id,
            status=ExecutionStatus.RUNNING,
            started_at=datetime.utcnow()
        )
        self.db.add(node_execution)
        await self.db.commit()
        await self.db.refresh(node_execution)

        try:
            # 根据节点类型执行
            if node.node_type == "skill":
                result = await self._execute_skill_node(node)
            elif node.node_type == "agent":
                result = await self._execute_agent_node(node)
            elif node.node_type == "team":
                result = await self._execute_team_node(node)
            else:
                result = {"message": f"Node type {node.node_type} not implemented yet"}

            # 执行成功
            node_execution.status = ExecutionStatus.SUCCEEDED
            node_execution.finished_at = datetime.utcnow()
            node_execution.output = result

            # 保存结果到执行上下文
            self.execution_context[f"node_{node_id}_output"] = result
            self.execution_context[f"node_{node_id}_status"] = "succeeded"

        except Exception as e:
            logger.error(f"Node execution failed: {e}", exc_info=True)
            node_execution.status = ExecutionStatus.FAILED
            node_execution.finished_at = datetime.utcnow()
            node_execution.error_message = str(e)
            raise

        await self.db.commit()
        await self.db.refresh(node_execution)

        return node_execution

    async def _execute_skill_node(self, node: WorkflowNode) -> Dict[str, Any]:
        """执行技能节点"""
        config = node.config or {}
        skill_name = config.get("skill_name")

        if not skill_name:
            raise ValueError("Skill node requires skill_name in config")

        # 调用 adapter 执行技能
        result = await self.adapter.execute_skill(
            skill_name=skill_name,
            args=config.get("args", ""),
            timeout=config.get("timeout", 300)
        )

        return result

    async def _execute_agent_node(self, node: WorkflowNode) -> Dict[str, Any]:
        """执行智能体节点"""
        config = node.config or {}
        agent_name = config.get("agent_name")
        prompt = config.get("prompt", "")

        if not agent_name:
            raise ValueError("Agent node requires agent_name in config")

        # 调用 adapter 执行智能体
        result = await self.adapter.execute_with_agent(
            agent_name=agent_name,
            prompt=prompt,
            timeout=config.get("timeout", 600)
        )

        return result

    async def _execute_team_node(self, node: WorkflowNode) -> Dict[str, Any]:
        """执行队伍节点"""
        config = node.config or {}
        team_name = config.get("team_name")
        prompt = config.get("prompt", "")

        if not team_name:
            raise ValueError("Team node requires team_name in config")

        # 调用 adapter 执行队伍
        result = await self.adapter.execute_with_team(
            team_name=team_name,
            prompt=prompt,
            timeout=config.get("timeout", 900)
        )

        return result
