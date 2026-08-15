"""Admin-only routes: POST /admin/tactical-profiles/{club_id}/weightings (TP-02, TP-04, UC-5)
and POST /admin/pipeline/trigger (DC-08).
"""

from __future__ import annotations

import json
from collections.abc import Callable
from typing import Any

from fastapi import APIRouter, Depends

from app.auth.admin import require_admin
from app.db import get_connection
from app.errors import not_found
from app.github import dispatch_etl_workflow
from app.schemas import PipelineTriggerResponse, WeightingsRequest, WeightingsResponse

router = APIRouter()


def get_github_dispatcher() -> Callable[[str, str], None]:
    """Overridden in tests so no real GitHub API call is ever made — see
    api/app/github.py's module docstring."""
    return dispatch_etl_workflow


@router.post(
    "/admin/tactical-profiles/{club_id}/weightings",
    response_model=WeightingsResponse,
    status_code=201,
)
def update_weightings(
    club_id: str,
    body: WeightingsRequest,
    _claims: dict[str, Any] = Depends(require_admin),
) -> WeightingsResponse:
    """Writes the new tactical_profile version only. The recompute itself happens
    asynchronously: a database trigger (public.notify_recompute_fit_scores, see the Phase 5
    migration) fires on the row this INSERT creates and calls the recompute-fit-scores Edge
    Function, which invokes POST /internal/tactical-profiles/recompute — off this request's
    response cycle, per the ADD's event-driven design for UC-5."""
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("select 1 from public.club where club_id = %s", (club_id,))
            if cur.fetchone() is None:
                raise not_found(f"club {club_id} not found")

            cur.execute(
                "select version from public.tactical_profile where club_id = %s and is_current",
                (club_id,),
            )
            current = cur.fetchone()
            next_version = (current[0] + 1) if current is not None else 1

            cur.execute(
                "update public.tactical_profile set is_current = false "
                "where club_id = %s and is_current",
                (club_id,),
            )

            cur.execute(
                """
                insert into public.tactical_profile (club_id, version, weightings, is_current)
                values (%s, %s, %s, true)
                """,
                (club_id, next_version, json.dumps(body.weightings)),
            )

        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

    return WeightingsResponse(
        club_id=club_id, profile_version=next_version, recompute_status="enqueued"
    )


@router.post("/admin/pipeline/trigger", response_model=PipelineTriggerResponse, status_code=202)
def trigger_pipeline(
    _claims: dict[str, Any] = Depends(require_admin),
    dispatcher: Callable[[str, str], None] = Depends(get_github_dispatcher),
) -> PipelineTriggerResponse:
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                insert into public.pipeline_run (status, triggered_by)
                values ('queued', 'admin')
                returning run_id
                """
            )
            row = cur.fetchone()
        conn.commit()
    finally:
        conn.close()

    assert row is not None
    run_id = str(row[0])

    # run_id is threaded through to etl-schedule.yml so run_pipeline.py updates this exact
    # row instead of creating a second, disconnected one (the Phase 5 orphaned-row fix).
    dispatcher("admin", run_id)

    return PipelineTriggerResponse(run_id=run_id, status="queued")
