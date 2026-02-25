"""
Settings API Router
配置管理 API 端点
"""
import json
from fastapi import APIRouter, HTTPException, status, Body
from typing import Dict, Any
from app.services.settings_service import SettingsService, ConfigValidationError
from app.core.logging import get_logger

router = APIRouter(prefix="/settings", tags=["settings"])
logger = get_logger(__name__)


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
