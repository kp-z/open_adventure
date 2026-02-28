"""
Token Usage API Router
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

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


@router.get("", response_model=TokenUsageResponse)
async def get_token_usage():
    """
    获取 Claude token 使用情况

    Returns:
        TokenUsageResponse: Token 使用情况
    """
    try:
        # 直接返回测试数据以便显示水位线
        usage = {
            "used": 112311,
            "total": 200000,
            "remaining": 87689,
            "percentage": 56.16,
            "last_updated": "2026-02-28T13:12:00.000000"
        }

        return TokenUsageResponse(**usage)
    except Exception as e:
        logger.error(f"Failed to get token usage: {e}")
        raise HTTPException(status_code=500, detail=str(e))
