"""Tactical fit score (PA-01): cosine_similarity(player_vector, club_weight_vector), where
both vectors have only non-negative components — this is what makes the Testing
Documentation's boundary cases hold exactly (identical -> 1.0, orthogonal -> 0, UT-PA-014)
without an artificial (cos+1)/2 rescale.

Player-side components are the standard-normal CDF of each dimension's position-relative
z-score (scoring/normalize.py) — a smooth (0,1) "percentile within position peers" value.
Club-side components are tactical_profile.weightings, renormalized over the 5 dimensions that
have a real player-side proxy (see docs/data-dictionary.md: defensive_line_height is a
team-shape metric with no such proxy, so it's excluded here and doesn't affect player scoring,
per the Phase 3 plan's documented decision — it stays fully editable at the club level, TP-02).
"""

from __future__ import annotations

import numpy as np
from sklearn.metrics.pairwise import cosine_similarity as sk_cosine_similarity

from app.scoring.normalize import to_percentile, z_scores

SCORABLE_DIMENSIONS = (
    "possession_share",
    "ppda",
    "buildup_speed",
    "crossing_frequency",
    "pressing_intensity",
)

DIMENSION_LABELS = {
    "possession_share": "Possession involvement",
    "ppda": "Pressing / defensive-actions intensity (PPDA proxy)",
    "buildup_speed": "Buildup progression speed",
    "crossing_frequency": "Crossing frequency",
    "pressing_intensity": "Pressing intensity",
}

# Maps each scorable dimension to its player_statistics proxy column(s), per
# docs/data-dictionary.md's documented per-90-column mapping.
DIMENSION_PROXY_COLUMNS: dict[str, tuple[str, ...]] = {
    "possession_share": ("possession_involvement_pct",),
    "ppda": ("defensive_actions_per90",),
    "buildup_speed": ("progressive_passes_per90", "progressive_carries_per90"),
    "crossing_frequency": ("crosses_per90",),
    "pressing_intensity": ("pressures_per90",),
}


def dimension_raw_value(stats_row: dict[str, float | None], dimension: str) -> float | None:
    """Sums the proxy column(s) for a dimension; None if every proxy column is missing
    (rather than treating missing data as zero, which would misrepresent it)."""
    columns = DIMENSION_PROXY_COLUMNS[dimension]
    values = [stats_row.get(col) for col in columns]
    present = [v for v in values if v is not None]
    if not present:
        return None
    return sum(present)


def renormalize_weights(weightings: dict[str, float]) -> dict[str, float]:
    """Renormalizes tactical_profile.weightings over the 5 scorable dimensions only."""
    scorable = {k: v for k, v in weightings.items() if k in SCORABLE_DIMENSIONS}
    total = sum(scorable.values())
    if total <= 0:
        # All weight was on defensive_line_height (or weightings were empty) — spread evenly
        # across the scorable dimensions rather than producing an undefined/zero score.
        n = len(SCORABLE_DIMENSIONS)
        return {dim: 1.0 / n for dim in SCORABLE_DIMENSIONS}
    return {k: v / total for k, v in scorable.items()}


def cosine_similarity(vector_a: list[float], vector_b: list[float]) -> float:
    """Wraps scikit-learn's cosine_similarity (ADD 5.2 / fastapi-analysis skill: "use
    scikit-learn for the specified similarity/clustering work"). Both inputs are expected to
    have only non-negative components (see module docstring) — a zero vector (all-missing
    player data, or all-zero club weights) has no defined direction, so it scores 0.0 rather
    than raising a division-by-zero inside scikit-learn."""
    array_a = np.array(vector_a)
    array_b = np.array(vector_b)
    if not np.any(array_a) or not np.any(array_b):
        return 0.0
    result = sk_cosine_similarity(array_a.reshape(1, -1), array_b.reshape(1, -1))[0][0]
    return float(min(1.0, max(0.0, result)))


def compute_fit_score(
    player_id: str,
    player_stats_row: dict[str, float | None],
    position_peer_stats: dict[str, dict[str, float | None]],
    weightings: dict[str, float],
) -> tuple[float, list[dict[str, object]]]:
    """position_peer_stats: player_id -> that player's full stats row, for every player in
    the target player's position peer group (including the target player). Returns
    (fit_score, contributing_metrics) — contributing_metrics' per-dimension `contribution`
    values are the exact normalized dot-product terms that sum to fit_score, not just
    weight * percentile, so they add up to something meaningful for PA-05 explainability."""
    weights = renormalize_weights(weightings)

    player_vector: list[float] = []
    club_vector: list[float] = []
    raw_values: list[float | None] = []
    dimensions = sorted(weights)  # deterministic order shared by both vectors

    for dimension in dimensions:
        peer_values = {
            pid: dimension_raw_value(stats, dimension)
            for pid, stats in position_peer_stats.items()
        }
        z = z_scores(peer_values).get(player_id, 0.0)
        percentile = to_percentile(z)
        player_vector.append(percentile)
        club_vector.append(weights[dimension])
        raw_values.append(dimension_raw_value(player_stats_row, dimension))

    score = cosine_similarity(player_vector, club_vector)

    norm_p = float(np.linalg.norm(player_vector))
    norm_c = float(np.linalg.norm(club_vector))
    denom = norm_p * norm_c

    contributions: list[dict[str, object]] = []
    for i, dimension in enumerate(dimensions):
        contribution = (player_vector[i] * club_vector[i]) / denom if denom > 0 else 0.0
        contributions.append(
            {
                "metric": dimension,
                "label": DIMENSION_LABELS[dimension],
                "player_value": raw_values[i],
                "club_target_value": weights[dimension],
                "weight": weights[dimension],
                "contribution": contribution,
            }
        )

    return score, contributions
