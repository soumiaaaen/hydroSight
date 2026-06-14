from typing import Literal

UserRole = Literal["user", "admin"]

USER_ROLE_ADMIN: UserRole = "admin"
USER_ROLE_USER: UserRole = "user"

VALID_USER_ROLES: frozenset[str] = frozenset({USER_ROLE_USER, USER_ROLE_ADMIN})


def normalize_user_role(role: str | None) -> UserRole:
    if role in VALID_USER_ROLES:
        return role  # type: ignore[return-value]
    return USER_ROLE_USER
