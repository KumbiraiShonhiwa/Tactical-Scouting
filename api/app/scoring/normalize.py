"""Position-relative z-score normalization (PA-02), deferred from Phase 2's ETL layer to
this query-time scoring service per the Phase 2 plan's documented decision — z-scores are
computed from the raw per-90 values Phase 1 already stores, not pre-computed and stored.
"""

from __future__ import annotations

import statistics

from scipy.stats import norm


def z_scores(values: dict[str, float | None]) -> dict[str, float]:
    """values: player_id -> raw stat value (None for missing data). Returns player_id ->
    z-score. Guards two degenerate cases that a small position peer group can genuinely hit
    (the 12-player golden seed dataset spans 12 distinct positions, so most groups have n=1):
    fewer than 2 present values, or zero variance, both return 0.0 (neutral) for every player
    rather than dividing by zero."""
    present = {k: v for k, v in values.items() if v is not None}
    if len(present) < 2:
        return dict.fromkeys(values, 0.0)

    mean = statistics.mean(present.values())
    stdev = statistics.pstdev(present.values())
    if stdev == 0:
        return dict.fromkeys(values, 0.0)

    return {k: (0.0 if v is None else (v - mean) / stdev) for k, v in values.items()}


def to_percentile(z: float) -> float:
    """Standard normal CDF: maps an unbounded z-score to (0, 1) — the non-negative
    'percentile within position peers' component used in the fit-score cosine similarity
    (see scoring/fit_score.py's module docstring for why non-negative components matter)."""
    return float(norm.cdf(z))
