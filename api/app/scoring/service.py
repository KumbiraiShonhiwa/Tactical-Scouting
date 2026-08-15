"""Orchestrates a full club recompute: every stats-having player scored against a club's
current tactical_profile, written as new fit_score/undervaluation_index rows. Called from
POST /internal/tactical-profiles/recompute (app/routers/internal.py), which the
recompute-fit-scores Edge Function invokes after a tactical_profile INSERT — the event-driven
path Phase 5 wired up. POST /admin/tactical-profiles/{club_id}/weightings itself no longer
calls this directly (Phase 3's synchronous version)."""

from __future__ import annotations

from psycopg2.extensions import connection as PGConnection

from app.scoring.fit_score import compute_fit_score
from app.scoring.repository import (
    age_from_dob,
    get_all_player_stats,
    get_latest_valuations,
    get_position_peers,
    insert_fit_score,
    insert_undervaluation_index,
)
from app.scoring.undervaluation import compute_undervaluation_index, is_recommended


def recompute_club(
    conn: PGConnection, club_id: str, profile_version: int, weightings: dict[str, float]
) -> int:
    """Returns the number of players scored."""
    all_players = get_all_player_stats(conn)
    valuations = get_latest_valuations(conn)

    processed = 0
    for player_id, stats_row in all_players.items():
        position = stats_row["position"]
        peers = get_position_peers(conn, position, players_by_id=all_players)

        score, contributing_metrics = compute_fit_score(
            player_id=player_id,
            player_stats_row=stats_row,
            position_peer_stats=peers,
            weightings=weightings,
        )
        fit_score_id = insert_fit_score(
            conn, player_id, club_id, profile_version, score, contributing_metrics
        )

        player_valuation = valuations.get(player_id)
        peer_valuations = [
            valuations[pid] for pid in peers if pid != player_id and pid in valuations
        ]
        index_value = compute_undervaluation_index(score, player_valuation, peer_valuations)
        if index_value is not None:
            insert_undervaluation_index(
                conn, player_id, club_id, fit_score_id, index_value, is_recommended(index_value)
            )

        processed += 1

    return processed


__all__ = ["recompute_club", "age_from_dob"]
