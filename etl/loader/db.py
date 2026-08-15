"""Direct Postgres connection for the loader.

Uses a session-mode connection (psycopg2), not the supabase-py REST client, because the
loader needs a single multi-statement transaction spanning every upsert in a run — the
REST/PostgREST API can't do that. Per ADD 3.5, short-lived/serverless callers use Supavisor's
pooler; this loader is a longer-lived batch job, so a direct/session-mode connection is the
right fit, matching the FastAPI service's connection style.
"""

from __future__ import annotations

import os

import psycopg2
from psycopg2.extensions import connection as PGConnection


def get_connection(database_url: str | None = None) -> PGConnection:
    url = database_url or os.environ["SUPABASE_DB_URL"]
    return psycopg2.connect(url)
