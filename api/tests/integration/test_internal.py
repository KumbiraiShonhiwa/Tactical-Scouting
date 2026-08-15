"""Integration tests for POST /internal/tactical-profiles/recompute — the route the
recompute-fit-scores Edge Function calls after a tactical_profile INSERT (Phase 5). Exercised
directly here against a real local Supabase/Postgres, since the DB trigger -> pg_net -> Edge
Function -> this route chain isn't reproducible inside a plain pytest run (no Deno runtime)."""

from __future__ import annotations

from fastapi.testclient import TestClient
from psycopg2.extensions import connection as PGConnection

CRYSTAL_PALACE_CLUB_ID = "c6666666-6666-6666-6666-666666666666"

VALID_WEIGHTINGS = {
    "possession_share": 0.2,
    "ppda": 0.2,
    "buildup_speed": 0.2,
    "defensive_line_height": 0.2,
    "crossing_frequency": 0.1,
    "pressing_intensity": 0.1,
}


def test_recompute_rejects_missing_secret(client: TestClient) -> None:
    response = client.post(
        "/internal/tactical-profiles/recompute",
        json={
            "club_id": CRYSTAL_PALACE_CLUB_ID,
            "profile_version": 1,
            "weightings": VALID_WEIGHTINGS,
        },
    )
    assert response.status_code == 401


def test_recompute_rejects_wrong_secret(client: TestClient) -> None:
    response = client.post(
        "/internal/tactical-profiles/recompute",
        json={
            "club_id": CRYSTAL_PALACE_CLUB_ID,
            "profile_version": 1,
            "weightings": VALID_WEIGHTINGS,
        },
        headers={"X-Internal-Secret": "wrong-secret"},
    )
    assert response.status_code == 401


def test_recompute_writes_fit_scores_for_existing_profile_version(
    client: TestClient, db_conn: PGConnection
) -> None:
    response = client.post(
        "/internal/tactical-profiles/recompute",
        json={
            "club_id": CRYSTAL_PALACE_CLUB_ID,
            "profile_version": 1,  # seed.sql's existing current version — no new row needed
            "weightings": VALID_WEIGHTINGS,
        },
        headers={"X-Internal-Secret": "test-internal-secret"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["club_id"] == CRYSTAL_PALACE_CLUB_ID
    assert body["profile_version"] == 1
    assert body["players_scored"] > 0

    with db_conn.cursor() as cur:
        cur.execute(
            "select count(*) from public.fit_score where club_id = %s and profile_version = 1",
            (CRYSTAL_PALACE_CLUB_ID,),
        )
        row = cur.fetchone()
    assert row is not None
    assert row[0] > 0
