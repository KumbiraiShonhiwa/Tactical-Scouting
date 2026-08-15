"""Regression test for a real bug Phase 6's Playwright E2E suite caught: the service had no
CORS configuration at all, so every request from a real browser (a different origin than the
API) failed at the preflight OPTIONS step — invisible to every prior test tier, since none of
them used a real browser (curl/httpx/pytest's TestClient don't enforce CORS)."""

from __future__ import annotations

from fastapi.testclient import TestClient


def test_preflight_request_from_allowed_origin_succeeds(client: TestClient) -> None:
    response = client.options(
        "/clubs/c1111111-1111-1111-1111-111111111111/recommendations",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:5173"


def test_preflight_request_from_disallowed_origin_is_rejected(client: TestClient) -> None:
    response = client.options(
        "/clubs/c1111111-1111-1111-1111-111111111111/recommendations",
        headers={
            "Origin": "http://evil.example.test",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert "access-control-allow-origin" not in response.headers
