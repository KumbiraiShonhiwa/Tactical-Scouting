"""Integration test fixtures: a real connection to the local Supabase Postgres instance
(started via `supabase start`, per Phase 1) — no mocking of the database, per the
pytest-testing skill ("do not mock away RLS behavior" extends to not mocking the DB at all
for loader tests, since the whole point is proving real transactional behavior).

Each test runs inside its own transaction that is rolled back at teardown, so tests never
pollute the golden seed dataset or each other — the same isolation pattern the pgTAP suite
uses.
"""

from __future__ import annotations

from collections.abc import Iterator

import psycopg2
import pytest
from psycopg2.extensions import connection as PGConnection

LOCAL_DB_URL = "postgresql://postgres:postgres@127.0.0.1:54322/postgres"


@pytest.fixture
def db_conn() -> Iterator[PGConnection]:
    conn = psycopg2.connect(LOCAL_DB_URL)
    conn.autocommit = False
    try:
        yield conn
    finally:
        conn.rollback()
        conn.close()
