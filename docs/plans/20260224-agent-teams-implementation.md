# Agent Teams Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 创建 5 个 Agent Team（1 个 Master + 4 个子团队），实现自动化的开发流程调度系统

**Architecture:** 使用现有的 AgentTeam 数据模型，通过 API 创建团队配置。采用方案 B（基于脚本的实现），Master Team 通过 Python 脚本调度子团队，数据通过 JSON 格式在团队间传递。

**Tech Stack:** Python, FastAPI, SQLAlchemy, Pydantic

---

## Task 1: 创建数据库种子脚本

**Files:**
- Create: `backend/scripts/seed_agent_teams.py`

**Step 1: 创建种子脚本文件**

创建脚本文件，包含 5 个 Agent Team 的配置数据：

```python
"""
Seed script for Agent Teams
创建用于 Phase 6 开发的 Agent Team 体系
"""
import asyncio
import sys
from pathlib import Path

# 添加项目根目录到 Python 路径
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.config.settings import settings
from app.models.agent_team import AgentTeam
from app.repositories.agent_repository import AgentRepository
from app.core.database import Base


# Agent Team 配置数据
AGENT_TEAMS = [
    {
        "name": "agentteam-collaboration-master",
        "description": "主控团队，负责协调和调度其他 4 个子团队，实现自动化的开发流程",
        "members": [],  # 将在后续步骤中填充
        "tags": ["master", "orchestration", "phase6"],
        "meta": {
            "type": "master",
            "sub_teams": [
                "requirements-analysis-team",
                "architecture-design-team",
                "implementation-team",
                "quality-assurance-team"
            ],
            "workflow": "sequential"
        }
    },
    {
        "name": "requirements-analysis-team",
        "description": "需求分析团队，负责代码库分析、需求澄清、依赖识别和文档输出",
        "members": [],
        "tags": ["requirements", "analysis", "phase6"],
        "meta": {
            "type": "sub_team",
            "stage": "requirements",
            "output_format": "requirements_document"
        }
    },
    {
        "name": "architecture-design-team",
        "description": "架构设计团队，负责技术方案设计、架构评估、接口设计和文档输出",
        "members": [],
        "tags": ["architecture", "design", "phase6"],
        "meta": {
            "type": "sub_team",
            "stage": "architecture",
            "output_format": "design_document"
        }
    },
    {
        "name": "implementation-team",
        "description": "实现团队，负责代码实现、环境配置、单元测试和代码优化",
        "members": [],
        "tags": ["implementation", "coding", "phase6"],
        "meta": {
            "type": "sub_team",
            "stage": "implementation",
            "output_format": "code_and_tests"
        }
    },
    {
        "name": "quality-assurance-team",
        "description": "质量保证团队，负责代码审查、测试验证、文档审查和改进建议",
        "members": [],
        "tags": ["qa", "testing", "review", "phase6"],
        "meta": {
            "type": "sub_team",
            "stage": "qa",
            "output_format": "quality_report"
        }
    }
]


async def get_agent_id_by_name(session: AsyncSession, agent_name: str) -> int:
    """根据 agent 名称获取 ID"""
    repo = AgentRepository(session)
    agents = await repo.list(limit=1000)

    for agent in agents:
        if agent.name == agent_name:
            return agent.id

    raise ValueError(f"Agent '{agent_name}' not found in database")


async def seed_agent_teams():
    """创建 Agent Teams"""
    # 创建数据库引擎
    engine = create_async_engine(settings.database_url, echo=True)

    # 创建会话
    async_session = sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )

    async with async_session() as session:
        try:
            # 获取 Agent IDs
            print("正在获取 Agent IDs...")
            agent_ids = {}
            agent_names = ["general-purpose", "explore", "plan", "bash", "code-reviewer", "code-simplifier"]

            for name in agent_names:
                try:
                    agent_ids[name] = await get_agent_id_by_name(session, name)
                    print(f"  ✓ {name}: {agent_ids[name]}")
                except ValueError as e:
                    print(f"  ✗ {e}")

            # 填充 members 数据
            AGENT_TEAMS[0]["members"] = [  # Master Team
                {"agent_id": agent_ids["general-purpose"], "role": "Team Lead", "priority": 1},
                {"agent_id": agent_ids["plan"], "role": "Process Manager", "priority": 2}
            ]

            AGENT_TEAMS[1]["members"] = [  # Requirements Team
                {"agent_id": agent_ids["explore"], "role": "Code Analyst", "priority": 1},
                {"agent_id": agent_ids["general-purpose"], "role": "Requirements Engineer", "priority": 2}
            ]

            AGENT_TEAMS[2]["members"] = [  # Architecture Team
                {"agent_id": agent_ids["plan"], "role": "Solution Architect", "priority": 1},
                {"agent_id": agent_ids["general-purpose"], "role": "Design Reviewer", "priority": 2}
            ]

            AGENT_TEAMS[3]["members"] = [  # Implementation Team
                {"agent_id": agent_ids["general-purpose"], "role": "Lead Developer", "priority": 1},
                {"agent_id": agent_ids["bash"], "role": "DevOps Engineer", "priority": 2},
                {"agent_id": agent_ids["code-simplifier"], "role": "Code Optimizer", "priority": 3}
            ]

            AGENT_TEAMS[4]["members"] = [  # QA Team
                {"agent_id": agent_ids["code-reviewer"], "role": "Code Reviewer", "priority": 1},
                {"agent_id": agent_ids["general-purpose"], "role": "QA Engineer", "priority": 2}
            ]

            # 创建 Agent Teams
            print("\n正在创建 Agent Teams...")
            for team_data in AGENT_TEAMS:
                # 检查是否已存在
                existing = await session.execute(
                    f"SELECT id FROM agent_teams WHERE name = '{team_data['name']}'"
                )
                if existing.scalar():
                    print(f"  ⊙ {team_data['name']} 已存在，跳过")
                    continue

                team = AgentTeam(**team_data)
                session.add(team)
                print(f"  ✓ {team_data['name']}")

            await session.commit()
            print("\n✅ Agent Teams 创建成功！")

        except Exception as e:
            await session.rollback()
            print(f"\n❌ 错误: {e}")
            raise
        finally:
            await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed_agent_teams())
```

**Step 2: 运行种子脚本**

```bash
cd backend
python scripts/seed_agent_teams.py
```

预期输出：
```
正在获取 Agent IDs...
  ✓ general-purpose: 1
  ✓ explore: 2
  ✓ plan: 3
  ✓ bash: 4
  ✓ code-reviewer: 5
  ✓ code-simplifier: 6

正在创建 Agent Teams...
  ✓ agentteam-collaboration-master
  ✓ requirements-analysis-team
  ✓ architecture-design-team
  ✓ implementation-team
  ✓ quality-assurance-team

✅ Agent Teams 创建成功！
```

**Step 3: 验证数据库**

```bash
sqlite3 backend/data/claude_manager.db "SELECT id, name, description FROM agent_teams;"
```

预期输出：显示 5 个团队的记录

**Step 4: 提交**

```bash
git add backend/scripts/seed_agent_teams.py
git commit -m "feat: add seed script for Agent Teams

Create 5 Agent Teams for Phase 6 development:
- Master Team (orchestration)
- Requirements Analysis Team
- Architecture Design Team
- Implementation Team
- Quality Assurance Team

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: 创建 Master Team 调度服务

**Files:**
- Create: `backend/app/services/master_team_orchestrator.py`

**Step 1: 创建调度服务文件**

```python
"""
Master Team Orchestrator Service
负责协调和调度子团队，实现自动化的开发流程
"""
from typing import Dict, Any, List, Optional
from datetime import datetime
import json

from app.repositories.agent_team_repository import AgentTeamRepository
from app.core.logging import get_logger

logger = get_logger(__name__)


class MasterTeamOrchestrator:
    """Master Team 调度器"""

    def __init__(self, repository: AgentTeamRepository):
        self.repository = repository
        self.sub_team_names = [
            "requirements-analysis-team",
            "architecture-design-team",
            "implementation-team",
            "quality-assurance-team"
        ]

    async def execute_workflow(self, requirement: str) -> Dict[str, Any]:
        """
        执行完整的开发工作流

        Args:
            requirement: 用户需求描述

        Returns:
            包含所有阶段结果的字典
        """
        logger.info(f"开始执行工作流，需求: {requirement}")

        result = {
            "status": "in_progress",
            "requirement": requirement,
            "started_at": datetime.utcnow().isoformat(),
            "stages": {},
            "errors": []
        }

        # 阶段 1: 需求分析
        try:
            requirements_result = await self._execute_requirements_analysis(requirement)
            result["stages"]["requirements"] = requirements_result
            logger.info("需求分析阶段完成")
        except Exception as e:
            error_msg = f"需求分析阶段失败: {str(e)}"
            logger.error(error_msg)
            result["errors"].append(error_msg)
            result["status"] = "failed"
            return result

        # 阶段 2: 架构设计
        try:
            architecture_result = await self._execute_architecture_design(
                requirements_result
            )
            result["stages"]["architecture"] = architecture_result
            logger.info("架构设计阶段完成")
        except Exception as e:
            error_msg = f"架构设计阶段失败: {str(e)}"
            logger.error(error_msg)
            result["errors"].append(error_msg)
            result["status"] = "failed"
            return result

        # 阶段 3: 实现
        try:
            implementation_result = await self._execute_implementation(
                architecture_result
            )
            result["stages"]["implementation"] = implementation_result
            logger.info("实现阶段完成")
        except Exception as e:
            error_msg = f"实现阶段失败: {str(e)}"
            logger.error(error_msg)
            result["errors"].append(error_msg)
            result["status"] = "failed"
            return result

        # 阶段 4: 质量保证
        try:
            qa_result = await self._execute_quality_assurance(
                implementation_result,
                architecture_result
            )
            result["stages"]["qa"] = qa_result
            logger.info("质量保证阶段完成")
        except Exception as e:
            error_msg = f"质量保证阶段失败: {str(e)}"
            logger.error(error_msg)
            result["errors"].append(error_msg)
            result["status"] = "failed"
            return result

        # 完成
        result["status"] = "completed"
        result["completed_at"] = datetime.utcnow().isoformat()
        result["summary"] = self._generate_summary(result)

        logger.info("工作流执行完成")
        return result

    async def _execute_requirements_analysis(
        self,
        requirement: str
    ) -> Dict[str, Any]:
        """执行需求分析阶段"""
        # TODO: 实际调用 Requirements Analysis Team
        # 当前返回模拟数据
        return {
            "status": "completed",
            "team": "requirements-analysis-team",
            "output": {
                "functional_requirements": [
                    "功能点 1",
                    "功能点 2"
                ],
                "affected_modules": [
                    "backend/app/services/",
                    "backend/app/api/routers/"
                ],
                "dependencies": [
                    "现有模块 A",
                    "现有模块 B"
                ]
            },
            "document": "需求分析文档内容..."
        }

    async def _execute_architecture_design(
        self,
        requirements: Dict[str, Any]
    ) -> Dict[str, Any]:
        """执行架构设计阶段"""
        # TODO: 实际调用 Architecture Design Team
        return {
            "status": "completed",
            "team": "architecture-design-team",
            "output": {
                "technical_approach": "技术方案描述",
                "module_design": {
                    "service_layer": "服务层设计",
                    "api_layer": "API 层设计"
                },
                "interfaces": [
                    "接口 1 定义",
                    "接口 2 定义"
                ],
                "implementation_steps": [
                    "步骤 1",
                    "步骤 2"
                ]
            },
            "document": "架构设计文档内容..."
        }

    async def _execute_implementation(
        self,
        architecture: Dict[str, Any]
    ) -> Dict[str, Any]:
        """执行实现阶段"""
        # TODO: 实际调用 Implementation Team
        return {
            "status": "completed",
            "team": "implementation-team",
            "output": {
                "files_created": [
                    "backend/app/services/new_service.py",
                    "tests/test_new_service.py"
                ],
                "files_modified": [
                    "backend/app/api/routers/router.py"
                ],
                "test_results": {
                    "passed": 10,
                    "failed": 0,
                    "coverage": "95%"
                }
            },
            "code": "实现代码内容...",
            "tests": "测试代码内容..."
        }

    async def _execute_quality_assurance(
        self,
        implementation: Dict[str, Any],
        architecture: Dict[str, Any]
    ) -> Dict[str, Any]:
        """执行质量保证阶段"""
        # TODO: 实际调用 Quality Assurance Team
        return {
            "status": "completed",
            "team": "quality-assurance-team",
            "output": {
                "code_review": {
                    "issues_found": 2,
                    "severity": "low",
                    "recommendations": [
                        "建议 1",
                        "建议 2"
                    ]
                },
                "test_validation": {
                    "coverage": "95%",
                    "all_tests_passed": True
                },
                "documentation_review": {
                    "completeness": "good",
                    "suggestions": []
                }
            },
            "report": "质量报告内容..."
        }

    def _generate_summary(self, result: Dict[str, Any]) -> str:
        """生成工作流执行摘要"""
        stages_completed = len(result["stages"])
        errors_count = len(result["errors"])

        if result["status"] == "completed":
            return f"工作流执行成功，完成 {stages_completed} 个阶段"
        else:
            return f"工作流执行失败，完成 {stages_completed} 个阶段，{errors_count} 个错误"
```

**Step 2: 创建测试文件**

```python
# tests/services/test_master_team_orchestrator.py
"""
Tests for Master Team Orchestrator
"""
import pytest
from unittest.mock import AsyncMock, MagicMock

from app.services.master_team_orchestrator import MasterTeamOrchestrator


@pytest.mark.asyncio
async def test_execute_workflow_success():
    """测试工作流成功执行"""
    # 创建 mock repository
    mock_repo = MagicMock()

    # 创建 orchestrator
    orchestrator = MasterTeamOrchestrator(mock_repo)

    # 执行工作流
    result = await orchestrator.execute_workflow(
        "实现 AgentTeam 消息传递机制"
    )

    # 验证结果
    assert result["status"] == "completed"
    assert "requirements" in result["stages"]
    assert "architecture" in result["stages"]
    assert "implementation" in result["stages"]
    assert "qa" in result["stages"]
    assert len(result["errors"]) == 0
```

**Step 3: 运行测试**

```bash
cd backend
pytest tests/services/test_master_team_orchestrator.py -v
```

预期输出：
```
test_execute_workflow_success PASSED
```

**Step 4: 提交**

```bash
git add backend/app/services/master_team_orchestrator.py tests/services/test_master_team_orchestrator.py
git commit -m "feat: add Master Team orchestrator service

Implement workflow orchestration logic:
- Sequential execution of 4 sub-teams
- Data passing between stages
- Error handling and status tracking
- Summary generation

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: 添加 API 端点

**Files:**
- Modify: `backend/app/api/routers/agent_teams.py`

**Step 1: 添加执行工作流的端点**

在文件末尾添加：

```python
@router.post(
    "/execute-workflow",
    summary="Execute Master Team workflow"
)
async def execute_workflow(
    requirement: str,
    service: AgentTeamService = Depends(get_agent_team_service)
):
    """
    执行 Master Team 工作流

    Args:
        requirement: 用户需求描述

    Returns:
        工作流执行结果
    """
    from app.services.master_team_orchestrator import MasterTeamOrchestrator

    orchestrator = MasterTeamOrchestrator(service.repository)
    result = await orchestrator.execute_workflow(requirement)

    return result
```

**Step 2: 测试 API 端点**

```bash
curl -X POST "http://localhost:8000/api/agent-teams/execute-workflow?requirement=实现消息传递机制" | python3 -m json.tool
```

预期输出：包含 status, stages, summary 的 JSON 响应

**Step 3: 提交**

```bash
git add backend/app/api/routers/agent_teams.py
git commit -m "feat: add workflow execution API endpoint

Add POST /api/agent-teams/execute-workflow endpoint
to trigger Master Team orchestration

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: 前端集成 - Dashboard 按钮

**Files:**
- Modify: `frontend/src/app/pages/Dashboard.tsx`

**Step 1: 添加 "启动开发流程" 按钮**

在 Quick Actions 部分添加新按钮：

```typescript
<button
  onClick={() => handleStartWorkflow()}
  className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-green-600/20 to-emerald-600/20 border border-green-500/30 hover:bg-white/5 transition-all text-left"
>
  <div className="w-10 h-10 rounded-xl bg-green-600 flex items-center justify-center text-white shrink-0">
    <Rocket size={20} />
  </div>
  <div>
    <p className="font-bold text-sm">Start Development Workflow</p>
    <p className="text-xs text-gray-400">Launch Master Team orchestration</p>
  </div>
</button>
```

**Step 2: 添加处理函数**

```typescript
const handleStartWorkflow = async () => {
  const requirement = prompt("请输入功能需求描述:");
  if (!requirement) return;

  try {
    const response = await fetch(
      `/api/agent-teams/execute-workflow?requirement=${encodeURIComponent(requirement)}`,
      { method: 'POST' }
    );
    const result = await response.json();

    alert(`工作流执行${result.status === 'completed' ? '成功' : '失败'}\n${result.summary}`);
  } catch (err) {
    alert('执行失败: ' + err.message);
  }
};
```

**Step 3: 测试功能**

1. 打开 Dashboard
2. 点击 "Start Development Workflow" 按钮
3. 输入需求描述
4. 验证工作流执行

**Step 4: 提交**

```bash
git add frontend/src/app/pages/Dashboard.tsx
git commit -m "feat: add workflow execution button to Dashboard

Add Quick Action button to trigger Master Team workflow
from Dashboard UI

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: 文档和使用说明

**Files:**
- Create: `docs/agent-teams-usage.md`

**Step 1: 创建使用文档**

```markdown
# Agent Teams 使用指南

## 概述

Agent Teams 是 Claude Manager 的核心功能，提供自动化的开发流程调度系统。

## 团队结构

### Master Team (主控团队)
- **名称**: agentteam-collaboration-master
- **职责**: 协调和调度子团队
- **成员**: general-purpose (Team Lead), plan (Process Manager)

### Sub Teams (子团队)

1. **Requirements Analysis Team** (需求分析团队)
   - 代码库分析、需求澄清、依赖识别

2. **Architecture Design Team** (架构设计团队)
   - 技术方案设计、架构评估、接口设计

3. **Implementation Team** (实现团队)
   - 代码实现、环境配置、单元测试

4. **Quality Assurance Team** (质量保证团队)
   - 代码审查、测试验证、文档审查

## 使用方法

### 通过 API 调用

```bash
curl -X POST "http://localhost:8000/api/agent-teams/execute-workflow" \
  -H "Content-Type: application/json" \
  -d '{"requirement": "实现 AgentTeam 消息传递机制"}'
```

### 通过 Dashboard UI

1. 打开 Dashboard
2. 点击 "Start Development Workflow" 按钮
3. 输入功能需求描述
4. 等待工作流执行完成

## 工作流程

```
用户需求 → Master Team → Requirements Team → Architecture Team
→ Implementation Team → QA Team → Master Team → 完整报告
```

## 输出格式

```json
{
  "status": "completed",
  "requirement": "用户需求描述",
  "started_at": "2026-02-24T10:00:00",
  "completed_at": "2026-02-24T10:30:00",
  "stages": {
    "requirements": {...},
    "architecture": {...},
    "implementation": {...},
    "qa": {...}
  },
  "summary": "工作流执行成功，完成 4 个阶段"
}
```

## 故障排除

### 问题: Agent 未找到
**解决**: 运行 `python backend/scripts/seed_agents.py` 创建必要的 Agents

### 问题: 工作流执行失败
**解决**: 检查日志文件 `backend/logs/app.log`，查看具体错误信息

## 未来扩展

- 支持并行执行
- 人工介入点
- 自定义工作流模板
```

**Step 2: 提交**

```bash
git add docs/agent-teams-usage.md
git commit -m "docs: add Agent Teams usage guide

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## 验证清单

完成所有任务后，验证以下内容：

- [ ] 数据库中存在 5 个 Agent Teams
- [ ] Master Team 包含正确的成员配置
- [ ] 子团队包含正确的成员配置
- [ ] API 端点 `/api/agent-teams/execute-workflow` 可正常调用
- [ ] Dashboard 显示 "Start Development Workflow" 按钮
- [ ] 点击按钮可触发工作流执行
- [ ] 工作流返回包含所有阶段的结果
- [ ] 文档完整且准确

## 后续优化

1. **实现真实的团队调用逻辑**（当前使用模拟数据）
2. **添加进度显示**（实时显示当前执行阶段）
3. **支持中断和恢复**（允许用户暂停工作流）
4. **集成 Workflow 引擎**（迁移到方案 A）
