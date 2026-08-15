"""Loader integration tests against the real local Supabase Postgres instance — the core
3.2.2 guarantee ("a failed run must not corrupt existing data") can only be proven against a
real transactional database, not a mock."""

from __future__ import annotations

from datetime import UTC, datetime

import pytest
from psycopg2.extensions import connection as PGConnection

from loader.load import PlayerLoadRecord, load_players
from validators.models import ValidatedPlayer, ValidatedPlayerStatistics


def _count_players(conn: PGConnection, full_name: str) -> int:
    with conn.cursor() as cur:
        cur.execute("select count(*) from public.player where full_name = %s", (full_name,))
        row = cur.fetchone()
        assert row is not None
        return int(row[0])


def test_valid_records_are_loaded_and_visible_within_the_same_transaction(
    db_conn: PGConnection,
) -> None:
    record = PlayerLoadRecord(
        player=ValidatedPlayer(
            full_name="Integration Test Player One",
            position="ST",
            source_ids={"transfermarkt": "test-001"},
        )
    )

    processed = load_players(db_conn, [record])

    assert processed == 1
    assert _count_players(db_conn, "Integration Test Player One") == 1
    # No commit — conftest's teardown rolls back, so this never touches committed data.


def test_partial_failure_leaves_previously_committed_data_intact(db_conn: PGConnection) -> None:
    # Step 1: commit a baseline record, simulating "previously published data" from an
    # earlier successful run.
    baseline = PlayerLoadRecord(
        player=ValidatedPlayer(
            full_name="Integration Test Baseline Player",
            position="CB",
            source_ids={"transfermarkt": "test-baseline"},
        )
    )
    load_players(db_conn, [baseline])
    db_conn.commit()
    assert _count_players(db_conn, "Integration Test Baseline Player") == 1

    # Step 2: a new run with one good record and one that fails at the DB layer (a value
    # that passes application-level Pydantic validation — no upper bound is enforced there —
    # but exceeds the numeric(5,2) column's precision, a real constraint validation only the
    # database itself can catch).
    good_record = PlayerLoadRecord(
        player=ValidatedPlayer(
            full_name="Integration Test Good Player",
            position="ST",
            source_ids={"transfermarkt": "test-good"},
        )
    )
    bad_record = PlayerLoadRecord(
        player=ValidatedPlayer(
            full_name="Integration Test Bad Player",
            position="ST",
            source_ids={"transfermarkt": "test-bad"},
        ),
        statistics=[
            ValidatedPlayerStatistics(
                season="2025/2026",
                minutes_played=900,
                possession_involvement_pct=99999.99,  # overflows numeric(5,2)
                data_source="footystats",
                retrieved_at=datetime.now(UTC),
            )
        ],
    )

    with pytest.raises(Exception, match="numeric field overflow"):
        load_players(db_conn, [good_record, bad_record])
    db_conn.rollback()

    # Step 3: neither the good nor the bad record from the failed run was persisted — the
    # whole run rolled back together, and the baseline committed earlier is untouched.
    assert _count_players(db_conn, "Integration Test Good Player") == 0
    assert _count_players(db_conn, "Integration Test Bad Player") == 0
    assert _count_players(db_conn, "Integration Test Baseline Player") == 1

    # Clean up the committed baseline row so this test is repeatable.
    with db_conn.cursor() as cur:
        cur.execute(
            "delete from public.player where full_name = %s",
            ("Integration Test Baseline Player",),
        )
    db_conn.commit()


def test_second_run_upserts_existing_player_by_source_id(db_conn: PGConnection) -> None:
    first = PlayerLoadRecord(
        player=ValidatedPlayer(
            full_name="Integration Test Upsert Player",
            position="CM",
            nationality="England",
            source_ids={"transfermarkt": "test-upsert"},
        )
    )
    load_players(db_conn, [first])

    second = PlayerLoadRecord(
        player=ValidatedPlayer(
            full_name="Integration Test Upsert Player",
            position="CM",
            nationality="Wales",  # simulate a corrected/updated field on re-scrape
            source_ids={"transfermarkt": "test-upsert"},
        )
    )
    load_players(db_conn, [second])

    assert _count_players(db_conn, "Integration Test Upsert Player") == 1
    with db_conn.cursor() as cur:
        cur.execute(
            "select nationality from public.player where full_name = %s",
            ("Integration Test Upsert Player",),
        )
        row = cur.fetchone()
        assert row is not None
        assert row[0] == "Wales"
