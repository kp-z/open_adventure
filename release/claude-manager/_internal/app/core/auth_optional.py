"""
Optional authentication dependencies
"""
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_user_by_username, SECRET_KEY, ALGORITHM
from app.models.user import User

# Optional bearer token scheme
security = HTTPBearer(auto_error=False)


async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> Optional[User]:
    """
    Get current user if authenticated, otherwise return None.
    This allows endpoints to work both with and without authentication.
    """
    if not credentials:
        return None

    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            return None
    except JWTError:
        return None

    user = await get_user_by_username(db, username)
    return user


async def get_current_active_user_optional(
    current_user: Optional[User] = Depends(get_current_user_optional)
) -> Optional[User]:
    """Get current active user if authenticated, otherwise return None"""
    if current_user and not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user
