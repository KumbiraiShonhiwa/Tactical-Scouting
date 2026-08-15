"""Internal, service-to-service routes — not part of docs/api-spec.yaml's public contract.
Currently just the recompute callback the recompute-fit-scores Edge Function invokes after a
tactical_profile INSERT (Phase 5): the admin route only writes the new profile version and
returns recompute_status="enqueued"; the actual scoring happens here, off the request/response
cycle, matching the ADD's event-driven design for UC-5.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends

from app.auth.internal import require_internal_secret
from app.db import get_connection
from app.schemas import InternalRecomputeRequest, InternalRecomputeResponse
from app.scoring.service import recompute_club

router = APIRouter(prefix="/internal", dependencies=[Depends(require_internal_secret)])


@router.post("/tactical-profiles/recompute", response_model=InternalRecomputeResponse)
def recompute(body: InternalRecomputeRequest) -> InternalRecomputeResponse:
    conn = get_connection()
    try:
        processed = recompute_club(conn, body.club_id, body.profile_version, body.weightings)
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

    return InternalRecomputeResponse(
        club_id=body.club_id, profile_version=body.profile_version, players_scored=processed
    )
