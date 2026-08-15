"""Integration test fixtures: a real local Supabase stack (Postgres + GoTrue Auth + its real
JWKS endpoint) — no mocking of the database or the auth chain, per Testing Documentation §4.1
("JWT-authenticated admin routes are tested with real Supabase Auth test users... rather than
hand-crafted tokens, so the full auth chain is exercised").

The two keys below are Supabase's well-known LOCAL-DEV-ONLY default demo keys — identical
across every `supabase start` on every machine, documented in Supabase's own CLI output, not a
secret of this project. Never used for anything but the local integration test stack.
"""

from __future__ import annotations

import os
import uuid
from collections.abc import Iterator

os.environ.setdefault("SUPABASE_DB_URL", "postgresql://postgres:postgres@127.0.0.1:54322/postgres")
os.environ.setdefault(
    "SUPABASE_JWKS_URL", "http://127.0.0.1:54321/auth/v1/.well-known/jwks.json"
)
os.environ.setdefault("GITHUB_TOKEN", "test-token")
os.environ.setdefault("GITHUB_REPO", "test-owner/test-repo")
os.environ.setdefault("INTERNAL_FUNCTION_SECRET", "test-internal-secret")

import httpx
import psycopg2
import pytest
from fastapi.testclient import TestClient
from psycopg2.extensions import connection as PGConnection

from app.main import app
from app.routers.admin import get_github_dispatcher

SUPABASE_API_URL = "http://127.0.0.1:54321"
SUPABASE_ANON_KEY = (
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9."
    "eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9."
    "CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0"
)
SUPABASE_SERVICE_ROLE_KEY = (
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9."
    "eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0."
    "EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU"
)


@pytest.fixture
def db_conn() -> Iterator[PGConnection]:
    conn = psycopg2.connect(os.environ["SUPABASE_DB_URL"])
    conn.autocommit = False
    try:
        yield conn
    finally:
        conn.rollback()
        conn.close()


@pytest.fixture
def client() -> Iterator[TestClient]:
    # The real GitHub API is never called from tests — see app/github.py's module docstring.
    app.dependency_overrides[get_github_dispatcher] = lambda: (lambda triggered_by, run_id: None)
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def _create_auth_user(role: str) -> Iterator[str]:
    email = f"{role}-{uuid.uuid4()}@example.test"
    password = "Sup3rSecretTestPass!23"

    create_resp = httpx.post(
        f"{SUPABASE_API_URL}/auth/v1/admin/users",
        headers={
            "apikey": SUPABASE_SERVICE_ROLE_KEY,
            "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        },
        json={"email": email, "password": password, "email_confirm": True},
        timeout=10,
    )
    create_resp.raise_for_status()
    user_id = create_resp.json()["id"]

    if role == "admin":
        conn = psycopg2.connect(os.environ["SUPABASE_DB_URL"])
        try:
            with conn.cursor() as cur:
                cur.execute(
                    "update public.profiles set role = 'admin' where id = %s", (user_id,)
                )
            conn.commit()
        finally:
            conn.close()

    token_resp = httpx.post(
        f"{SUPABASE_API_URL}/auth/v1/token?grant_type=password",
        headers={"apikey": SUPABASE_ANON_KEY},
        json={"email": email, "password": password},
        timeout=10,
    )
    token_resp.raise_for_status()
    access_token: str = token_resp.json()["access_token"]

    try:
        yield access_token
    finally:
        httpx.delete(
            f"{SUPABASE_API_URL}/auth/v1/admin/users/{user_id}",
            headers={
                "apikey": SUPABASE_SERVICE_ROLE_KEY,
                "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
            },
            timeout=10,
        )


@pytest.fixture
def admin_token() -> Iterator[str]:
    yield from _create_auth_user("admin")


@pytest.fixture
def standard_user_token() -> Iterator[str]:
    yield from _create_auth_user("standard")
