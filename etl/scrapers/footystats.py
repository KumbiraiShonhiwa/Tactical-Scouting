"""FootyStats.org scraper — DC-01 (player per-90 statistics), replacing FBref per
docs/data-ethics-compliance.md (FBref is blocked by a Cloudflare bot-challenge before
robots.txt itself can even be read).

Confirmed against a real captured fixture (etl/tests/fixtures/footystats/
player_patrick_roberts.html, captured 2026-08-15): a player page statically (no JS execution)
renders a "stat-strong" overview grid with labeled per-90 figures (Goals Per 90, Assists Per
90, xG Per 90, xA Per 90, ...) and a season-by-season table (.player_season_row) with
matches-played and minutes-played columns.

Not available from the static page (only present in the un-rendered, JS-loaded advanced/
defensive/passing tabs — see the investigation notes in etl/tests/fixtures/footystats/): the
passing, defensive-actions, pressing, and crossing metrics. Those `player_statistics` columns
are left `None` by this scraper for now rather than guessed; see docs/data-dictionary.md.
"""

from __future__ import annotations

import re
from dataclasses import dataclass

from bs4 import BeautifulSoup

_STAT_GRID_LABELS = {
    "Goals Per 90": "goals_per90",
    "Assists Per 90": "assists_per90",
    "xG Per 90": "expected_goals_per90",
    "xA Per 90": "expected_assists_per90",
}

_MINUTES_RE = re.compile(r"(\d+)")


@dataclass
class RawFootyStatsRecord:
    full_name: str
    goals_per90: float | None
    assists_per90: float | None
    expected_goals_per90: float | None
    expected_assists_per90: float | None
    appearances: int | None
    minutes_played: int | None
    competition: str | None


def _parse_stat_grid(soup: BeautifulSoup) -> dict[str, float]:
    values: dict[str, float] = {}
    for grid_item in soup.select(".stat-strong"):
        span = grid_item.find("span")
        if span is None:
            continue
        label = span.get_text(strip=True).rstrip("'")
        field = _STAT_GRID_LABELS.get(label)
        if field is None:
            continue
        value_text = grid_item.get_text(strip=True).replace(span.get_text(strip=True), "")
        try:
            values[field] = float(value_text)
        except ValueError:
            continue
    return values


def _parse_current_season_row(soup: BeautifulSoup) -> tuple[str | None, int | None, int | None]:
    """Returns (competition, appearances, minutes_played) from the first season row —
    assumed to be the most recent/current season, per FootyStats' page ordering (verified
    against the captured fixture; not guaranteed by any documented API contract)."""
    row = soup.select_one(".player_season_row")
    if row is None:
        return None, None, None

    competition_cell = row.select_one(".col-lg-4")
    competition = competition_cell.get_text(strip=True) if competition_cell else None

    appearances_cell = row.select_one(".col-lg-1")
    appearances = None
    if appearances_cell is not None:
        text = appearances_cell.get_text(strip=True)
        appearances = int(text) if text.isdigit() else None

    minutes_cell = row.select_one(".col-lg-2")
    minutes_played = None
    if minutes_cell is not None:
        match = _MINUTES_RE.search(minutes_cell.get_text(strip=True))
        minutes_played = int(match.group(1)) if match else None

    return competition, appearances, minutes_played


def _parse_full_name(soup: BeautifulSoup) -> str:
    if soup.title is None:
        return ""
    # Title format: "<Name> Stats - Goals, xG, Assists & Career Stats | FootyStats"
    title_text = soup.title.get_text(strip=True)
    return title_text.split(" Stats")[0].strip()


def parse_player_page(html: str) -> RawFootyStatsRecord:
    soup = BeautifulSoup(html, "lxml")
    full_name = _parse_full_name(soup)
    stat_grid = _parse_stat_grid(soup)
    competition, appearances, minutes_played = _parse_current_season_row(soup)

    return RawFootyStatsRecord(
        full_name=full_name,
        goals_per90=stat_grid.get("goals_per90"),
        assists_per90=stat_grid.get("assists_per90"),
        expected_goals_per90=stat_grid.get("expected_goals_per90"),
        expected_assists_per90=stat_grid.get("expected_assists_per90"),
        appearances=appearances,
        minutes_played=minutes_played,
        competition=competition,
    )
