from __future__ import annotations

import pytest
from psycopg2.extensions import connection as PGConnection

from loader.pipeline_run import finish_run, start_run


def _fetch(conn: PGConnection, run_id: str) -> tuple[object, ...]:
    with conn.cursor() as cur:
        cur.execute(
            "select status, triggered_by, records_processed, error_log, "
            "started_at, completed_at "
            "from public.pipeline_run where run_id = %s",
            (run_id,),
        )
        row = cur.fetchone()
    assert row is not None
    return tuple(row)


def test_successful_run_lifecycle(db_conn: PGConnection) -> None:
    run_id = start_run(db_conn, "schedule")
    status, triggered_by, records_processed, error_log, started_at, completed_at = _fetch(
        db_conn, run_id
    )
    assert status == "running"
    assert triggered_by == "schedule"
    assert completed_at is None

    finish_run(db_conn, run_id, "success", records_processed=42)
    status, _, records_processed, error_log, _, completed_at = _fetch(db_conn, run_id)
    assert status == "success"
    assert records_processed == 42
    assert error_log is None
    assert completed_at is not None

    with db_conn.cursor() as cur:
        cur.execute("delete from public.pipeline_run where run_id = %s", (run_id,))
    db_conn.commit()


def test_failed_run_records_error_log(db_conn: PGConnection) -> None:
    run_id = start_run(db_conn, "admin")
    finish_run(db_conn, run_id, "failure", records_processed=0, error_log="numeric field overflow")

    status, _, records_processed, error_log, _, _ = _fetch(db_conn, run_id)
    assert status == "failure"
    assert records_processed == 0
    assert error_log == "numeric field overflow"

    with db_conn.cursor() as cur:
        cur.execute("delete from public.pipeline_run where run_id = %s", (run_id,))
    db_conn.commit()


def test_start_run_with_existing_run_id_updates_in_place_not_a_new_row(
    db_conn: PGConnection,
) -> None:
    """The Phase 5 orphaned-row fix: POST /admin/pipeline/trigger already inserted a "queued"
    row before dispatching the GitHub Action — start_run must update that exact row, not
    create a second one, or every admin-triggered run leaks an orphaned "queued" row."""
    with db_conn.cursor() as cur:
        cur.execute(
            "insert into public.pipeline_run (status, triggered_by) "
            "values ('queued', 'admin') returning run_id"
        )
        row = cur.fetchone()
    db_conn.commit()
    assert row is not None
    pre_existing_run_id = str(row[0])

    returned_run_id = start_run(db_conn, "admin", run_id=pre_existing_run_id)
    assert returned_run_id == pre_existing_run_id

    status, triggered_by, _, _, _, _ = _fetch(db_conn, pre_existing_run_id)
    assert status == "running"
    assert triggered_by == "admin"

    with db_conn.cursor() as cur:
        cur.execute(
            "select count(*) from public.pipeline_run where run_id = %s", (pre_existing_run_id,)
        )
        count_row = cur.fetchone()
    assert count_row is not None
    assert count_row[0] == 1  # exactly one row — no duplicate was inserted

    with db_conn.cursor() as cur:
        cur.execute("delete from public.pipeline_run where run_id = %s", (pre_existing_run_id,))
    db_conn.commit()


def test_start_run_with_unknown_run_id_raises(db_conn: PGConnection) -> None:
    with pytest.raises(ValueError, match="not found or not in 'queued' status"):
        start_run(db_conn, "admin", run_id="00000000-0000-0000-0000-000000000000")
