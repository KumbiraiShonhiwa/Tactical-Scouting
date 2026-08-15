"""VibeSec audit finding (medium): no response set any hardening headers at all. Verifies the
middleware in app/main.py's create_app() actually applies them on a real response, not just
that the code exists."""

from __future__ import annotations

from fastapi.testclient import TestClient


def test_response_includes_security_headers(client: TestClient) -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.headers["x-content-type-options"] == "nosniff"
    assert response.headers["x-frame-options"] == "DENY"
    assert response.headers["referrer-policy"] == "strict-origin-when-cross-origin"
    assert response.headers["content-security-policy"] == "default-src 'none'"
    assert (
        response.headers["strict-transport-security"]
        == "max-age=31536000; includeSubDomains"
    )
