import pytest

from app.scoring.fit_score import (
    compute_fit_score,
    cosine_similarity,
    dimension_raw_value,
    renormalize_weights,
)


def test_cosine_similarity_identical_vectors_is_one() -> None:
    assert cosine_similarity([1, 1, 1, 1, 1], [1, 1, 1, 1, 1]) == pytest.approx(1.0)


def test_cosine_similarity_orthogonal_vectors_is_zero() -> None:
    assert cosine_similarity([1, 0, 0, 0, 0], [0, 1, 0, 0, 0]) == 0.0


def test_cosine_similarity_proportional_vectors_is_one() -> None:
    # Same direction, different magnitude — cosine similarity is direction-only.
    assert cosine_similarity([2, 4, 6], [1, 2, 3]) == pytest.approx(1.0)


def test_cosine_similarity_zero_vector_is_zero_not_an_error() -> None:
    assert cosine_similarity([0, 0, 0], [1, 1, 1]) == 0.0
    assert cosine_similarity([1, 1, 1], [0, 0, 0]) == 0.0


def test_renormalize_weights_excludes_defensive_line_height() -> None:
    weightings = {
        "possession_share": 0.2,
        "ppda": 0.2,
        "buildup_speed": 0.2,
        "defensive_line_height": 0.2,
        "crossing_frequency": 0.1,
        "pressing_intensity": 0.1,
    }
    result = renormalize_weights(weightings)
    assert "defensive_line_height" not in result
    assert abs(sum(result.values()) - 1.0) < 1e-9


def test_renormalize_weights_all_weight_on_excluded_dimension_spreads_evenly() -> None:
    weightings = {"defensive_line_height": 1.0}
    result = renormalize_weights(weightings)
    assert abs(sum(result.values()) - 1.0) < 1e-9
    assert len(set(result.values())) == 1  # spread evenly


def test_dimension_raw_value_sums_multiple_proxy_columns() -> None:
    stats: dict[str, float | None] = {
        "progressive_passes_per90": 3.0,
        "progressive_carries_per90": 2.0,
    }
    assert dimension_raw_value(stats, "buildup_speed") == 5.0


def test_dimension_raw_value_missing_data_returns_none() -> None:
    stats: dict[str, float | None] = {
        "progressive_passes_per90": None,
        "progressive_carries_per90": None,
    }
    assert dimension_raw_value(stats, "buildup_speed") is None


def test_compute_fit_score_returns_score_in_valid_range_and_contributions_sum_to_score() -> None:
    weightings = {
        "possession_share": 0.2,
        "ppda": 0.2,
        "buildup_speed": 0.2,
        "defensive_line_height": 0.2,
        "crossing_frequency": 0.1,
        "pressing_intensity": 0.1,
    }
    peers: dict[str, dict[str, float | None]] = {
        "p1": {
            "possession_involvement_pct": 60.0,
            "defensive_actions_per90": 5.0,
            "progressive_passes_per90": 4.0,
            "progressive_carries_per90": 2.0,
            "crosses_per90": 1.0,
            "pressures_per90": 10.0,
        },
        "p2": {
            "possession_involvement_pct": 30.0,
            "defensive_actions_per90": 2.0,
            "progressive_passes_per90": 2.0,
            "progressive_carries_per90": 1.0,
            "crosses_per90": 0.5,
            "pressures_per90": 5.0,
        },
    }

    score, contributions = compute_fit_score(
        player_id="p1",
        player_stats_row=peers["p1"],
        position_peer_stats=peers,
        weightings=weightings,
    )

    assert 0.0 <= score <= 1.0
    assert len(contributions) == 5  # defensive_line_height excluded
    total_contribution = sum(c["contribution"] for c in contributions)  # type: ignore[misc]
    assert total_contribution == pytest.approx(score)


def test_compute_fit_score_single_player_peer_group_does_not_crash() -> None:
    # Only one player at this position — z-score normalization must guard n<2 gracefully.
    weightings = {"possession_share": 1.0}
    stats: dict[str, float | None] = {
        "possession_involvement_pct": 50.0,
        "defensive_actions_per90": 3.0,
        "progressive_passes_per90": 3.0,
        "progressive_carries_per90": 1.0,
        "crosses_per90": 1.0,
        "pressures_per90": 8.0,
    }
    score, contributions = compute_fit_score(
        player_id="solo",
        player_stats_row=stats,
        position_peer_stats={"solo": stats},
        weightings=weightings,
    )
    assert 0.0 <= score <= 1.0
