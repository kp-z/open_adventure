"""
Claude Sync API Router

提供 Claude 环境同步和健康检查的 API 端点
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.services.sync_service import SyncService
from app.services.prompt_optimizer_service import PromptOptimizerService, OptimizerMode
from app.adapters.claude import ClaudeAdapter
from app.adapters.claude.cli_client import ClaudeCliClient
from app.config.settings import settings

router = APIRouter(prefix="/claude", tags=["claude"])


class ClaudeSettingsUpdate(BaseModel):
    """Claude settings.json 更新模型"""
    env: Dict[str, str] | None = None
    permissions: Dict[str, list[str]] | None = None
    model: str | None = None
    enabledPlugins: Dict[str, bool] | None = None
    language: str | None = None
    effortLevel: str | None = None


class PromptOptimizeRequest(BaseModel):
    """Prompt 优化请求模型"""
    prompt: str
    context: str | None = None
    mode: str = "rule"  # "ai" 或 "rule"，默认使用规则模式


class PromptOptimizeResponse(BaseModel):
    """Prompt 优化响应模型"""
    original_prompt: str
    optimized_prompt: str
    analysis: str
    mode: str  # 使用的模式：ai 或 rule
    success: bool
    error: str | None = None


@router.post("/sync")
async def sync_claude_data(session: AsyncSession = Depends(get_db)):
    """
    同步 Claude 环境数据到数据库

    扫描本地 Claude Code 文件系统，将 skills/agents/agent teams 同步到数据库
    """
    sync_service = SyncService(session)
    result = await sync_service.sync_all()
    return result


@router.post("/sync/skills")
async def sync_skills(session: AsyncSession = Depends(get_db)):
    """仅同步技能，并自动分类"""
    import re
    import asyncio
    import os
    from app.repositories.skill_repository import SkillRepository
    from app.services.skill_service import SkillService
    from app.schemas.skill import SkillUpdate
    from app.core.logging import get_logger

    logger = get_logger(__name__)

    sync_service = SyncService(session)
    result = await sync_service.sync_skills()

    # 同步完成后，自动对所有未分类的 Skills 进行批量分类
    try:
        repository = SkillRepository(session)
        service = SkillService(repository)

        # 获取所有 Skills
        skills_response = await service.list_skills(skip=0, limit=10000)
        skills = skills_response.items

        # 筛选出未分类的 Skills（没有 category: 标签）
        unclassified_skills = [
            skill for skill in skills
            if not any(tag.startswith("category:") for tag in (skill.tags or []))
        ]

        if unclassified_skills:
            logger.info(f"Found {len(unclassified_skills)} unclassified skills, starting batch classification...")

            # 构建批量分类 prompt
            skills_info = []
            for skill in unclassified_skills:
                skills_info.append({
                    "id": skill.id,
                    "name": skill.name,
                    "description": skill.description
                })

            prompt = f"""使用 skill_classifier 对以下 {len(unclassified_skills)} 个 Skills 进行批量分类。

Skills 列表：
{json.dumps(skills_info, ensure_ascii=False, indent=2)}

请为每个 Skill 返回分类标签列表，格式为 JSON 对象，例如：
{{
  "1": ["category:data-processing", "category:automation"],
  "2": ["category:debugging"],
  "3": ["category:ai-enhancement"]
}}

只返回 JSON 对象，不要添加其他说明。"""

            # 调用 Claude CLI
            cli_path = settings.claude_cli_path
            cmd = [
                cli_path,
                "-p", prompt,
                "--output-format", "text",
                "--disable-slash-commands",
                "--setting-sources", "user"
            ]

            logger.info(f"Calling Claude CLI for batch classification...")

            # 清除环境变量
            env = os.environ.copy()
            env.pop('CLAUDECODE', None)
            env.pop('CLAUDE_CODE', None)

            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                env=env
            )

            try:
                stdout, stderr = await asyncio.wait_for(
                    process.communicate(),
                    timeout=180  # 3分钟超时
                )
            except asyncio.TimeoutError:
                process.kill()
                await process.wait()
                logger.warning("Batch classification timeout")
                return result

            if process.returncode != 0:
                error_msg = stderr.decode("utf-8") if stderr else "未知错误"
                logger.error(f"Claude CLI error: {error_msg}")
                return result

            output = stdout.decode("utf-8")
            logger.info(f"Batch classification output length: {len(output)} chars")

            # 解析分类结果
            classifications = {}

            # 尝试从输出中提取 JSON 对象
            json_match = re.search(r'\{[\s\S]*?\}', output)
            if json_match:
                try:
                    classifications = json.loads(json_match.group(0))
                    logger.info(f"Parsed classifications for {len(classifications)} skills")
                except json.JSONDecodeError:
                    logger.warning(f"Failed to parse classifications JSON")

            # 更新每个 Skill 的 tags
            classified_count = 0
            for skill in unclassified_skills:
                skill_id_str = str(skill.id)
                if skill_id_str in classifications:
                    categories = classifications[skill_id_str]

                    # 确保所有标签都有 category: 前缀
                    categories = [
                        cat if cat.startswith("category:") else f"category:{cat}"
                        for cat in categories
                    ]

                    # 更新 Skill 的 tags
                    current_tags = skill.tags or []
                    # 移除旧的 category: 标签
                    non_category_tags = [tag for tag in current_tags if not tag.startswith("category:")]
                    # 添加新的分类标签
                    new_tags = non_category_tags + categories

                    # 更新数据库
                    skill_update = SkillUpdate(tags=new_tags)
                    await service.update_skill(skill.id, skill_update)
                    classified_count += 1
                    logger.info(f"Classified skill {skill.name} with categories: {categories}")

            logger.info(f"Batch classification completed: {classified_count}/{len(unclassified_skills)} skills classified")
            result["classified_skills"] = classified_count
        else:
            logger.info("All skills are already classified")
            result["classified_skills"] = 0

    except Exception as e:
        logger.error(f"Error during batch classification: {e}")
        # 分类失败不影响同步结果

    return result


@router.post("/sync/agents")
async def sync_agents(session: AsyncSession = Depends(get_db)):
    """仅同步智能体"""
    sync_service = SyncService(session)
    result = await sync_service.sync_agents()
    return result


@router.post("/sync/agent-teams")
async def sync_agent_teams(session: AsyncSession = Depends(get_db)):
    """仅同步智能体队伍"""
    sync_service = SyncService(session)
    result = await sync_service.sync_agent_teams()
    return result


@router.get("/health")
async def check_claude_health():
    """
    检查 Claude 环境健康状态

    检查 Claude CLI 是否可用、配置目录是否可读等
    """
    adapter = ClaudeAdapter()
    health = await adapter.check_health()
    return health


@router.get("/settings")
async def get_claude_settings():
    """
    获取 Claude 配置（支持 settings.json 和 cc-switch）

    自动检测并返回当前生效的配置源，优先显示生效的配置

    Returns:
        Dict: 包含配置数据和元信息
        {
            "active_source": "cc-switch" | "settings.json" | "none",
            "cc_switch": {...} | null,  # cc-switch 配置（如果存在）
            "settings_json": {...} | null,  # settings.json 配置（如果存在）
            "active_config": {...}  # 当前生效的配置
        }
    """
    result = {
        "active_source": "none",
        "cc_switch": None,
        "settings_json": None,
        "active_config": {}
    }

    # 1. 尝试读取 cc-switch 配置
    cc_switch_db = Path.home() / ".cc-switch" / "cc-switch.db"
    if cc_switch_db.exists():
        try:
            import sqlite3
            conn = sqlite3.connect(str(cc_switch_db))
            cursor = conn.cursor()

            # 查询当前激活的 provider（is_current = 1）
            cursor.execute("""
                SELECT id, app_type, name, settings_config, provider_type
                FROM providers
                WHERE app_type = 'claude' AND is_current = 1
                LIMIT 1
            """)

            row = cursor.fetchone()
            if row:
                provider_id, app_type, provider_name, settings_config_str, provider_type = row

                # 解析 settings_config JSON
                settings_config = json.loads(settings_config_str)

                result["cc_switch"] = {
                    "provider_id": provider_id,
                    "provider_name": provider_name,
                    "provider_type": provider_type or "custom",
                    "config": settings_config
                }
                result["active_source"] = "cc-switch"
                result["active_config"] = settings_config

            conn.close()
        except Exception as e:
            logger.warning(f"Failed to read cc-switch config: {e}")
            # 不抛出异常，继续尝试读取 settings.json

    # 2. 尝试读取 settings.json
    settings_file = settings.claude_config_dir / "settings.json"
    if settings_file.exists():
        try:
            with open(settings_file, 'r', encoding='utf-8') as f:
                settings_data = json.load(f)

            result["settings_json"] = settings_data

            # 如果 cc-switch 不存在或未激活，则 settings.json 为生效配置
            if result["active_source"] == "none":
                result["active_source"] = "settings.json"
                result["active_config"] = settings_data
        except Exception as e:
            logger.warning(f"Failed to read settings.json: {e}")

    # 3. 如果两者都不存在，返回错误
    if result["active_source"] == "none":
        raise HTTPException(
            status_code=404,
            detail="No Claude configuration found (neither cc-switch nor settings.json)"
        )

    return result


@router.put("/settings")
async def update_claude_settings(update: ClaudeSettingsUpdate):
    """
    更新 Claude settings.json 配置

    Args:
        update: 要更新的配置项（只更新提供的字段）

    Returns:
        Dict: 更新后的完整配置
    """
    settings_file = settings.claude_config_dir / "settings.json"

    if not settings_file.exists():
        raise HTTPException(status_code=404, detail="settings.json not found")

    try:
        # 读取现有配置
        with open(settings_file, 'r', encoding='utf-8') as f:
            current_settings = json.load(f)

        # 更新提供的字段
        update_dict = update.model_dump(exclude_none=True)
        for key, value in update_dict.items():
            if key == 'permissions' and value is not None:
                # 权限需要合并，不是替换
                if 'permissions' not in current_settings:
                    current_settings['permissions'] = {}
                current_settings['permissions'].update(value)
            elif key == 'env' and value is not None:
                # 环境变量需要合并
                if 'env' not in current_settings:
                    current_settings['env'] = {}
                current_settings['env'].update(value)
            elif key == 'enabledPlugins' and value is not None:
                # 插件配置需要合并
                if 'enabledPlugins' not in current_settings:
                    current_settings['enabledPlugins'] = {}
                current_settings['enabledPlugins'].update(value)
            else:
                current_settings[key] = value

        # 写回文件
        with open(settings_file, 'w', encoding='utf-8') as f:
            json.dump(current_settings, f, indent=2, ensure_ascii=False)

        return current_settings
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update settings.json: {str(e)}")


@router.post("/optimize-prompt", response_model=PromptOptimizeResponse)
async def optimize_prompt(request: PromptOptimizeRequest):
    """
    优化用户输入的 prompt

    支持两种模式：
    - rule: 基于规则的本地优化（默认，不需要 API Key）
    - ai: 使用 Anthropic API 进行 AI 优化（需要配置 API Key）

    Args:
        request: 包含原始 prompt、可选上下文和优化模式的请求

    Returns:
        PromptOptimizeResponse: 包含原始和优化后的 prompt 及分析说明
    """
    try:
        # 根据请求的模式选择优化器
        mode = OptimizerMode.AI if request.mode == "ai" else OptimizerMode.RULE

        # 创建优化器
        optimizer = PromptOptimizerService(mode=mode)

        # 执行优化
        result = await optimizer.optimize_prompt(
            prompt=request.prompt,
            context=request.context
        )

        return PromptOptimizeResponse(
            original_prompt=request.prompt,
            optimized_prompt=result["optimized_prompt"],
            analysis=result["analysis"],
            mode=result["mode"],
            success=result["success"],
            error=result["error"]
        )
    except Exception as e:
        # 如果 AI 模式失败，自动降级到规则模式
        if request.mode == "ai":
            try:
                optimizer = PromptOptimizerService(mode=OptimizerMode.RULE)
                result = await optimizer.optimize_prompt(
                    prompt=request.prompt,
                    context=request.context
                )
                return PromptOptimizeResponse(
                    original_prompt=request.prompt,
                    optimized_prompt=result["optimized_prompt"],
                    analysis=f"AI 模式失败，已降级到规则模式\n\n{result['analysis']}",
                    mode="rule",
                    success=True,
                    error=None
                )
            except Exception as fallback_error:
                return PromptOptimizeResponse(
                    original_prompt=request.prompt,
                    optimized_prompt=request.prompt,
                    analysis="",
                    mode="rule",
                    success=False,
                    error=str(fallback_error)
                )

        return PromptOptimizeResponse(
            original_prompt=request.prompt,
            optimized_prompt=request.prompt,
            analysis="",
            mode=request.mode,
            success=False,
            error=str(e)
        )
