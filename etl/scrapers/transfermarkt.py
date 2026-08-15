"""Transfermarkt scraper — DC-02 (market valuations) and squad/player identity.

Confirmed against a real captured fixture (etl/tests/fixtures/transfermarkt/
club_manchester_united.html, captured 2026-08-15): the club "startseite" (home) page renders a
fully server-side squad table (table.items), one row per player, with shirt number, name,
profile link (carrying the Transfermarkt player ID), position, date of birth, nationality, and
current market value — no JS execution required.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import date, datetime

from bs4 import BeautifulSoup, Tag

# Transfermarkt's position labels -> our player.position enum
# (GK, CB, LB, RB, CDM, CM, CAM, LM, RM, LW, RW, ST). Unmapped labels are a validator-level
# quarantine reason, not a silent guess.
POSITION_MAP: dict[str, str] = {
    "Goalkeeper": "GK",
    "Centre-Back": "CB",
    "Left-Back": "LB",
    "Right-Back": "RB",
    "Defensive Midfield": "CDM",
    "Central Midfield": "CM",
    "Attacking Midfield": "CAM",
    "Left Midfield": "LM",
    "Right Midfield": "RM",
    "Left Winger": "LW",
    "Right Winger": "RW",
    "Centre-Forward": "ST",
    "Second Striker": "ST",
}

_VALUE_RE = re.compile(r"([\d.]+)\s*(m|k|bn)?", re.IGNORECASE)
_DOB_RE = re.compile(r"(\d{2}/\d{2}/\d{4})")
_PROFILE_ID_RE = re.compile(r"/profil/spieler/(\d+)")


@dataclass
class RawTransfermarktRecord:
    full_name: str
    position_raw: str
    date_of_birth: date | None
    nationality: str | None
    transfermarkt_id: str
    valuation_amount: float | None
    currency: str
    profile_url: str


def parse_market_value(text: str) -> float | None:
    """'€35.00m' -> 35_000_000.0, '€500k' -> 500_000.0, '-' -> None."""
    text = text.strip()
    match = _VALUE_RE.search(text)
    if not match or not match.group(1):
        return None
    amount = float(match.group(1))
    suffix = (match.group(2) or "").lower()
    if suffix == "m":
        amount *= 1_000_000
    elif suffix == "k":
        amount *= 1_000
    elif suffix == "bn":
        amount *= 1_000_000_000
    return amount


def parse_date_of_birth(text: str) -> date | None:
    match = _DOB_RE.search(text)
    if not match:
        return None
    return datetime.strptime(match.group(1), "%d/%m/%Y").date()


def _extract_row(row: Tag) -> RawTransfermarktRecord | None:
    name_link = row.select_one("td.posrela a")
    if name_link is None:
        return None

    full_name = name_link.get_text(strip=True)
    profile_url = str(name_link.get("href", ""))
    id_match = _PROFILE_ID_RE.search(profile_url)
    transfermarkt_id = id_match.group(1) if id_match else ""

    position_cell = row.select_one("td.posrela table.inline-table tr:nth-of-type(2) td")
    position_raw = position_cell.get_text(strip=True) if position_cell else ""

    zentriert_cells = row.select("td.zentriert:not(.rueckennummer)")
    dob_text = zentriert_cells[0].get_text(strip=True) if zentriert_cells else ""
    date_of_birth = parse_date_of_birth(dob_text)

    nationality_img = row.select_one("td.zentriert img.flaggenrahmen")
    nationality = str(nationality_img.get("title", "")) if nationality_img else None

    value_link = row.select_one("td.rechts.hauptlink a")
    valuation_amount = parse_market_value(value_link.get_text(strip=True)) if value_link else None

    return RawTransfermarktRecord(
        full_name=full_name,
        position_raw=position_raw,
        date_of_birth=date_of_birth,
        nationality=nationality,
        transfermarkt_id=transfermarkt_id,
        valuation_amount=valuation_amount,
        currency="EUR",
        profile_url=profile_url,
    )


def parse_club_squad(html: str) -> list[RawTransfermarktRecord]:
    """Parse a Transfermarkt club "startseite" page into one raw record per squad player."""
    soup = BeautifulSoup(html, "lxml")
    rows = soup.select("table.items > tbody > tr")
    records: list[RawTransfermarktRecord] = []
    for row in rows:
        record = _extract_row(row)
        if record is not None and record.full_name:
            records.append(record)
    return records
