import pytest

from app.scoring.undervaluation import (
    compute_undervaluation_index,
    is_recommended,
    value_percentile,
)


def test_value_percentile_cheapest_gets_low_percentile() -> None:
    percentile = value_percentile(1.0, [1.0, 5.0, 10.0])
    assert percentile <= 0.5


def test_value_percentile_most_expensive_gets_high_percentile() -> None:
    percentile = value_percentile(10.0, [1.0, 5.0, 10.0])
    assert percentile > 0.5


def test_value_percentile_empty_peer_group_returns_floor() -> None:
    assert value_percentile(5.0, []) == 0.05


def test_value_percentile_never_below_floor() -> None:
    # Even the absolute cheapest player shouldn't produce a percentile of 0 (division blow-up).
    percentile = value_percentile(0.01, [0.01, 100.0, 200.0])
    assert percentile >= 0.05


def test_compute_undervaluation_index_no_valuation_returns_none() -> None:
    index = compute_undervaluation_index(
        fit_score=0.8, player_valuation=None, peer_valuations=[1.0]
    )
    assert index is None


@pytest.mark.parametrize(
    ("fit_score", "valuation", "peers", "expected_min"),
    [
        (0.9, 1.0, [1.0, 50.0, 100.0], 1.0),  # high fit, cheapest -> high undervaluation
        (0.2, 100.0, [1.0, 50.0, 100.0], 0.0),  # low fit, most expensive -> low undervaluation
    ],
)
def test_compute_undervaluation_index_parametrized(
    fit_score: float, valuation: float, peers: list[float], expected_min: float
) -> None:
    index = compute_undervaluation_index(fit_score, valuation, peers)
    assert index is not None
    assert index >= expected_min


def test_higher_fit_lower_valuation_scores_higher_than_lower_fit_higher_valuation() -> None:
    peers = [1.0, 50.0, 100.0]
    undervalued = compute_undervaluation_index(0.9, 1.0, peers)
    overvalued = compute_undervaluation_index(0.3, 100.0, peers)
    assert undervalued is not None
    assert overvalued is not None
    assert undervalued > overvalued


def test_is_recommended_threshold_boundary() -> None:
    assert not is_recommended(1.5, threshold=1.5)  # strictly greater than, not >=
    assert is_recommended(1.51, threshold=1.5)
    assert not is_recommended(1.0, threshold=1.5)
