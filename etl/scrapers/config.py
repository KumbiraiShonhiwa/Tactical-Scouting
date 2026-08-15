"""Per-source scraping configuration. Centralized here so rate limits, User-Agent, and base
URLs are defined once, not duplicated per scraper (mirrors the is_admin() centralization
pattern used in the Phase 1 schema).

Values are backed by docs/data-ethics-compliance.md's verified robots.txt findings — do not
change RATE_LIMIT_SECONDS below the documented floor without re-verifying robots.txt.
"""

from __future__ import annotations

from dataclasses import dataclass

USER_AGENT = (
    "TacticalScoutingBot/1.0 "
    "(+https://github.com/KumbiraiShonhiwa/Tactical-Scouting; "
    "educational/portfolio project, contact via repo issues)"
)


@dataclass(frozen=True)
class SourceConfig:
    name: str
    base_url: str
    rate_limit_seconds: float
    user_agent: str = USER_AGENT


# Rate limits per docs/data-ethics-compliance.md: no Crawl-delay is specified for the
# wildcard agent on any of these three sources, so a conservative 2s floor is applied to all
# (matching Transfermarkt's explicit Slurp Crawl-delay, used as the shared baseline).
FOOTYSTATS = SourceConfig(
    name="footystats",
    base_url="https://footystats.org",
    rate_limit_seconds=2.0,
)

WHOSCORED = SourceConfig(
    name="whoscored",
    base_url="https://www.whoscored.com",
    rate_limit_seconds=2.0,
)

TRANSFERMARKT = SourceConfig(
    name="transfermarkt",
    base_url="https://www.transfermarkt.com",
    rate_limit_seconds=2.0,
)

SOURCES: dict[str, SourceConfig] = {
    FOOTYSTATS.name: FOOTYSTATS,
    WHOSCORED.name: WHOSCORED,
    TRANSFERMARKT.name: TRANSFERMARKT,
}
