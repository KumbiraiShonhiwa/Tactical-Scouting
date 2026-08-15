from __future__ import annotations

from psycopg2.extensions import connection as PGConnection

from loader.pipeline_run import finish_run, start_run
from loader.quarantine import write_quarantine
from validators.rules import QuarantineCandidate


def test_quarantine_write_persists_raw_record_and_reason(db_conn: PGConnection) -> None:
    run_id = start_run(db_conn, "admin")
    candidate = QuarantineCandidate(
        source_table="public.player",
        raw_record={"full_name": "Bad Player", "position": "SWEEPER"},
        reason="unknown position 'SWEEPER'",
        data_source="transfermarkt",
    )

    write_quarantine(db_conn, candidate, run_id)

    with db_conn.cursor() as cur:
        cur.execute(
            "select source_table, reason, data_source, pipeline_run_id "
            "from private.quarantine where pipeline_run_id = %s",
            (run_id,),
        )
        row = cur.fetchone()

    assert row is not None
    assert row[0] == "public.player"
    assert row[1] == "unknown position 'SWEEPER'"
    assert row[2] == "transfermarkt"
    assert str(row[3]) == run_id

    finish_run(db_conn, run_id, "success", 0)

    with db_conn.cursor() as cur:
        cur.execute("delete from private.quarantine where pipeline_run_id = %s", (run_id,))
        cur.execute("delete from public.pipeline_run where run_id = %s", (run_id,))
    db_conn.commit()


def test_quarantine_write_survives_a_later_rollback_in_the_same_run(
    db_conn: PGConnection,
) -> None:
    """Quarantine writes use their own commit (loader/quarantine.py), independent of the
    main load transaction — so a quarantined record must still be visible even if something
    else in the run later fails and rolls back."""
    run_id = start_run(db_conn, "schedule")
    candidate = QuarantineCandidate(
        source_table="public.player_statistics",
        raw_record={"minutes_played": -5},
        reason="minutes_played cannot be negative",
        data_source="footystats",
    )
    write_quarantine(db_conn, candidate, run_id)

    # Simulate the rest of the run failing after this quarantine write.
    with db_conn.cursor() as cur:
        cur.execute("select 1 from public.player where full_name = 'does-not-exist' for update")
    db_conn.rollback()

    with db_conn.cursor() as cur:
        cur.execute(
            "select count(*) from private.quarantine where pipeline_run_id = %s", (run_id,)
        )
        row = cur.fetchone()
    assert row is not None
    assert row[0] == 1

    with db_conn.cursor() as cur:
        cur.execute("delete from private.quarantine where pipeline_run_id = %s", (run_id,))
        cur.execute("delete from public.pipeline_run where run_id = %s", (run_id,))
    db_conn.commit()
