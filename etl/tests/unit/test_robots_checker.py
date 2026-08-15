"""Tests the RobotsChecker directly against the three real robots.txt rule sets recorded
verbatim in docs/data-ethics-compliance.md (captured 2026-08-15) — a regression test for the
finding that Python's stdlib urllib.robotparser mishandles the FootyStats '/players?*' pattern
(see scrapers/base.py's module docstring)."""

from scrapers.base import RobotsChecker

FOOTYSTATS_ROBOTS = """
User-agent: *
Disallow: /api/club*
Disallow: /api/team*
Disallow: /api/match*
Disallow: /england/league-one
Disallow: /england/league-one/*
Disallow: /england/league-two
Disallow: /england/league-two/*
Disallow: /*.php
Disallow: /matches?*
Disallow: /team-stats?*
Disallow: /players?*
"""

WHOSCORED_ROBOTS = """
User-agent: *
Disallow: /Accounts/
Disallow: /Predictions/
Disallow: /Users/
Disallow: /accounts/
Disallow: /predictions/
Disallow: /users/
"""

TRANSFERMARKT_ROBOTS = """
User-agent: Slurp
Crawl-delay: 2

User-agent: Mediapartners-Google
Disallow:

User-agent: *
Allow: /
"""


def test_footystats_static_club_page_allowed() -> None:
    checker = RobotsChecker(user_agent="TacticalScoutingBot/1.0", rules_text=FOOTYSTATS_ROBOTS)
    assert checker.is_allowed("https://footystats.org/clubs/manchester-united-fc-149")


def test_footystats_players_query_string_disallowed() -> None:
    checker = RobotsChecker(user_agent="TacticalScoutingBot/1.0", rules_text=FOOTYSTATS_ROBOTS)
    assert not checker.is_allowed("https://footystats.org/players?search=x")


def test_footystats_lower_league_disallowed() -> None:
    checker = RobotsChecker(user_agent="TacticalScoutingBot/1.0", rules_text=FOOTYSTATS_ROBOTS)
    assert not checker.is_allowed("https://footystats.org/england/league-one")
    assert not checker.is_allowed("https://footystats.org/england/league-one/some-club")


def test_footystats_api_paths_disallowed() -> None:
    checker = RobotsChecker(user_agent="TacticalScoutingBot/1.0", rules_text=FOOTYSTATS_ROBOTS)
    assert not checker.is_allowed("https://footystats.org/api/club/149")


def test_whoscored_team_page_allowed() -> None:
    checker = RobotsChecker(user_agent="TacticalScoutingBot/1.0", rules_text=WHOSCORED_ROBOTS)
    assert checker.is_allowed("https://www.whoscored.com/Teams/32/Show/England-Manchester-United")


def test_whoscored_accounts_path_disallowed() -> None:
    checker = RobotsChecker(user_agent="TacticalScoutingBot/1.0", rules_text=WHOSCORED_ROBOTS)
    assert not checker.is_allowed("https://www.whoscored.com/Accounts/Login")


def test_transfermarkt_player_page_allowed() -> None:
    checker = RobotsChecker(user_agent="TacticalScoutingBot/1.0", rules_text=TRANSFERMARKT_ROBOTS)
    assert checker.is_allowed(
        "https://www.transfermarkt.com/manchester-united/startseite/verein/985"
    )
