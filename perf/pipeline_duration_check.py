"""Testing Documentation §6.1: "Pipeline duration: the ETL suite records wall-clock duration
for a full six-club refresh in CI/staging and flags a run exceeding the 2-hour budget."

This is deliberately a Python script under perf/, not a k6 script under perf/k6/ — k6 load-tests
HTTP endpoints, and there is no HTTP endpoint here to load-test: a real "full six-club refresh"
means live-scraping Transfermarkt/FootyStats, which DC-07 and etl/'s own test suite explicitly
forbid running from anywhere except the one sanctioned etl-schedule.yml workflow (never
test-and-lint.yml or a second nightly workflow duplicating that load against the real sites).

So this check measures the two things that actually determine the 2-hour budget without
scraping live:
1. The LOAD phase's real wall-clock cost, against a synthetic dataset run through the real
   loader (etl/loader/load.py) and a real local Postgres — no network I/O, DC-07-compliant,
   and extrapolated to the SRS's ~2,000-player scale.
2. The SCRAPE phase's theoretical minimum, computed statically from the configured
   rate-limit intervals (etl/scrapers/config.py) and an estimated page count per club — the
   actual bottleneck for the 2-hour budget is the deliberate rate-limiting itself, not raw
   compute, so this is the more honest thing to check than trying to load-test a scrape.
"""

from __future__ import annotations

import sys
import time
from datetime import UTC, date, datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "etl"))

from loader.db import get_connection  # noqa: E402
from loader.load import PlayerLoadRecord, load_players  # noqa: E402
from scrapers.config import SOURCES  # noqa: E402
from validators.models import ValidatedPlayer, ValidatedPlayerStatistics  # noqa: E402

TWO_HOURS_SECONDS = 2 * 60 * 60
SIX_CLUBS = 6
TARGET_PLAYER_COUNT = 2000  # SRS's "~2,000-player dataset" scale (3.2.1)
SAMPLE_SIZE = 400  # large enough to see the loader's real per-player cost, small enough to run in CI


def build_synthetic_records(n: int) -> list[PlayerLoadRecord]:
    records = []
    for i in range(n):
        player = ValidatedPlayer(
            full_name=f"Perf Test Synthetic Player {i:06d}",
            date_of_birth=date(2000, 1, 1),
            nationality="England",
            position="CM",
            current_club="Perf Test FC",
            source_ids={"footystats": f"perf-{i:06d}"},
        )
        stats = ValidatedPlayerStatistics(
            season="2025/2026",
            minutes_played=1000 + i,
            appearances=20,
            possession_involvement_pct=50.0,
            progressive_passes_per90=3.0,
            defensive_actions_per90=4.0,
            data_source="footystats",
            retrieved_at=datetime.now(UTC),
        )
        records.append(PlayerLoadRecord(player=player, statistics=[stats], valuations=[]))
    return records


def check_load_phase() -> float:
    records = build_synthetic_records(SAMPLE_SIZE)
    conn = get_connection()
    try:
        conn.autocommit = False
        start = time.monotonic()
        load_players(conn, records)
        elapsed = time.monotonic() - start
        conn.rollback()  # never actually publish perf-test synthetic data
    finally:
        conn.close()

    # The loader's known O(n) fallback name-scan per new player (see load.py's
    # _find_existing_player_id docstring) makes this roughly quadratic in the *existing*
    # public.player row count, not linear — extrapolating linearly from a small sample is
    # optimistic, so this is reported as a documented lower bound, not a guarantee.
    per_record_seconds = elapsed / SAMPLE_SIZE
    extrapolated_seconds = per_record_seconds * TARGET_PLAYER_COUNT
    print(
        f"Load phase: {SAMPLE_SIZE} synthetic records in {elapsed:.2f}s "
        f"({per_record_seconds * 1000:.2f}ms/record); linear extrapolation to "
        f"{TARGET_PLAYER_COUNT} records: {extrapolated_seconds:.1f}s "
        f"({extrapolated_seconds / 60:.1f} min) — NOTE: the loader's per-player lookup is "
        f"O(existing rows), so real-scale cost will be higher than this linear estimate; "
        f"treat this number as a lower bound, not a budget guarantee."
    )
    return extrapolated_seconds


def check_scrape_phase_budget() -> float:
    # Conservative estimate: one page per player plus one squad-listing page per club.
    pages_per_club = round(TARGET_PLAYER_COUNT / SIX_CLUBS) + 1
    rate_limit = max(source.rate_limit_seconds for source in SOURCES.values())
    scrape_seconds = SIX_CLUBS * pages_per_club * rate_limit
    print(
        f"Scrape phase (static estimate): {SIX_CLUBS} clubs x ~{pages_per_club} pages x "
        f"{rate_limit}s rate limit = {scrape_seconds:.0f}s ({scrape_seconds / 60:.1f} min)"
    )
    return scrape_seconds


def main() -> int:
    load_seconds = check_load_phase()
    scrape_seconds = check_scrape_phase_budget()
    total_seconds = load_seconds + scrape_seconds

    print(
        f"\nProjected six-club refresh: {total_seconds:.0f}s ({total_seconds / 60:.1f} min) "
        f"against the {TWO_HOURS_SECONDS / 60:.0f}-minute (2h) budget (SRS 3.2.1)."
    )

    if total_seconds > TWO_HOURS_SECONDS:
        print("FAIL: projected duration exceeds the 2-hour budget.")
        return 1

    print("PASS: projected duration is within the 2-hour budget.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
