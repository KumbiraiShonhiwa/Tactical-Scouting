"""JWT verification unit tests with a locally generated test keypair — no real Supabase
project is ever touched, per Testing Documentation §3.2 ("unit tests with a locally generated
test keypair confirm expired, malformed, and wrong-audience tokens are all rejected")."""

from __future__ import annotations

import time

import pytest
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives.serialization import (
    Encoding,
    NoEncryption,
    PrivateFormat,
    PublicFormat,
)
from jose import jwk, jwt

from app.auth.jwt import JWKSCache, TokenVerificationError, verify_token

PRIVATE_KEY = rsa.generate_private_key(public_exponent=65537, key_size=2048)
PUBLIC_JWK = jwk.construct(
    PRIVATE_KEY.public_key().public_bytes(
        encoding=Encoding.PEM, format=PublicFormat.SubjectPublicKeyInfo
    ),
    algorithm="RS256",
).to_dict()
PUBLIC_JWK["kid"] = "test-key-1"

PRIVATE_PEM = PRIVATE_KEY.private_bytes(
    encoding=Encoding.PEM,
    format=PrivateFormat.PKCS8,
    encryption_algorithm=NoEncryption(),
)


def _make_cache() -> JWKSCache:
    return JWKSCache(
        jwks_url="https://example.test/jwks.json",
        fetch_fn=lambda _url: {"keys": [PUBLIC_JWK]},
    )


def _sign(claims: dict[str, object], headers: dict[str, str] | None = None) -> str:
    token: str = jwt.encode(
        claims, PRIVATE_PEM, algorithm="RS256", headers=headers or {"kid": "test-key-1"}
    )
    return token


def test_valid_token_is_verified() -> None:
    token = _sign({"sub": "user-1", "aud": "authenticated", "exp": int(time.time()) + 3600})
    claims = verify_token(token, _make_cache())
    assert claims["sub"] == "user-1"


def test_expired_token_is_rejected() -> None:
    token = _sign({"sub": "user-1", "aud": "authenticated", "exp": int(time.time()) - 10})
    with pytest.raises(TokenVerificationError):
        verify_token(token, _make_cache())


def test_wrong_audience_is_rejected() -> None:
    token = _sign({"sub": "user-1", "aud": "some-other-audience", "exp": int(time.time()) + 3600})
    with pytest.raises(TokenVerificationError):
        verify_token(token, _make_cache())


def test_malformed_token_is_rejected() -> None:
    with pytest.raises(TokenVerificationError):
        verify_token("not-a-real-jwt", _make_cache())


def test_token_signed_with_different_key_is_rejected() -> None:
    other_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    other_pem = other_key.private_bytes(
        encoding=Encoding.PEM, format=PrivateFormat.PKCS8, encryption_algorithm=NoEncryption()
    )
    token: str = jwt.encode(
        {"sub": "user-1", "aud": "authenticated", "exp": int(time.time()) + 3600},
        other_pem,
        algorithm="RS256",
        headers={"kid": "test-key-1"},
    )
    with pytest.raises(TokenVerificationError):
        verify_token(token, _make_cache())


def test_jwks_cache_reuses_cached_keys_within_ttl() -> None:
    calls = []

    def fetch(url: str) -> dict[str, object]:
        calls.append(url)
        return {"keys": [PUBLIC_JWK]}

    fake_time = [0.0]
    cache = JWKSCache(
        jwks_url="https://example.test/jwks.json",
        ttl_seconds=300,
        fetch_fn=fetch,
        time_fn=lambda: fake_time[0],
    )
    cache.get_keys()
    fake_time[0] = 100.0
    cache.get_keys()
    assert len(calls) == 1  # still within TTL, no re-fetch


def test_jwks_cache_refetches_after_ttl_expires() -> None:
    calls = []

    def fetch(url: str) -> dict[str, object]:
        calls.append(url)
        return {"keys": [PUBLIC_JWK]}

    fake_time = [0.0]
    cache = JWKSCache(
        jwks_url="https://example.test/jwks.json",
        ttl_seconds=300,
        fetch_fn=fetch,
        time_fn=lambda: fake_time[0],
    )
    cache.get_keys()
    fake_time[0] = 400.0
    cache.get_keys()
    assert len(calls) == 2
