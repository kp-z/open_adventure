"""Access guard middleware for internet-facing deployments.

When ACCESS_PASSWORD is set, all /api/* requests must carry a valid Bearer token.
Non-API paths (frontend static files) are always allowed through.
"""
from __future__ import annotations

import hashlib
import hmac

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

# Paths exempt from the access check (always allowed)
_EXEMPT_PREFIXES = (
    "/api/auth/access-token",
    "/api/system/health",
    "/docs",
    "/openapi.json",
    "/redoc",
)


def _derive_token(password: str) -> str:
    """Derive a deterministic access token from the password."""
    return hashlib.sha256(password.encode("utf-8")).hexdigest()[:32]


class AccessGuardMiddleware(BaseHTTPMiddleware):
    """Simple password-based access guard for internet exposure via frp/ngrok.

    Only protects /api/* routes. Frontend static files are served without
    restriction so the browser can load the app and show the password gate.
    """

    def __init__(self, app, password: str) -> None:
        super().__init__(app)
        self.valid_token = _derive_token(password)

    async def dispatch(self, request: Request, call_next):
        path = request.url.path

        # Non-API paths → always allow (frontend HTML/JS/CSS)
        if not path.startswith("/api"):
            return await call_next(request)

        # Exempt specific API endpoints
        if any(path.startswith(prefix) for prefix in _EXEMPT_PREFIXES):
            return await call_next(request)

        # Validate Bearer token
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
            if hmac.compare_digest(token, self.valid_token):
                return await call_next(request)

        return JSONResponse(
            {"detail": "Access password required"},
            status_code=401,
            headers={"X-Auth-Required": "access-password"},
        )
