"""
Plan Generator Service - 自动生成执行计划

基于任务描述和 Agent 能力自动生成详细的执行计划
"""
import json
import re
from datetime import datetime
from typing import Dict, Any, List, Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.task import Task, TaskType
from app.models.agent import Agent, AgentFramework
from app.models.plan import Plan, PlanStep, PlanTemplate, PlanType, PlanStatus, StepStatus
from app.models.skill import Skill
from app.repositories.agent_repository import AgentRepository
from app.repositories.skill_repository import SkillRepository
from app.services.prompt_optimizer_service import PromptOptimizerService
from app.adapters.models.factory import ModelProviderFactory
from app.core.logging import get_logger

logger = get_logger(__name__)


class PlanGeneratorService:
    """计划生成服务"""

    def __init__(self, session: AsyncSession):
        self.session = session
        self.agent_repo = AgentRepository(session)
        self.skill_repo = SkillRepository(session)
        self.prompt_optimizer = PromptOptimizerService(session)
        self.model_provider = ModelProviderFactory.create_provider("claude_cli")

    async def generate_plan_for_task(
        self,
        task: Task,
        agent: Optional[Agent] = None,
        template_id: Optional[int] = None
    ) -> Plan:
        """
        为任务生成执行计划

        Args:
            task: 任务对象
            agent: 指定的 Agent（可选）
            template_id: 计划模板 ID（可选）

        Returns:
            Plan: 生成的计划对象
        """
        logger.info(f"Generating plan for task {task.id}: {task.title}")

        try:
            # 1. 分析任务类型和复杂度
            task_analysis = await self._analyze_task(task)

            # 2. 选择或验证 Agent
            if not agent and task.agent_id:
                agent = await self.agent_repo.get_by_id(task.agent_id)

            if not agent:
                agent = await self._select_best_agent(task, task_analysis)

            # 3. 获取可用技能
            available_skills = await self._get_available_skills(agent)

            # 4. 生成计划结构
            if template_id:
                plan_structure = await self._generate_from_template(task, template_id, task_analysis)
            else:
                plan_structure = await self._generate_plan_structure(task, agent, task_analysis, available_skills)

            # 5. 创建计划对象
            plan = Plan(
                name=f"Plan for: {task.title}",
                description=f"Auto-generated plan for task: {task.description[:200]}...",
                task_id=task.id,
                agent_id=agent.id if agent else None,
                plan_type=plan_structure["type"],
                status=PlanStatus.GENERATED,
                generated_by="auto",
                generation_prompt=task.description,
                generation_model="claude-opus-4.6",
                input_schema=plan_structure.get("input_schema"),
                output_schema=plan_structure.get("output_schema"),
                total_steps=len(plan_structure["steps"]),
                meta={
                    "task_analysis": task_analysis,
                    "agent_info": {
                        "id": agent.id,
                        "name": agent.name,
                        "framework": agent.framework.value
                    } if agent else None,
                    "generation_timestamp": datetime.utcnow().isoformat()
                }
            )

            self.session.add(plan)
            await self.session.flush()  # 获取 plan.id

            # 6. 创建计划步骤
            for step_data in plan_structure["steps"]:
                step = PlanStep(
                    plan_id=plan.id,
                    step_number=step_data["step_number"],
                    name=step_data["name"],
                    description=step_data["description"],
                    action_type=step_data["action_type"],
                    action_config=step_data["action_config"],
                    depends_on=step_data.get("depends_on", []),
                    parallel_group=step_data.get("parallel_group"),
                    condition=step_data.get("condition"),
                    skip_on_failure=step_data.get("skip_on_failure", False)
                )
                self.session.add(step)

            await self.session.commit()
            logger.info(f"Generated plan {plan.id} with {len(plan_structure['steps'])} steps")

            return plan

        except Exception as e:
            logger.error(f"Error generating plan for task {task.id}: {e}")
            await self.session.rollback()
            raise

    async def _analyze_task(self, task: Task) -> Dict[str, Any]:
        """分析任务特征"""

        # 使用 prompt optimizer 优化任务描述
        optimized_description = await self.prompt_optimizer.optimize_prompt(
            task.description,
            context="task_analysis"
        )

        # 构建分析提示
        analysis_prompt = f"""
        分析以下任务，提供结构化的分析结果：

        任务标题：{task.title}
        任务描述：{optimized_description}
        任务类型：{task.task_type.value}

        请分析并返回 JSON 格式的结果，包含：
        1. complexity: 复杂度评分 (1-10)
        2. estimated_duration: 预估执行时间（分钟）
        3. required_skills: 需要的技能列表
        4. task_category: 任务分类
        5. key_actions: 关键行动步骤
        6. dependencies: 可能的依赖关系
        7. risk_factors: 风险因素
        8. success_criteria: 成功标准

        返回纯 JSON，不要其他文本。
        """

        try:
            response = await self.model_provider.generate_response(
                prompt=analysis_prompt,
                model="claude-opus-4.6",
                max_tokens=2000
            )

            # 解析 JSON 响应
            analysis = json.loads(response.strip())

            # 添加基础分析
            analysis.update({
                "task_length": len(task.description),
                "has_parameters": bool(task.input_parameters),
                "has_deadline": bool(task.deadline),
                "priority_level": task.priority
            })

            return analysis

        except Exception as e:
            logger.warning(f"Failed to analyze task with AI: {e}, using fallback analysis")
            return self._fallback_task_analysis(task)

    def _fallback_task_analysis(self, task: Task) -> Dict[str, Any]:
        """任务分析的后备方案"""
        description_length = len(task.description)

        # 基于描述长度和关键词估算复杂度
        complexity = min(10, max(1, description_length // 50 + 2))

        # 检测关键词
        keywords = {
            "code": ["代码", "编程", "开发", "bug", "测试"],
            "analysis": ["分析", "研究", "调查", "评估"],
            "creation": ["创建", "生成", "制作", "设计"],
            "automation": ["自动化", "脚本", "批处理"]
        }

        detected_categories = []
        for category, words in keywords.items():
            if any(word in task.description.lower() for word in words):
                detected_categories.append(category)

        return {
            "complexity": complexity,
            "estimated_duration": complexity * 10,  # 简单估算
            "required_skills": detected_categories,
            "task_category": detected_categories[0] if detected_categories else "general",
            "key_actions": ["分析需求", "执行任务", "验证结果"],
            "dependencies": [],
            "risk_factors": ["任务描述不够详细"] if description_length < 50 else [],
            "success_criteria": ["任务完成", "结果符合预期"]
        }

    async def _select_best_agent(self, task: Task, task_analysis: Dict[str, Any]) -> Optional[Agent]:
        """选择最适合的 Agent"""

        # 获取所有活跃的 Agent
        agents, _ = await self.agent_repo.get_all(
            skip=0,
            limit=100,
            filters={"is_active": True}
        )

        if not agents:
            return None

        # 评分算法
        best_agent = None
        best_score = 0

        required_skills = task_analysis.get("required_skills", [])
        task_category = task_analysis.get("task_category", "")

        for agent in agents:
            score = 0

            # 技能匹配度
            agent_skills = [skill.lower() for skill in agent.skills]
            skill_matches = sum(1 for skill in required_skills if skill in agent_skills)
            score += skill_matches * 3

            # 分类匹配度
            if task_category in agent.category or task_category in str(agent.tags).lower():
                score += 2

            # 框架适配度
            if task.task_type == TaskType.SINGLE_AGENT:
                if agent.framework == AgentFramework.CLAUDE_CODE:
                    score += 1
            elif task.task_type == TaskType.MULTI_AGENT:
                if agent.framework in [AgentFramework.OPENCLAW, AgentFramework.HYBRID]:
                    score += 2

            # 优先级权重
            score += agent.priority * 0.5

            if score > best_score:
                best_score = score
                best_agent = agent

        logger.info(f"Selected agent {best_agent.name} with score {best_score}" if best_agent else "No suitable agent found")
        return best_agent

    async def _get_available_skills(self, agent: Optional[Agent]) -> List[Dict[str, Any]]:
        """获取可用技能列表"""

        # 获取所有技能
        skills, _ = await self.skill_repo.get_all(skip=0, limit=200)

        available_skills = []
        for skill in skills:
            skill_info = {
                "name": skill.name,
                "description": skill.description,
                "type": skill.type,
                "tags": skill.tags,
                "quality_score": skill.quality_score or 0
            }

            # 如果指定了 Agent，检查技能兼容性
            if agent:
                if skill.name in agent.skills:
                    skill_info["priority"] = "high"
                elif any(tag in agent.tags for tag in skill.tags):
                    skill_info["priority"] = "medium"
                else:
                    skill_info["priority"] = "low"
            else:
                skill_info["priority"] = "medium"

            available_skills.append(skill_info)

        # 按优先级和质量评分排序
        available_skills.sort(
            key=lambda x: (
                {"high": 3, "medium": 2, "low": 1}[x["priority"]],
                x["quality_score"]
            ),
            reverse=True
        )

        return available_skills

    async def _generate_plan_structure(
        self,
        task: Task,
        agent: Optional[Agent],
        task_analysis: Dict[str, Any],
        available_skills: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """生成计划结构"""

        # 构建计划生成提示
        skills_info = "\n".join([
            f"- {skill['name']}: {skill['description'][:100]}..."
            for skill in available_skills[:10]  # 只包含前10个技能
        ])

        agent_info = ""
        if agent:
            agent_info = f"""
Agent 信息：
- 名称：{agent.name}
- 框架：{agent.framework.value}
- 类型：{agent.agent_type.value}
- 技能：{', '.join(agent.skills[:5])}
- 描述：{agent.description[:200]}
"""

        generation_prompt = f"""
        为以下任务生成详细的执行计划：

        任务信息：
        - 标题：{task.title}
        - 描述：{task.description}
        - 类型：{task.task_type.value}
        - 复杂度：{task_analysis.get('complexity', 5)}/10

        {agent_info}

        可用技能：
        {skills_info}

        任务分析结果：
        {json.dumps(task_analysis, ensure_ascii=False, indent=2)}

        请生成一个详细的执行计划，返回 JSON 格式，包含：
        {{
            "type": "sequential|parallel|conditional|hybrid",
            "input_schema": {{"参数名": "参数描述"}},
            "output_schema": {{"结果名": "结果描述"}},
            "steps": [
                {{
                    "step_number": 1,
                    "name": "步骤名称",
                    "description": "详细描述",
                    "action_type": "skill|agent|command|condition",
                    "action_config": {{
                        "skill_name": "技能名称",
                        "parameters": {{}},
                        "timeout": 300
                    }},
                    "depends_on": [],
                    "parallel_group": null,
                    "condition": null,
                    "skip_on_failure": false
                }}
            ]
        }}

        要求：
        1. 步骤要具体可执行
        2. 优先使用可用的技能
        3. 考虑错误处理和重试
        4. 步骤之间的依赖关系要合理
        5. 总步骤数控制在 3-15 个之间

        返回纯 JSON，不要其他文本。
        """

        try:
            response = await self.model_provider.generate_response(
                prompt=generation_prompt,
                model="claude-opus-4.6",
                max_tokens=4000
            )

            plan_structure = json.loads(response.strip())

            # 验证和修正计划结构
            plan_structure = self._validate_plan_structure(plan_structure, available_skills)

            return plan_structure

        except Exception as e:
            logger.warning(f"Failed to generate plan with AI: {e}, using template")
            return self._generate_fallback_plan(task, task_analysis, available_skills)

    def _validate_plan_structure(self, plan_structure: Dict[str, Any], available_skills: List[Dict[str, Any]]) -> Dict[str, Any]:
        """验证和修正计划结构"""

        # 确保必要字段存在
        if "type" not in plan_structure:
            plan_structure["type"] = "sequential"

        if "steps" not in plan_structure:
            plan_structure["steps"] = []

        # 验证步骤
        skill_names = {skill["name"] for skill in available_skills}

        for i, step in enumerate(plan_structure["steps"]):
            # 确保步骤编号连续
            step["step_number"] = i + 1

            # 验证必要字段
            if "name" not in step:
                step["name"] = f"Step {i + 1}"

            if "description" not in step:
                step["description"] = "执行步骤"

            if "action_type" not in step:
                step["action_type"] = "skill"

            if "action_config" not in step:
                step["action_config"] = {}

            # 验证技能名称
            if step["action_type"] == "skill":
                skill_name = step["action_config"].get("skill_name")
                if skill_name and skill_name not in skill_names:
                    # 尝试找到相似的技能
                    similar_skill = self._find_similar_skill(skill_name, available_skills)
                    if similar_skill:
                        step["action_config"]["skill_name"] = similar_skill["name"]
                        logger.info(f"Replaced unknown skill '{skill_name}' with '{similar_skill['name']}'")

        return plan_structure

    def _find_similar_skill(self, skill_name: str, available_skills: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        """查找相似的技能"""
        skill_name_lower = skill_name.lower()

        for skill in available_skills:
            if skill_name_lower in skill["name"].lower() or skill["name"].lower() in skill_name_lower:
                return skill

        return None

    def _generate_fallback_plan(
        self,
        task: Task,
        task_analysis: Dict[str, Any],
        available_skills: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """生成后备计划"""

        steps = []

        # 基础步骤模板
        if task.task_type == TaskType.SINGLE_AGENT:
            steps = [
                {
                    "step_number": 1,
                    "name": "分析任务需求",
                    "description": "详细分析任务要求和目标",
                    "action_type": "agent",
                    "action_config": {"action": "analyze", "timeout": 300}
                },
                {
                    "step_number": 2,
                    "name": "执行主要任务",
                    "description": task.description,
                    "action_type": "agent",
                    "action_config": {"action": "execute", "timeout": 600}
                },
                {
                    "step_number": 3,
                    "name": "验证结果",
                    "description": "检查执行结果是否符合预期",
                    "action_type": "agent",
                    "action_config": {"action": "validate", "timeout": 300}
                }
            ]

        return {
            "type": "sequential",
            "input_schema": {"task_input": "任务输入数据"},
            "output_schema": {"result": "执行结果", "status": "执行状态"},
            "steps": steps
        }

    async def _generate_from_template(
        self,
        task: Task,
        template_id: int,
        task_analysis: Dict[str, Any]
    ) -> Dict[str, Any]:
        """从模板生成计划"""

        # 这里应该从数据库加载模板
        # 简化实现，返回基础模板
        return self._generate_fallback_plan(task, task_analysis, [])

    async def regenerate_plan(self, plan: Plan, modifications: Optional[Dict[str, Any]] = None) -> Plan:
        """重新生成计划"""

        # 获取关联的任务和 Agent
        task = await self.session.get(Task, plan.task_id)
        agent = await self.session.get(Agent, plan.agent_id) if plan.agent_id else None

        if not task:
            raise ValueError(f"Task {plan.task_id} not found")

        # 应用修改
        if modifications:
            if "description" in modifications:
                task.description = modifications["description"]
            if "agent_id" in modifications:
                agent = await self.session.get(Agent, modifications["agent_id"])

        # 删除旧的步骤
        for step in plan.steps:
            await self.session.delete(step)

        # 重新生成
        new_plan = await self.generate_plan_for_task(task, agent)

        # 更新现有计划
        plan.name = new_plan.name
        plan.description = new_plan.description
        plan.plan_type = new_plan.plan_type
        plan.total_steps = new_plan.total_steps
        plan.generation_prompt = new_plan.generation_prompt
        plan.meta = new_plan.meta
        plan.status = PlanStatus.GENERATED

        await self.session.commit()

        return plan