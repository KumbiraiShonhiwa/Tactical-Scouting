"""Shared scraping infrastructure: rate limiting and robots.txt enforcement.

DC-07 requires respecting robots.txt and rate-limiting requests. The manual robots.txt checks
recorded in docs/data-ethics-compliance.md are a point-in-time record, not a running guarantee
against a source changing its rules later — so this module re-checks robots.txt at runtime
rather than only trusting the documented snapshot.
"""

from __future__ import annotations

import re
import time
from collections.abc import Callable
from dataclasses import dataclass, field
from typing import NamedTuple, Protocol
from urllib.parse import urlsplit

import httpx

from scrapers.config import SourceConfig


class ClockProtocol(Protocol):
    def now(self) -> float: ...
    def sleep(self, seconds: float) -> None: ...


class RealClock:
    """Default clock backed by wall time. Tests inject a fake clock instead of calling
    time.sleep for real, per the pytest-testing skill's "no real network/no real sleep in
    unit tests" expectation."""

    def now(self) -> float:
        return time.monotonic()

    def sleep(self, seconds: float) -> None:
        time.sleep(seconds)


class RobotsDisallowedError(RuntimeError):
    """Raised when a URL is disallowed by the source's robots.txt."""


class _Rule(NamedTuple):
    directive: str  # "allow" or "disallow"
    pattern: str
    regex: re.Pattern[str]


def _pattern_to_regex(pattern: str) -> re.Pattern[str]:
    """Translates a robots.txt path pattern to a regex, per the de-facto extension every
    major crawler (and every site checked in docs/data-ethics-compliance.md) relies on: '*'
    matches any sequence of characters, '$' anchors the end of the string, everything else
    (including '?') is literal.

    NOTE: this exists because Python's stdlib `urllib.robotparser` does NOT reliably honor
    '*' wildcards combined with a literal '?' in the same pattern (verified empirically: it
    fails to disallow FootyStats' documented '/players?*' rule). Trusting the stdlib here
    would silently under-enforce DC-07, so this module implements the match itself instead.
    """
    anchored_end = pattern.endswith("$")
    body = pattern[:-1] if anchored_end else pattern
    escaped = re.escape(body).replace(r"\*", ".*")
    return re.compile("^" + escaped + ("$" if anchored_end else ""))


class RobotsChecker:
    """Minimal robots.txt matcher: longest-matching-pattern wins (standard robots.txt
    precedence), ties broken in favor of Allow. Only the wildcard `User-agent: *` group is
    honored — none of the three sources this project scrapes have a rule specific to this
    project's own User-Agent, so a bot-specific-group lookup isn't needed."""

    def __init__(self, user_agent: str, rules_text: str | None = None) -> None:
        self._user_agent = user_agent
        self._rules: list[_Rule] = []
        self._loaded = False
        if rules_text is not None:
            self._parse(rules_text)

    def load_from_url(self, robots_url: str, fetch_fn: Callable[[str], str]) -> None:
        self._parse(fetch_fn(robots_url))

    def _parse(self, text: str) -> None:
        rules: list[_Rule] = []
        in_wildcard_group = False
        for raw_line in text.splitlines():
            line = raw_line.split("#", 1)[0].strip()
            if not line or ":" not in line:
                continue
            key, _, value = line.partition(":")
            key = key.strip().lower()
            value = value.strip()

            if key == "user-agent":
                in_wildcard_group = value == "*"
                continue
            if not in_wildcard_group:
                continue
            if key == "disallow" and value:
                rules.append(_Rule("disallow", value, _pattern_to_regex(value)))
            elif key == "allow" and value:
                rules.append(_Rule("allow", value, _pattern_to_regex(value)))

        self._rules = rules
        self._loaded = True

    def is_allowed(self, url: str) -> bool:
        if not self._loaded:
            raise RuntimeError("robots.txt rules not loaded — call load_from_url() first")

        path = urlsplit(url).path or "/"
        query = urlsplit(url).query
        full_path = f"{path}?{query}" if query else path

        best: _Rule | None = None
        for rule in self._rules:
            if not (rule.regex.match(full_path) or rule.regex.match(path)):
                continue
            is_longer = best is None or len(rule.pattern) > len(best.pattern)
            is_tied_allow = (
                best is not None
                and len(rule.pattern) == len(best.pattern)
                and rule.directive == "allow"
            )
            if is_longer or is_tied_allow:
                best = rule

        return best is None or best.directive == "allow"


@dataclass
class RateLimitedClient:
    """Enforces the source's minimum interval between requests and refuses to fetch any URL
    robots.txt disallows. The clock is injectable so unit tests never sleep for real."""

    source: SourceConfig
    robots: RobotsChecker
    clock: ClockProtocol = field(default_factory=RealClock)
    _last_request_at: float | None = field(default=None, init=False, repr=False)

    def get(
        self, url: str, http_get: Callable[[str, dict[str, str]], httpx.Response]
    ) -> httpx.Response:
        if not self.robots.is_allowed(url):
            raise RobotsDisallowedError(f"robots.txt disallows fetching {url}")

        if self._last_request_at is not None:
            elapsed = self.clock.now() - self._last_request_at
            remaining = self.source.rate_limit_seconds - elapsed
            if remaining > 0:
                self.clock.sleep(remaining)

        response = http_get(url, {"User-Agent": self.source.user_agent})
        self._last_request_at = self.clock.now()
        return response
