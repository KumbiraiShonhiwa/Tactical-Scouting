"""Admin route integration tests — real Supabase Auth test users (admin_token/
standard_user_token fixtures), not hand-crafted tokens, exercising the full auth chain
(JWT verification against the real local JWKS endpoint + the profiles.role='admin' check)."""

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


def test_weightings_route_rejects_no_auth(client: TestClient) -> None:
    response = client.post(
        f"/admin/tactical-profiles/{CRYSTAL_PALACE_CLUB_ID}/weightings",
        json={"weightings": VALID_WEIGHTINGS},
    )
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "unauthorized"


def test_weightings_route_rejects_non_admin(
    client: TestClient, standard_user_token: str
) -> None:
    response = client.post(
        f"/admin/tactical-profiles/{CRYSTAL_PALACE_CLUB_ID}/weightings",
        json={"weightings": VALID_WEIGHTINGS},
        headers={"Authorization": f"Bearer {standard_user_token}"},
    )
    assert response.status_code == 403
    assert response.json()["error"]["code"] == "forbidden"


def test_weightings_route_rejects_invalid_weights_even_for_admin(
    client: TestClient, admin_token: str
) -> None:
    response = client.post(
        f"/admin/tactical-profiles/{CRYSTAL_PALACE_CLUB_ID}/weightings",
        json={"weightings": {**VALID_WEIGHTINGS, "possession_share": 0.9}},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 422


def test_weightings_route_admin_success_creates_new_version_and_enqueues_recompute(
    client: TestClient, admin_token: str, db_conn: PGConnection
) -> None:
    """Phase 5: the route only writes the new tactical_profile version now — the actual
    recompute happens asynchronously via the DB trigger -> recompute-fit-scores Edge Function
    -> POST /internal/tactical-profiles/recompute path, exercised separately in
    test_internal.py against the internal route directly."""
    response = client.post(
        f"/admin/tactical-profiles/{CRYSTAL_PALACE_CLUB_ID}/weightings",
        json={"weightings": VALID_WEIGHTINGS},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 201
    body = response.json()
    assert body["club_id"] == CRYSTAL_PALACE_CLUB_ID
    assert body["profile_version"] == 2  # seed.sql already has version 1
    assert body["recompute_status"] == "enqueued"

    with db_conn.cursor() as cur:
        cur.execute(
            "select count(*) from public.fit_score where club_id = %s and profile_version = 2",
            (CRYSTAL_PALACE_CLUB_ID,),
        )
        row = cur.fetchone()
    assert row is not None
    assert row[0] == 0  # no synchronous recompute — the route itself does not write fit_score

    # Cleanup: the route commits internally, so clean up outside the (already-committed) test.
    with db_conn.cursor() as cur:
        cur.execute(
            "delete from public.tactical_profile where club_id = %s and version = 2",
            (CRYSTAL_PALACE_CLUB_ID,),
        )
        cur.execute(
            "update public.tactical_profile set is_current = true "
            "where club_id = %s and version = 1",
            (CRYSTAL_PALACE_CLUB_ID,),
        )
    db_conn.commit()


def test_pipeline_trigger_rejects_no_auth(client: TestClient) -> None:
    response = client.post("/admin/pipeline/trigger")
    assert response.status_code == 401


def test_pipeline_trigger_rejects_non_admin(
    client: TestClient, standard_user_token: str
) -> None:
    response = client.post(
        "/admin/pipeline/trigger", headers={"Authorization": f"Bearer {standard_user_token}"}
    )
    assert response.status_code == 403


def test_pipeline_trigger_admin_success(
    client: TestClient, admin_token: str, db_conn: PGConnection
) -> None:
    response = client.post(
        "/admin/pipeline/trigger", headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert response.status_code == 202
    body = response.json()
    assert body["status"] == "queued"

    with db_conn.cursor() as cur:
        cur.execute(
            "select status, triggered_by from public.pipeline_run where run_id = %s",
            (body["run_id"],),
        )
        row = cur.fetchone()
    assert row is not None
    assert row[0] == "queued"
    assert row[1] == "admin"

    with db_conn.cursor() as cur:
        cur.execute("delete from public.pipeline_run where run_id = %s", (body["run_id"],))
    db_conn.commit()
