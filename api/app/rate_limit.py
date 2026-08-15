"""Fixed-window rate limiting (3.2.4), applied globally via a FastAPI app-level dependency.

Replaces an earlier slowapi-based implementation: slowapi's SlowAPIMiddleware locates the
matched route by walking `app.routes` looking for objects with an `.endpoint` attribute
(`slowapi/middleware.py::_find_route_handler`). The installed FastAPI version (0.141.1) wraps
routers added via `include_router` in an internal `_IncludedRouter` object that has no such
attribute, so slowapi's lookup always returned `None` and treated every route as exempt from
rate limiting — a real, previously undetected gap: default_limits was configured but never
actually enforced. Caught by api/tests/integration/test_rate_limit.py, which failed even though
the "feature" had shipped since Phase 3. Fixed by removing the slowapi dependency entirely
rather than working around a fragile, version-sensitive internal-API assumption in a
third-party library — this module doesn't introspect FastAPI's route tree at all, so it can't
break the same way again.
"""

from __future__ import annotations

import os
import time
from collections import defaultdict

from fastapi import Request

from app.errors import rate_limited

WINDOW_SECONDS = 60.0


class FixedWindowRateLimiter:
    def __init__(self, limit_per_minute: int) -> None:
        self.limit_per_minute = limit_per_minute
        self._windows: dict[str, tuple[float, int]] = defaultdict(lambda: (0.0, 0))

    def check(self, key: str, now: float | None = None) -> bool:
        """Returns True if the request is allowed, False if it should be rejected."""
        now = time.monotonic() if now is None else now
        window_start, count = self._windows[key]

        if now - window_start >= WINDOW_SECONDS:
            self._windows[key] = (now, 1)
            return True

        if count >= self.limit_per_minute:
            return False

        self._windows[key] = (window_start, count + 1)
        return True

    def reset(self) -> None:
        self._windows.clear()


def _client_key(request: Request) -> str:
    if request.client is None or not request.client.host:
        return "unknown"
    return request.client.host


def get_rate_limiter() -> FixedWindowRateLimiter:
    # Constructed once per app instance (see app/main.py) so state.rate_limiter persists across
    # requests within a process, same lifecycle slowapi's in-memory storage had.
    return FixedWindowRateLimiter(int(os.environ.get("RATE_LIMIT_PER_MINUTE", 60)))


def enforce_rate_limit(request: Request) -> None:
    limiter: FixedWindowRateLimiter = request.app.state.rate_limiter
    if not limiter.check(_client_key(request)):
        raise rate_limited()
