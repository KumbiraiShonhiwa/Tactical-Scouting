"""Undervaluation index (UV-01): fit_score / value_percentile, where value_percentile is the
player's market-value rank (0-1) among same-position peers, floored to avoid a division
blow-up for the cheapest player in a group. This formula was an explicit Phase 3 decision
(docs/data-dictionary.md leaves it undefined at the schema layer) — see the Phase 3 plan.

Higher index = more undervalued (strong fit relative to a low relative cost). "Recommended"
(UV-03) flags players whose index exceeds a configurable threshold.
"""

from __future__ import annotations

from scipy.stats import percentileofscore

DEFAULT_VALUE_PERCENTILE_FLOOR = 0.05
DEFAULT_RECOMMENDED_THRESHOLD = 1.5


def value_percentile(
    player_valuation: float,
    peer_valuations: list[float],
    floor: float = DEFAULT_VALUE_PERCENTILE_FLOOR,
) -> float:
    """0 = cheapest in the peer group, 1 = most expensive. An empty peer group (this player
    is the only one with valuation data in their position) has nothing to rank against, so
    it's treated as the floor — maximally favorable for undervaluation, since there's no
    evidence this player is expensive relative to peers."""
    if not peer_valuations:
        return floor
    percentile = float(percentileofscore(peer_valuations, player_valuation, kind="mean")) / 100.0
    return max(percentile, floor)


def compute_undervaluation_index(
    fit_score: float,
    player_valuation: float | None,
    peer_valuations: list[float],
) -> float | None:
    """Returns None (not a fabricated number) when the player has no valuation — an
    undervaluation index is meaningless without a market value to compare against, per the
    data-quality skill's "never silently coerce" rule."""
    if player_valuation is None:
        return None
    percentile = value_percentile(player_valuation, peer_valuations)
    return fit_score / percentile


def is_recommended(
    index_value: float, threshold: float = DEFAULT_RECOMMENDED_THRESHOLD
) -> bool:
    return index_value > threshold
