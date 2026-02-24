"""
AgentTeam API Router
"""
import asyncio
import json
import re
from typing import Optional, List
from fastapi import APIRouter, Depends, Query, status, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, Field

from app.core.database import get_db
from app.repositories.agent_team_repository import AgentTeamRepository
from app.services.agent_team_service import AgentTeamService
from app.schemas.agent_team import AgentTeamCreate, AgentTeamUpdate, AgentTeamResponse, AgentTeamListResponse, AgentTeamMember
from app.config.settings import settings
from app.core.logging import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/agent-teams", tags=["agent-teams"])


# ============ AI 生成相关 Schema ============

class TeamGenerateRequest(BaseModel):
    """Claude AI 生成 Team 请求"""
    description: str = Field(..., description="自然语言描述团队需求")
    member_count: Optional[int] = Field(3, description="期望的成员数量", ge=2, le=10)
    save_immediately: bool = Field(False, description="是否直接保存到数据库")


class TeamGenerateResponse(BaseModel):
    """Claude AI 生成 Team 响应"""
    success: bool
    team: AgentTeamCreate
    message: str


# Claude AI 生成 Team 的系统 Prompt
TEAM_CREATOR_SYSTEM_PROMPT = '''你是一个 Agent Team 配置专家。根据用户描述生成团队配置。

## 输出格式要求
请严格按照以下 JSON 格式输出，不要添加任何其他文字：
```json
{
  "name": "team-name-kebab-case",
  "description": "团队描述",
  "members": [
    {"agent_name": "general-purpose", "role": "Lead Developer", "priority": 1},
    {"agent_name": "explore", "role": "Researcher", "priority": 2}
  ],
  "tags": ["frontend", "development"]
}
```

## 可用的 Agent 类型
- general-purpose: 通用型 Agent，适合大多数任务
- explore: 探索型 Agent，擅长代码库分析
- plan: 规划型 Agent，擅长制定实施计划
- bash: 命令行专家
- code-reviewer: 代码审查专家
- code-simplifier: 代码简化专家

注意事项：
1. name 使用 kebab-case 格式
2. members 数组中的 agent_name 必须从上述可用类型中选择
3. role 描述成员在团队中的职责
4. priority 从 1 开始递增，数字越小优先级越高
5. tags 应该反映团队的技术栈或领域'''


def get_agent_team_service(db: AsyncSession = Depends(get_db)) -> AgentTeamService:
    """Dependency to get agent team service"""
    repository = AgentTeamRepository(db)
    return AgentTeamService(repository)


@router.post(
    "",
    response_model=AgentTeamResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new agent team"
)
async def create_agent_team(
    team_data: AgentTeamCreate,
    service: AgentTeamService = Depends(get_agent_team_service)
):
    """Create a new agent team"""
    return await service.create_team(team_data)


@router.get(
    "",
    response_model=AgentTeamListResponse,
    summary="List all agent teams"
)
async def list_agent_teams(
    skip: int = Query(0, ge=0, description="Number of items to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Number of items to return"),
    service: AgentTeamService = Depends(get_agent_team_service)
):
    """List all agent teams with pagination"""
    return await service.list_teams(skip=skip, limit=limit)


@router.get(
    "/search",
    response_model=AgentTeamListResponse,
    summary="Search agent teams"
)
async def search_agent_teams(
    q: str = Query(..., min_length=1, description="Search query"),
    skip: int = Query(0, ge=0, description="Number of items to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Number of items to return"),
    service: AgentTeamService = Depends(get_agent_team_service)
):
    """Search agent teams by name or description"""
    return await service.search_teams(query=q, skip=skip, limit=limit)


@router.get(
    "/{team_id}",
    response_model=AgentTeamResponse,
    summary="Get agent team by ID"
)
async def get_agent_team(
    team_id: int,
    service: AgentTeamService = Depends(get_agent_team_service)
):
    """Get an agent team by ID"""
    return await service.get_team(team_id)


@router.put(
    "/{team_id}",
    response_model=AgentTeamResponse,
    summary="Update an agent team"
)
async def update_agent_team(
    team_id: int,
    team_data: AgentTeamUpdate,
    service: AgentTeamService = Depends(get_agent_team_service)
):
    """Update an agent team"""
    return await service.update_team(team_id, team_data)


@router.delete(
    "/{team_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete an agent team"
)
async def delete_agent_team(
    team_id: int,
    service: AgentTeamService = Depends(get_agent_team_service)
):
    """Delete an agent team"""
    await service.delete_team(team_id)


@router.post(
    "/generate-with-claude",
    response_model=TeamGenerateResponse,
    status_code=status.HTTP_200_OK,
    summary="使用 Claude AI 生成 Agent Team 配置"
)
async def generate_team_with_claude(
    request: TeamGenerateRequest,
    service: AgentTeamService = Depends(get_agent_team_service)
):
    """
    使用 Claude Code CLI 生成完整的 Agent Team 配置。
    """
    try:
        # 构建 prompt
        full_prompt = f"{TEAM_CREATOR_SYSTEM_PROMPT}\n\n## 用户需求\n{request.description}\n\n期望成员数量：{request.member_count}"

        # 调用 Claude CLI
        cli_path = settings.claude_cli_path
        cmd = [cli_path, "-p", full_prompt, "--output-format", "text", "--disable-slash-commands", "--setting-sources", "user"]

        logger.info(f"Calling Claude CLI to generate team: {request.description[:50]}...")

        import os
        env = os.environ.copy()
        env.pop('CLAUDECODE', None)
        env.pop('CLAUDE_CODE', None)

        process = await asyncio.create_subprocess_exec(*cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE, env=env)

        try:
            stdout, stderr = await asyncio.wait_for(process.communicate(), timeout=120)
        except asyncio.TimeoutError:
            process.kill()
            await process.wait()
            raise HTTPException(status_code=504, detail="Claude CLI 调用超时")

        if process.returncode != 0:
            error_msg = stderr.decode("utf-8") if stderr else "未知错误"
            logger.error(f"Claude CLI error: {error_msg}")
            raise HTTPException(status_code=500, detail=f"Claude CLI 调用失败: {error_msg}")

        output = stdout.decode("utf-8")
        logger.info(f"Claude CLI output length: {len(output)} chars")

        # 解析 JSON
        team_data = None
        json_match = re.search(r'```json\s*([\s\S]*?)\s*```', output)
        if json_match:
            try:
                team_data = json.loads(json_match.group(1))
                logger.info("Parsed JSON from code block")
            except json.JSONDecodeError:
                pass

        if not team_data:
            start_idx = output.find('{')
            if start_idx != -1:
                brace_count = 0
                end_idx = start_idx
                for i, char in enumerate(output[start_idx:], start_idx):
                    if char == '{':
                        brace_count += 1
                    elif char == '}':
                        brace_count -= 1
                        if brace_count == 0:
                            end_idx = i + 1
                            break
                if end_idx > start_idx:
                    try:
                        team_data = json.loads(output[start_idx:end_idx])
                        logger.info("Parsed JSON from brace matching")
                    except json.JSONDecodeError:
                        pass

        if not team_data:
            logger.error(f"Failed to parse JSON from output: {output[:500]}")
            raise HTTPException(status_code=500, detail="无法解析 Claude 输出")

        # 映射 agent_name 到 agent_id
        agent_name_to_id = {"general-purpose": 1, "explore": 2, "plan": 3, "bash": 4, "code-reviewer": 5, "code-simplifier": 6}
        members = []
        for member_data in team_data.get("members", []):
            agent_name = member_data.get("agent_name", "general-purpose")
            agent_id = agent_name_to_id.get(agent_name, 1)
            members.append(AgentTeamMember(agent_id=agent_id, role=member_data.get("role", "Member"), priority=member_data.get("priority", len(members) + 1)))

        team_create = AgentTeamCreate(name=team_data.get("name", "generated-team"), description=team_data.get("description", request.description), members=members, tags=team_data.get("tags", []), meta={})

        if request.save_immediately:
            await service.create_team(team_create)
            message = "Team 生成并保存成功"
        else:
            message = "Team 生成成功，请预览后保存"

        return TeamGenerateResponse(success=True, team=team_create, message=message)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to generate team: {e}")
        raise HTTPException(status_code=500, detail=f"生成失败: {str(e)}")
