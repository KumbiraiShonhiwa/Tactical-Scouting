"""Unit tests for the fixed-window limiter itself (app/rate_limit.py) — no DB, no TestClient,
fast and isolated per CLAUDE.md §10's testing pyramid. The integration-tier test
(tests/integration/test_rate_limit.py) proves it's actually wired into the app; this proves the
windowing logic is correct in isolation."""

from __future__ import annotations

from app.rate_limit import FixedWindowRateLimiter


def test_allows_requests_up_to_the_limit() -> None:
    limiter = FixedWindowRateLimiter(limit_per_minute=3)
    assert limiter.check("client-a", now=0.0) is True
    assert limiter.check("client-a", now=1.0) is True
    assert limiter.check("client-a", now=2.0) is True


def test_rejects_requests_beyond_the_limit_within_the_same_window() -> None:
    limiter = FixedWindowRateLimiter(limit_per_minute=3)
    for t in range(3):
        assert limiter.check("client-a", now=float(t)) is True
    assert limiter.check("client-a", now=3.0) is False


def test_resets_after_the_window_elapses() -> None:
    limiter = FixedWindowRateLimiter(limit_per_minute=1)
    assert limiter.check("client-a", now=0.0) is True
    assert limiter.check("client-a", now=30.0) is False
    assert limiter.check("client-a", now=61.0) is True  # new 60s window


def test_tracks_each_client_key_independently() -> None:
    limiter = FixedWindowRateLimiter(limit_per_minute=1)
    assert limiter.check("client-a", now=0.0) is True
    assert limiter.check("client-b", now=0.0) is True
    assert limiter.check("client-a", now=0.1) is False
    assert limiter.check("client-b", now=0.1) is False


def test_reset_clears_all_client_windows() -> None:
    limiter = FixedWindowRateLimiter(limit_per_minute=1)
    limiter.check("client-a", now=0.0)
    assert limiter.check("client-a", now=0.1) is False
    limiter.reset()
    assert limiter.check("client-a", now=0.2) is True
