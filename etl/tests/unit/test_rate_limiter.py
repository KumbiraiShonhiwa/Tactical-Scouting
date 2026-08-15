import httpx
import pytest

from scrapers.base import RateLimitedClient, RobotsChecker, RobotsDisallowedError
from scrapers.config import FOOTYSTATS

ALLOW_ALL_ROBOTS = "User-agent: *\nAllow: /\n"
DISALLOW_PLAYERS_QUERY = "User-agent: *\nDisallow: /players?*\n"


class FakeClock:
    """Deterministic clock — no real sleep in unit tests, per the pytest-testing skill."""

    def __init__(self) -> None:
        self.time = 0.0
        self.sleep_calls: list[float] = []

    def now(self) -> float:
        return self.time

    def sleep(self, seconds: float) -> None:
        self.sleep_calls.append(seconds)
        self.time += seconds


def _fake_response() -> httpx.Response:
    return httpx.Response(200, text="ok")


def test_first_request_does_not_wait() -> None:
    clock = FakeClock()
    robots = RobotsChecker(user_agent=FOOTYSTATS.user_agent, rules_text=ALLOW_ALL_ROBOTS)
    client = RateLimitedClient(source=FOOTYSTATS, robots=robots, clock=clock)

    client.get("https://footystats.org/clubs/x-1", lambda url, headers: _fake_response())

    assert clock.sleep_calls == []


def test_second_request_within_window_waits_remaining_time() -> None:
    clock = FakeClock()
    robots = RobotsChecker(user_agent=FOOTYSTATS.user_agent, rules_text=ALLOW_ALL_ROBOTS)
    client = RateLimitedClient(source=FOOTYSTATS, robots=robots, clock=clock)

    client.get("https://footystats.org/clubs/x-1", lambda url, headers: _fake_response())
    clock.time += 0.5  # only 0.5s elapsed, source requires 2s
    client.get("https://footystats.org/clubs/x-2", lambda url, headers: _fake_response())

    assert clock.sleep_calls == [pytest.approx(1.5)]


def test_request_after_full_window_does_not_wait() -> None:
    clock = FakeClock()
    robots = RobotsChecker(user_agent=FOOTYSTATS.user_agent, rules_text=ALLOW_ALL_ROBOTS)
    client = RateLimitedClient(source=FOOTYSTATS, robots=robots, clock=clock)

    client.get("https://footystats.org/clubs/x-1", lambda url, headers: _fake_response())
    clock.time += 5.0
    client.get("https://footystats.org/clubs/x-2", lambda url, headers: _fake_response())

    assert clock.sleep_calls == []


def test_disallowed_url_raises_without_making_request() -> None:
    clock = FakeClock()
    robots = RobotsChecker(user_agent=FOOTYSTATS.user_agent, rules_text=DISALLOW_PLAYERS_QUERY)
    client = RateLimitedClient(source=FOOTYSTATS, robots=robots, clock=clock)

    called = False

    def http_get(url: str, headers: dict[str, str]) -> httpx.Response:
        nonlocal called
        called = True
        return _fake_response()

    with pytest.raises(RobotsDisallowedError):
        client.get("https://footystats.org/players?search=x", http_get)

    assert called is False


def test_robots_checker_requires_load_before_use() -> None:
    robots = RobotsChecker(user_agent=FOOTYSTATS.user_agent)
    with pytest.raises(RuntimeError):
        robots.is_allowed("https://footystats.org/anything")
