from fastapi import HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jwt import PyJWKClient
import jwt as pyjwt
import os

from api.guest_auth import decode_guest_token
from config.roles import USER_ROLE_ADMIN
from services.subscription_service import subscription_service

security = HTTPBearer()
SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
_jwks_client: PyJWKClient | None = None


def _get_jwks_client() -> PyJWKClient | None:
    global _jwks_client
    if not SUPABASE_URL:
        return None
    if _jwks_client is None:
        _jwks_client = PyJWKClient(f"{SUPABASE_URL.rstrip('/')}/auth/v1/.well-known/jwks.json")
    return _jwks_client


def verify_token(credentials: HTTPAuthorizationCredentials = Security(security)):
    token = credentials.credentials

    guest_payload = decode_guest_token(token)
    if guest_payload:
        return guest_payload

    jwks = _get_jwks_client()
    if not jwks:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    try:
        signing_key = jwks.get_signing_key_from_jwt(token)
        payload = pyjwt.decode(
            token,
            signing_key.key,
            algorithms=["ES256"],
            options={"verify_aud": False},
        )
        return payload
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


def get_principal_id(payload: dict = Security(verify_token)) -> str:
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token: missing subject")
    return str(user_id)


def get_user_id(payload: dict = Security(verify_token)) -> str:
    """Registered users only (rejects guest tokens)."""
    principal = payload.get("sub")
    if not principal:
        raise HTTPException(status_code=401, detail="Invalid token: missing subject")
    principal = str(principal)
    if principal.startswith("guest:"):
        raise HTTPException(
            status_code=403,
            detail="This action requires a registered account.",
        )
    return principal


def require_admin(user_id: str = Security(get_user_id)) -> str:
    """Registered users with profiles.role = admin."""
    role = subscription_service.get_user_role(user_id)
    if role != USER_ROLE_ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required.")
    return user_id
