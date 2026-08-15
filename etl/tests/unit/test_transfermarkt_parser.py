from datetime import date
from pathlib import Path

from scrapers.transfermarkt import (
    parse_club_squad,
    parse_date_of_birth,
    parse_market_value,
)

FIXTURE = (
    Path(__file__).parent.parent / "fixtures" / "transfermarkt" / "club_manchester_united.html"
)


def test_parses_expected_number_of_squad_rows() -> None:
    html = FIXTURE.read_text(encoding="utf-8")
    records = parse_club_squad(html)
    assert len(records) == 20


def test_parses_player_identity_fields() -> None:
    html = FIXTURE.read_text(encoding="utf-8")
    records = parse_club_squad(html)
    lammens = next(r for r in records if r.full_name == "Senne Lammens")
    assert lammens.transfermarkt_id == "503883"
    assert lammens.position_raw == "Goalkeeper"
    assert lammens.nationality == "Belgium"
    assert lammens.date_of_birth == date(2002, 7, 7)
    assert lammens.valuation_amount == 35_000_000.0
    assert lammens.currency == "EUR"


def test_accented_names_decode_correctly() -> None:
    html = FIXTURE.read_text(encoding="utf-8")
    records = parse_club_squad(html)
    martinez = next(r for r in records if r.transfermarkt_id == "480762")
    assert martinez.full_name == "Lisandro Martínez"


def test_parse_market_value_variants() -> None:
    assert parse_market_value("€35.00m") == 35_000_000.0
    assert parse_market_value("€500k") == 500_000.0
    assert parse_market_value("-") is None
    assert parse_market_value("") is None


def test_parse_date_of_birth_variants() -> None:
    assert parse_date_of_birth("07/07/2002 (24)") == date(2002, 7, 7)
    assert parse_date_of_birth("no date here") is None


def test_no_squad_table_returns_empty_list() -> None:
    assert parse_club_squad("<html><body>no table here</body></html>") == []
