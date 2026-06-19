"""Authentication helpers: bcrypt + JWT (httpOnly cookies, with Bearer fallback)."""
import os
import bcrypt
import jwt
from datetime import datetime, timezone, timedelta
from fastapi import HTTPException, Depends, Request, Response
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_session
from models_sql import User
from schemas import UserOut

JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_HOURS = 8
REFRESH_TOKEN_DAYS = 7
ACCESS_COOKIE = "access_token"
REFRESH_COOKIE = "refresh_token"
bearer_scheme = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def _secret() -> str:
    return os.environ["JWT_SECRET"]


def create_access_token(user_id: str, role: str) -> str:
    payload = {
        "sub": user_id, "role": role, "type": "access",
        "exp": datetime.now(timezone.utc) + timedelta(hours=ACCESS_TOKEN_HOURS),
    }
    return jwt.encode(payload, _secret(), algorithm=JWT_ALGORITHM)


def create_refresh_token(user_id: str) -> str:
    payload = {
        "sub": user_id, "type": "refresh",
        "exp": datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_DAYS),
    }
    return jwt.encode(payload, _secret(), algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, _secret(), algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


def set_auth_cookies(response: Response, access: str, refresh: str) -> None:
    secure = os.environ.get("COOKIE_SECURE", "true").lower() == "true"
    response.set_cookie(ACCESS_COOKIE, access, httponly=True, secure=secure, samesite="none",
                        max_age=ACCESS_TOKEN_HOURS * 3600, path="/")
    response.set_cookie(REFRESH_COOKIE, refresh, httponly=True, secure=secure, samesite="none",
                        max_age=REFRESH_TOKEN_DAYS * 86400, path="/")


def clear_auth_cookies(response: Response) -> None:
    secure = os.environ.get("COOKIE_SECURE", "true").lower() == "true"
    response.delete_cookie(ACCESS_COOKIE, path="/", samesite="none", secure=secure)
    response.delete_cookie(REFRESH_COOKIE, path="/", samesite="none", secure=secure)


async def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_session),
) -> UserOut:
    token = request.cookies.get(ACCESS_COOKIE)
    if not token and credentials is not None:
        token = credentials.credentials
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = decode_token(token)
    if payload.get("type") != "access":
        raise HTTPException(status_code=401, detail="Invalid token type")
    user = (await db.execute(select(User).where(User.id == payload["sub"]))).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return UserOut.model_validate(user)


def require_roles(*roles: str):
    async def checker(user: UserOut = Depends(get_current_user)) -> UserOut:
        if user.role not in roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return user
    return checker
