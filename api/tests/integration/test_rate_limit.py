"""SEC-004 (Testing Documentation §6.2/§10): "A lightweight rate-limit test confirms public
endpoints reject burst traffic beyond the configured threshold." RATE_LIMIT_PER_MINUTE is
enforced via app/rate_limit.py's app-level dependency — this proves it actually rejects, not
just that the config value exists. It's also the test that originally caught the earlier
slowapi-based implementation silently never enforcing anything at all (see
app/rate_limit.py's module docstring).

Resets the shared in-memory limiter state before and after so this test's burst doesn't leak
into (or get contaminated by) any other integration test sharing the same pytest session.
"""

from __future__ import annotations

import os

from fastapi.testclient import TestClient

from app.main import app


def test_public_endpoint_rejects_burst_traffic_beyond_configured_limit(
    client: TestClient,
) -> None:
    app.state.rate_limiter.reset()
    try:
        limit = int(os.environ.get("RATE_LIMIT_PER_MINUTE", 60))

        responses = [client.get("/health") for _ in range(limit + 1)]

        assert all(r.status_code == 200 for r in responses[:limit])

        last = responses[-1]
        assert last.status_code == 429
        body = last.json()
        assert body["error"]["code"] == "rate_limited"
    finally:
        app.state.rate_limiter.reset()
