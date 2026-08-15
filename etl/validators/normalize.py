"""Per-90 normalization (PA-02). Position-relative z-scoring is deliberately NOT done here —
see the Phase 2 plan's documented decision: it's deferred to Phase 3 (FastAPI scoring time),
computed from the raw per-90 values this module produces, since the Phase 1 schema stores no
z-score column and a pre-computed z-score would go stale as new data lands.
"""

from __future__ import annotations


def per_90(total: float, minutes_played: int) -> float | None:
    """Convert a season-total counting stat to a per-90-minutes rate. Returns None (not 0 or
    an error) for a zero-minutes player — there is no meaningful per-90 rate to report, and
    reporting 0.0 would misleadingly imply the player was measured and did nothing."""
    if minutes_played <= 0:
        return None
    return total / minutes_played * 90
