"""private.quarantine writes — always outside the main load transaction (see loader/load.py's
module docstring): a quarantined record was never going to enter the main tables anyway, so it
shouldn't be lost just because something else in the run later fails and rolls back.
"""

from __future__ import annotations

import json

from psycopg2.extensions import connection as PGConnection

from validators.rules import QuarantineCandidate


def write_quarantine(
    conn: PGConnection, candidate: QuarantineCandidate, pipeline_run_id: str | None
) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            insert into private.quarantine
                (source_table, raw_record, reason, data_source, pipeline_run_id)
            values (%s, %s, %s, %s, %s)
            """,
            (
                candidate.source_table,
                json.dumps(candidate.raw_record, default=str),
                candidate.reason,
                candidate.data_source,
                pipeline_run_id,
            ),
        )
    conn.commit()
