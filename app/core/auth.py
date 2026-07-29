"""
PayParity — JWT Authentication & Role-Based Access Control
"""
from datetime import datetime, timedelta, timezone
from typing import Optional
from uuid import UUID

import structlog
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db

logger = structlog.get_logger(__name__)

security = HTTPBearer()


# ── Role constants ─────────────────────────────────────────────────────────────
class Roles:
    ADMIN = "admin"
    ANALYST = "analyst"
    EXEC_COMMITTEE = "exec_committee"
    ALL = [ADMIN, ANALYST, EXEC_COMMITTEE]


# ── Token creation ─────────────────────────────────────────────────────────────
def create_access_token(
    subject: str,
    org_id: str,
    role: str,
    expires_delta: Optional[timedelta] = None,
) -> str:
    """Create a signed JWT access token."""
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    payload = {
        "sub": subject,
        "org_id": org_id,
        "role": role,
        "exp": expire,
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_token(token: str) -> dict:
    """Decode and validate a JWT token."""
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        return payload
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        ) from e


# ── Current user dependency ────────────────────────────────────────────────────
class CurrentUser:
    """Populated from JWT claims — no DB round-trip needed for every request."""
    def __init__(self, user_id: str, org_id: str, role: str):
        self.user_id = user_id
        self.org_id = org_id
        self.role = role


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> CurrentUser:
    payload = decode_token(credentials.credentials)
    user_id = payload.get("sub")
    org_id = payload.get("org_id")
    role = payload.get("role")
    if not user_id or not org_id or not role:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token claims",
        )
    return CurrentUser(user_id=user_id, org_id=org_id, role=role)


# ── Role guards ────────────────────────────────────────────────────────────────
def require_roles(*roles: str):
    """Dependency factory: raises 403 if user role not in allowed list."""
    async def _guard(current_user: CurrentUser = Depends(get_current_user)):
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{current_user.role}' is not authorized for this action.",
            )
        return current_user
    return _guard


require_admin = require_roles(Roles.ADMIN)
require_analyst = require_roles(Roles.ADMIN, Roles.ANALYST)
require_exec = require_roles(Roles.ADMIN, Roles.EXEC_COMMITTEE)
require_any = require_roles(*Roles.ALL)
