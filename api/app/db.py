"""Direct Postgres connection for the analysis service.

Uses a session-mode connection (psycopg2), not PostgREST — this service does vectorized
scoring computation (ADD 5.2) that doesn't belong behind the auto-generated REST API, and the
admin routes need a single transaction spanning a profile-version write plus a full
recompute-and-write cycle. Mirrors etl/loader/db.py's pattern.
"""

from __future__ import annotations

import os

import psycopg2
from psycopg2.extensions import connection as PGConnection


def get_connection(database_url: str | None = None) -> PGConnection:
    url = database_url or os.environ["SUPABASE_DB_URL"]
    return psycopg2.connect(url)
