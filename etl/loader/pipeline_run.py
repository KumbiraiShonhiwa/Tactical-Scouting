"""public.pipeline_run bookkeeping — one row written per ETL run (DC-06), success or failure.

Deliberately written via its own short auto-committing connection/transaction, not inside the
main load transaction: the run's start/outcome must be recorded even if the load itself rolls
back, otherwise a failed run would leave no audit trail at all (defeating DC-06/AD-03).
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Literal

from psycopg2.extensions import connection as PGConnection

RunStatus = Literal["running", "success", "partial_failure", "failure"]
TriggeredBy = Literal["schedule", "admin"]


def start_run(
    conn: PGConnection, triggered_by: TriggeredBy, run_id: str | None = None
) -> str:
    """If run_id is given (admin-triggered runs — see api/app/routers/admin.py's
    trigger_pipeline), updates that already-existing "queued" row to "running" instead of
    inserting a second, disconnected one — the Phase 5 orphaned-row fix. Schedule-triggered
    runs have no pre-existing row and keep the original insert-a-fresh-row behavior."""
    with conn.cursor() as cur:
        if run_id is not None:
            cur.execute(
                """
                update public.pipeline_run
                set status = 'running'
                where run_id = %s and status = 'queued'
                returning run_id
                """,
                (run_id,),
            )
            row = cur.fetchone()
            if row is None:
                raise ValueError(
                    f"pipeline_run {run_id} not found or not in 'queued' status"
                )
        else:
            cur.execute(
                """
                insert into public.pipeline_run (status, triggered_by)
                values ('running', %s)
                returning run_id
                """,
                (triggered_by,),
            )
            row = cur.fetchone()
    conn.commit()
    assert row is not None
    return str(row[0])


def finish_run(
    conn: PGConnection,
    run_id: str,
    status: RunStatus,
    records_processed: int,
    error_log: str | None = None,
) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            update public.pipeline_run
            set status = %s,
                records_processed = %s,
                error_log = %s,
                completed_at = %s
            where run_id = %s
            """,
            (status, records_processed, error_log, datetime.now(UTC), run_id),
        )
    conn.commit()
