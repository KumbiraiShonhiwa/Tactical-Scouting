"""FastAPI auth dependencies: optional-JWT (public routes accept anon or authenticated) and
require_admin (JWT + public.profiles.role = 'admin', checked via the same rule RLS uses — a
query, not a reimplementation of the privilege logic, per ADD §4.2).
"""

from __future__ import annotations

import os
from functools import lru_cache
from typing import Annotated, Any

from fastapi import Depends, Header

from app.auth.jwt import JWKSCache, TokenVerificationError, verify_token
from app.db import get_connection
from app.errors import forbidden, unauthorized


@lru_cache
def get_jwks_cache() -> JWKSCache:
    return JWKSCache(jwks_url=os.environ["SUPABASE_JWKS_URL"])


def get_optional_claims(
    authorization: Annotated[str | None, Header()] = None,
    jwks_cache: JWKSCache = Depends(get_jwks_cache),
) -> dict[str, Any] | None:
    """Returns claims for a valid bearer token, or None for no-auth (anon) requests. Raises
    401 for a present-but-invalid token — a request that *tries* to authenticate and fails is
    not silently treated as anonymous."""
    if authorization is None:
        return None
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise unauthorized("Authorization header must be 'Bearer <token>'")
    try:
        return verify_token(token, jwks_cache)
    except TokenVerificationError as exc:
        raise unauthorized(str(exc)) from exc


def require_admin(
    claims: dict[str, Any] | None = Depends(get_optional_claims),
) -> dict[str, Any]:
    if claims is None:
        raise unauthorized()

    user_id = claims.get("sub")
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("select role from public.profiles where id = %s", (user_id,))
            row = cur.fetchone()
    finally:
        conn.close()

    if row is None or row[0] != "admin":
        raise forbidden()

    return claims
