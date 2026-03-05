"""
Settings API Router
配置管理 API 端点
"""
import json
from fastapi import APIRouter, HTTPException, status, Body
from typing import Dict, Any, List
from pydantic import BaseModel, HttpUrl
from app.services.settings_service import SettingsService, ConfigValidationError
from app.services.marketplace_config_service import MarketplaceConfigService
from app.core.logging import get_logger

router = APIRouter(prefix="/settings", tags=["settings"])
logger = get_logger(__name__)


class MarketplaceRepoRequest(BaseModel):
    """Marketplace repository request model"""
    git_repo_url: str
    branch: str = "main"
    auto_update: bool = False


class MarketplaceRepoResponse(BaseModel):
    """Marketplace repository response model"""
    id: str
    git_repo_url: str
    branch: str
    auto_update: bool
    last_sync_time: str | None = None


@router.get("", response_model=Dict[str, Any])
async def get_settings():
    """
    获取 Claude 配置

    Returns:
        脱敏后的配置对象

    Raises:
        404: 配置文件不存在
        500: 服务器内部错误
    """
    try:
        service = SettingsService()
        settings = service.get_settings()

        logger.info("成功读取 Claude 配置")
        return {
            "success": True,
            "data": settings
        }

    except FileNotFoundError as e:
        logger.warning(f"配置文件不存在: {e}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "success": False,
                "error": "配置文件不存在",
                "message": str(e)
            }
        )

    except PermissionError as e:
        logger.error(f"配置文件权限不足: {e}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "success": False,
                "error": "无权限读取配置文件",
                "message": str(e)
            }
        )

    except json.JSONDecodeError as e:
        logger.error(f"配置文件 JSON 格式错误: {e}")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "success": False,
                "error": "配置文件格式错误",
                "message": f"JSON 解析失败: {str(e)}"
            }
        )

    except Exception as e:
        logger.error(f"读取配置失败: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "success": False,
                "error": "服务器内部错误",
                "message": str(e)
            }
        )


@router.put("", response_model=Dict[str, Any])
async def update_settings(updates: Dict[str, Any] = Body(...)):
    """
    更新 Claude 配置（部分更新）

    Args:
        updates: 要更新的配置字段

    Returns:
        更新后的配置对象（脱敏）

    Raises:
        400: 配置验证失败
        404: 配置文件不存在
        403: 文件权限不足
        500: 服务器内部错误
    """
    try:
        service = SettingsService()
        updated_settings = service.update_settings(updates)

        logger.info(f"成功更新 Claude 配置: {list(updates.keys())}")
        return {
            "success": True,
            "data": updated_settings,
            "message": "配置更新成功"
        }

    except ConfigValidationError as e:
        logger.warning(f"配置验证失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "success": False,
                "error": "配置验证失败",
                "message": str(e)
            }
        )

    except FileNotFoundError as e:
        logger.warning(f"配置文件不存在: {e}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "success": False,
                "error": "配置文件不存在",
                "message": str(e)
            }
        )

    except PermissionError as e:
        logger.error(f"配置文件权限不足: {e}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "success": False,
                "error": "无权限写入配置文件",
                "message": str(e)
            }
        )

    except IOError as e:
        logger.error(f"配置写入失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "success": False,
                "error": "配置写入失败",
                "message": str(e)
            }
        )

    except json.JSONDecodeError as e:
        logger.error(f"配置文件 JSON 格式错误: {e}")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "success": False,
                "error": "配置文件格式错误",
                "message": f"JSON 解析失败: {str(e)}"
            }
        )

    except Exception as e:
        logger.error(f"更新配置失败: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "success": False,
                "error": "服务器内部错误",
                "message": str(e)
            }
        )


@router.get("/marketplace-repos", response_model=List[MarketplaceRepoResponse])
async def get_marketplace_repos():
    """
    获取 Marketplace Plugins 配置列表

    Returns:
        Marketplace repository 配置列表
    """
    try:
        service = MarketplaceConfigService()
        repos = service.get_all_repos()

        logger.info(f"成功读取 {len(repos)} 个 Marketplace 配置")
        return repos

    except Exception as e:
        logger.error(f"读取 Marketplace 配置失败: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "success": False,
                "error": "服务器内部错误",
                "message": str(e)
            }
        )


@router.post("/marketplace-repos", response_model=MarketplaceRepoResponse)
async def add_marketplace_repo(repo_data: MarketplaceRepoRequest):
    """
    添加 Marketplace Plugin Repository

    Args:
        repo_data: Repository 配置

    Returns:
        添加的 Repository 配置
    """
    try:
        service = MarketplaceConfigService()
        repo = service.add_repo(
            git_repo_url=repo_data.git_repo_url,
            branch=repo_data.branch,
            auto_update=repo_data.auto_update
        )

        logger.info(f"成功添加 Marketplace 配置: {repo_data.git_repo_url}")
        return repo

    except ValueError as e:
        logger.warning(f"添加 Marketplace 配置失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "success": False,
                "error": "配置验证失败",
                "message": str(e)
            }
        )

    except Exception as e:
        logger.error(f"添加 Marketplace 配置失败: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "success": False,
                "error": "服务器内部错误",
                "message": str(e)
            }
        )


@router.delete("/marketplace-repos/{repo_id}")
async def delete_marketplace_repo(repo_id: str):
    """
    删除 Marketplace Plugin Repository

    Args:
        repo_id: Repository ID

    Returns:
        删除结果
    """
    try:
        service = MarketplaceConfigService()
        success = service.delete_repo(repo_id)

        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "success": False,
                    "error": "Repository 不存在",
                    "message": f"未找到 ID 为 {repo_id} 的 Repository"
                }
            )

        logger.info(f"成功删除 Marketplace 配置: {repo_id}")
        return {"success": True, "message": "删除成功"}

    except HTTPException:
        raise

    except Exception as e:
        logger.error(f"删除 Marketplace 配置失败: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "success": False,
                "error": "服务器内部错误",
                "message": str(e)
            }
        )


@router.post("/marketplace-repos/{repo_id}/sync")
async def sync_marketplace_repo(repo_id: str):
    """
    同步 Marketplace Plugin Repository（拉取并安装）

    Args:
        repo_id: Repository ID

    Returns:
        同步结果
    """
    try:
        service = MarketplaceConfigService()
        result = await service.sync_repo(repo_id)

        logger.info(f"成功同步 Marketplace 配置: {repo_id}")
        return {
            "success": True,
            "message": "同步成功",
            "data": result
        }

    except ValueError as e:
        logger.warning(f"同步 Marketplace 配置失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "success": False,
                "error": "Repository 不存在",
                "message": str(e)
            }
        )

    except Exception as e:
        logger.error(f"同步 Marketplace 配置失败: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "success": False,
                "error": "服务器内部错误",
                "message": str(e)
            }
        )
