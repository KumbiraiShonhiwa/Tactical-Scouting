"""JWKS-based Supabase JWT verification (ADD §4.2 — this service is not a second identity
provider; it verifies the same Supabase-issued JWT via the project's JWKS endpoint).

Confirmed against the local Supabase stack (2026-08-15): `/auth/v1/.well-known/jwks.json`
returns a real ES256 key, so JWKS-based verification (not a legacy HS256 shared secret) is
viable both locally and in production, matching docs/environment-and-secrets.md's committed
design (only `SUPABASE_JWKS_URL` is documented — no JWT-secret env var).
"""

from __future__ import annotations

import time
from collections.abc import Callable
from typing import Any

import httpx
from jose import JWTError, jwt


class TokenVerificationError(Exception):
    """Raised for any invalid token: expired, malformed, wrong audience, or bad signature."""


def _default_fetch(url: str) -> dict[str, Any]:
    response = httpx.get(url, timeout=10)
    response.raise_for_status()
    result: dict[str, Any] = response.json()
    return result


class JWKSCache:
    """Fetches and caches the JWKS with a short TTL — verifying a JWT should not mean
    re-fetching the JWKS on every request."""

    def __init__(
        self,
        jwks_url: str,
        ttl_seconds: float = 300,
        fetch_fn: Callable[[str], dict[str, Any]] | None = None,
        time_fn: Callable[[], float] = time.monotonic,
    ) -> None:
        self.jwks_url = jwks_url
        self.ttl_seconds = ttl_seconds
        self._fetch_fn = fetch_fn or _default_fetch
        self._time_fn = time_fn
        self._cached_keys: dict[str, Any] | None = None
        self._cached_at: float = float("-inf")

    def get_keys(self) -> dict[str, Any]:
        now = self._time_fn()
        if self._cached_keys is None or (now - self._cached_at) > self.ttl_seconds:
            self._cached_keys = self._fetch_fn(self.jwks_url)
            self._cached_at = now
        return self._cached_keys


def verify_token(
    token: str, jwks_cache: JWKSCache, audience: str = "authenticated"
) -> dict[str, Any]:
    """Returns the token's claims if valid; raises TokenVerificationError otherwise
    (expired, malformed, wrong-audience, or bad-signature tokens are all rejected here,
    before any route's business logic runs)."""
    try:
        keys = jwks_cache.get_keys()
        claims: dict[str, Any] = jwt.decode(
            token, keys, algorithms=["ES256", "RS256"], audience=audience
        )
        return claims
    except JWTError as exc:
        raise TokenVerificationError(str(exc)) from exc
