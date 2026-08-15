from datetime import UTC, date, datetime

from validators.rules import validate_market_valuation, validate_player, validate_player_statistics


def test_valid_player_passes() -> None:
    raw = {
        "full_name": "Test Player",
        "position": "CM",
        "date_of_birth": date(2000, 1, 1),
        "nationality": "England",
        "current_club": "Manchester United",
        "source_ids": {"transfermarkt": "123"},
    }
    player, quarantine = validate_player(raw, "transfermarkt")
    assert quarantine is None
    assert player is not None
    assert player.position == "CM"


def test_unknown_position_is_quarantined() -> None:
    raw = {"full_name": "Test Player", "position": "SWEEPER"}
    player, quarantine = validate_player(raw, "transfermarkt")
    assert player is None
    assert quarantine is not None
    assert quarantine.source_table == "public.player"
    assert "position" in quarantine.reason


def test_missing_required_field_is_quarantined() -> None:
    raw = {"position": "CM"}  # full_name missing
    player, quarantine = validate_player(raw, "transfermarkt")
    assert player is None
    assert quarantine is not None


def test_valid_statistics_pass() -> None:
    raw = {
        "season": "2025/2026",
        "minutes_played": 900,
        "goals_per90": 0.5,
        "data_source": "footystats",
        "retrieved_at": datetime.now(UTC),
    }
    stats, quarantine = validate_player_statistics(raw, "footystats")
    assert quarantine is None
    assert stats is not None
    assert stats.minutes_played == 900


def test_negative_minutes_played_is_quarantined() -> None:
    raw = {
        "season": "2025/2026",
        "minutes_played": -10,
        "data_source": "footystats",
        "retrieved_at": datetime.now(UTC),
    }
    stats, quarantine = validate_player_statistics(raw, "footystats")
    assert stats is None
    assert quarantine is not None
    assert quarantine.source_table == "public.player_statistics"


def test_negative_stat_value_is_quarantined() -> None:
    raw = {
        "season": "2025/2026",
        "minutes_played": 900,
        "goals_per90": -0.5,
        "data_source": "footystats",
        "retrieved_at": datetime.now(UTC),
    }
    stats, quarantine = validate_player_statistics(raw, "footystats")
    assert stats is None
    assert quarantine is not None


def test_unknown_data_source_is_quarantined() -> None:
    raw = {
        "season": "2025/2026",
        "minutes_played": 900,
        "data_source": "some-random-site",
        "retrieved_at": datetime.now(UTC),
    }
    stats, quarantine = validate_player_statistics(raw, "some-random-site")
    assert stats is None
    assert quarantine is not None


def test_valid_valuation_passes() -> None:
    raw = {
        "valuation_amount": 1_000_000,
        "currency": "EUR",
        "valuation_date": date(2026, 7, 1),
        "data_source": "transfermarkt",
    }
    valuation, quarantine = validate_market_valuation(raw, "transfermarkt")
    assert quarantine is None
    assert valuation is not None


def test_negative_valuation_is_quarantined() -> None:
    raw = {
        "valuation_amount": -5,
        "currency": "EUR",
        "valuation_date": date(2026, 7, 1),
        "data_source": "transfermarkt",
    }
    valuation, quarantine = validate_market_valuation(raw, "transfermarkt")
    assert valuation is None
    assert quarantine is not None
