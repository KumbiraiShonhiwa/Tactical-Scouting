"""GET /players/{player_id}/fit-breakdown — prefers the stored fit_score row (guaranteed
consistent with what /recommendations shows for the same player); falls back to a live
single-player computation only when no stored score exists yet for this club's current
profile version (e.g. before an admin has ever triggered a recompute), per the Phase 3 plan.
"""

from __future__ import annotations

import json
from typing import Any

from fastapi import APIRouter, Depends, Query

from app.auth.admin import get_optional_claims
from app.db import get_connection
from app.errors import not_found
from app.schemas import ContributingMetric, FitBreakdownResponse
from app.scoring.fit_score import compute_fit_score
from app.scoring.repository import get_current_profile, get_player_stats, get_position_peers

router = APIRouter()


@router.get("/players/{player_id}/fit-breakdown", response_model=FitBreakdownResponse)
def get_fit_breakdown(
    player_id: str,
    club_id: str = Query(...),
    _claims: dict[str, Any] | None = Depends(get_optional_claims),
) -> FitBreakdownResponse:
    conn = get_connection()
    try:
        profile = get_current_profile(conn, club_id)
        if profile is None:
            raise not_found(f"club {club_id} has no current tactical profile")

        with conn.cursor() as cur:
            cur.execute(
                """
                select score, contributing_metrics
                from public.fit_score
                where player_id = %s and club_id = %s and profile_version = %s
                """,
                (player_id, club_id, profile["version"]),
            )
            stored = cur.fetchone()

        if stored is not None:
            raw_metrics = stored[1]
            # psycopg2 returns jsonb columns as a JSON string by default (no adapter
            # registered), not an already-parsed Python object.
            if isinstance(raw_metrics, str):
                raw_metrics = json.loads(raw_metrics)
            score, contributing_metrics = float(stored[0]), raw_metrics
        else:
            stats_row = get_player_stats(conn, player_id)
            if stats_row is None:
                raise not_found(f"player {player_id} has no statistics to score")
            peers = get_position_peers(conn, stats_row["position"])
            score, contributing_metrics = compute_fit_score(
                player_id=player_id,
                player_stats_row=stats_row,
                position_peer_stats=peers,
                weightings=profile["weightings"],
            )
    finally:
        conn.close()

    return FitBreakdownResponse(
        player_id=player_id,
        club_id=club_id,
        profile_version=profile["version"],
        overall_score=score,
        contributing_metrics=[ContributingMetric(**m) for m in contributing_metrics],
    )
