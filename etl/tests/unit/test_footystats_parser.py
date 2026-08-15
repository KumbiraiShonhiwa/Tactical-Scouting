from pathlib import Path

from scrapers.footystats import parse_player_page

FIXTURE = Path(__file__).parent.parent / "fixtures" / "footystats" / "player_patrick_roberts.html"


def test_parses_full_name_from_title() -> None:
    html = FIXTURE.read_text(encoding="utf-8")
    record = parse_player_page(html)
    assert record.full_name == "Patrick Roberts"


def test_parses_per90_stat_grid() -> None:
    html = FIXTURE.read_text(encoding="utf-8")
    record = parse_player_page(html)
    assert record.goals_per90 == 0.16
    assert record.assists_per90 == 0.20
    assert record.expected_goals_per90 == 0.24
    assert record.expected_assists_per90 == 0.25


def test_parses_current_season_row() -> None:
    html = FIXTURE.read_text(encoding="utf-8")
    record = parse_player_page(html)
    assert record.competition == "Premier League"
    assert record.appearances == 1
    assert record.minutes_played == 27


def test_missing_stat_grid_returns_none_fields() -> None:
    html = "<html><head><title>Nobody Stats - x | FootyStats</title></head><body></body></html>"
    record = parse_player_page(html)
    assert record.full_name == "Nobody"
    assert record.goals_per90 is None
    assert record.minutes_played is None
