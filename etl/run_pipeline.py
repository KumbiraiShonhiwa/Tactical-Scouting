"""ETL pipeline entrypoint: scrape -> validate -> load, with pipeline_run + quarantine
bookkeeping, per docs/runbook.md's "first ETL run" step and the football-etl skill's
Extract -> Transform/Validate -> Load pipeline shape.

Not invoked by any test — tests exercise the scraper/validator/loader modules directly against
fixtures or a local Supabase instance. This script is what etl-schedule.yml runs against the
real sources, deliberately kept out of the automated test suite per DC-07 (no live scraping in
tests).
"""

from __future__ import annotations

import argparse
import sys
from datetime import UTC, datetime

from loader.db import get_connection
from loader.load import PlayerLoadRecord, load_players
from loader.pipeline_run import finish_run, start_run
from loader.quarantine import write_quarantine
from scrapers.base import RateLimitedClient, RobotsChecker
from scrapers.config import TRANSFERMARKT
from scrapers.transfermarkt import parse_club_squad
from validators.dedup import normalize_name
from validators.rules import QuarantineCandidate, validate_market_valuation, validate_player

# Six target clubs' Transfermarkt "startseite" URLs (per docs/data-dictionary.md's club list).
# FootyStats player URLs are not enumerable this simply (they're keyed by nationality slug,
# not club) — a full run resolves them by matching the Transfermarkt-sourced player name
# against FootyStats' player search, which is a follow-up enhancement once this base pipeline
# is reviewed; this entrypoint currently loads Transfermarkt (squad + valuations) only.
TRANSFERMARKT_CLUB_URLS = {
    "Manchester United": "https://www.transfermarkt.com/manchester-united/startseite/verein/985",
    "Newcastle United": "https://www.transfermarkt.com/newcastle-united/startseite/verein/762",
    "Aston Villa": "https://www.transfermarkt.com/aston-villa/startseite/verein/405",
    "Tottenham Hotspur": "https://www.transfermarkt.com/tottenham-hotspur/startseite/verein/148",
    "Brighton & Hove Albion": "https://www.transfermarkt.com/brighton-amp-hove-albion/startseite/verein/1237",
    "Crystal Palace": "https://www.transfermarkt.com/crystal-palace/startseite/verein/873",
}


def run(triggered_by: str, run_id: str | None = None) -> int:
    conn = get_connection()
    run_id = start_run(conn, triggered_by, run_id)  # type: ignore[arg-type]

    quarantine_candidates: list[QuarantineCandidate] = []
    load_records: list[PlayerLoadRecord] = []

    try:
        robots = RobotsChecker(user_agent=TRANSFERMARKT.user_agent)
        import httpx

        robots.load_from_url(
            f"{TRANSFERMARKT.base_url}/robots.txt",
            lambda url: httpx.get(url, headers={"User-Agent": TRANSFERMARKT.user_agent}).text,
        )
        client = RateLimitedClient(source=TRANSFERMARKT, robots=robots)

        seen_names: set[str] = set()
        for club_name, url in TRANSFERMARKT_CLUB_URLS.items():
            response = client.get(
                url,
                lambda u, headers: httpx.get(u, headers=headers, timeout=30, follow_redirects=True),
            )
            for raw in parse_club_squad(response.text):
                from scrapers.transfermarkt import POSITION_MAP

                position = POSITION_MAP.get(raw.position_raw)
                player_raw = {
                    "full_name": raw.full_name,
                    "date_of_birth": raw.date_of_birth,
                    "nationality": raw.nationality,
                    "position": position,
                    "current_club": club_name,
                    "source_ids": {"transfermarkt": raw.transfermarkt_id},
                }
                validated_player, player_quarantine = validate_player(player_raw, "transfermarkt")
                if player_quarantine is not None:
                    quarantine_candidates.append(player_quarantine)
                    continue
                assert validated_player is not None

                valuations = []
                if raw.valuation_amount is not None:
                    valuation_raw = {
                        "valuation_amount": raw.valuation_amount,
                        "currency": raw.currency,
                        "valuation_date": datetime.now(UTC).date(),
                        "data_source": "transfermarkt",
                    }
                    validated_valuation, valuation_quarantine = validate_market_valuation(
                        valuation_raw, "transfermarkt"
                    )
                    if valuation_quarantine is not None:
                        quarantine_candidates.append(valuation_quarantine)
                    elif validated_valuation is not None:
                        valuations = [validated_valuation]

                load_records.append(
                    PlayerLoadRecord(player=validated_player, statistics=[], valuations=valuations)
                )
                seen_names.add(normalize_name(raw.full_name))

        conn.autocommit = False
        try:
            processed = load_players(conn, load_records)
            conn.commit()
            finish_run(conn, run_id, "success", processed)
        except Exception as exc:  # noqa: BLE001 - deliberately broad: any load failure rolls back
            conn.rollback()
            finish_run(conn, run_id, "failure", 0, error_log=str(exc))
            raise

        for candidate in quarantine_candidates:
            write_quarantine(conn, candidate, run_id)

        return 0
    finally:
        conn.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--triggered-by", choices=["schedule", "admin"], default="schedule")
    parser.add_argument(
        "--run-id",
        default=None,
        help="Existing pipeline_run row to update (admin-triggered runs only) instead of "
        "inserting a new one — passed through from POST /admin/pipeline/trigger via the "
        "workflow_dispatch input.",
    )
    args = parser.parse_args()
    sys.exit(run(args.triggered_by, args.run_id or None))
