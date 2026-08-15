from __future__ import annotations

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
