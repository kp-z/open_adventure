"""
Claude Sync API Router

提供 Claude 环境同步和健康检查的 API 端点
"""
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
    """仅同步技能"""
    sync_service = SyncService(session)
    result = await sync_service.sync_skills()
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
    获取 Claude settings.json 配置

    Returns:
        Dict: settings.json 的完整内容
    """
    settings_file = settings.claude_config_dir / "settings.json"

    if not settings_file.exists():
        raise HTTPException(status_code=404, detail="settings.json not found")

    try:
        with open(settings_file, 'r', encoding='utf-8') as f:
            settings_data = json.load(f)
        return settings_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read settings.json: {str(e)}")


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
