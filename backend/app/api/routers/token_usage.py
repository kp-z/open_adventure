"""
Token Usage API Router
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

from app.services.token_usage_service import TokenUsageService
from app.core.logging import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/token-usage", tags=["token-usage"])


class TokenUsageResponse(BaseModel):
    """Token 使用情况响应"""
    used: int
    total: int
    remaining: int
    percentage: float
    last_updated: str
    warning: Optional[str] = None
    source: Optional[str] = None


@router.get("", response_model=TokenUsageResponse)
async def get_token_usage():
    """
    获取 Claude token 使用情况

    Returns:
        TokenUsageResponse: Token 使用情况
    """
    try:
        # 使用 TokenUsageService 获取真实数据
        service = TokenUsageService()
        usage = service.get_token_usage()

        return TokenUsageResponse(**usage)
    except Exception as e:
        logger.error(f"Failed to get token usage: {e}")
        raise HTTPException(status_code=500, detail=str(e))
