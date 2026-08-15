import pytest
from pydantic import ValidationError

from app.schemas import RecommendationsQuery, WeightingsRequest

VALID_WEIGHTINGS = {
    "possession_share": 0.2,
    "ppda": 0.2,
    "buildup_speed": 0.2,
    "defensive_line_height": 0.2,
    "crossing_frequency": 0.1,
    "pressing_intensity": 0.1,
}


def test_valid_weightings_pass() -> None:
    request = WeightingsRequest(weightings=VALID_WEIGHTINGS)
    assert request.weightings == VALID_WEIGHTINGS


def test_weightings_not_summing_to_one_rejected() -> None:
    bad = {**VALID_WEIGHTINGS, "possession_share": 0.9}
    with pytest.raises(ValidationError):
        WeightingsRequest(weightings=bad)


def test_negative_weight_rejected() -> None:
    bad = {**VALID_WEIGHTINGS, "possession_share": -0.1, "ppda": 0.3}
    with pytest.raises(ValidationError):
        WeightingsRequest(weightings=bad)


def test_missing_weighting_key_rejected() -> None:
    incomplete = {k: v for k, v in VALID_WEIGHTINGS.items() if k != "pressing_intensity"}
    with pytest.raises(ValidationError):
        WeightingsRequest(weightings=incomplete)


def test_unknown_weighting_key_rejected() -> None:
    bad = {**VALID_WEIGHTINGS, "unknown_dimension": 0.0}
    with pytest.raises(ValidationError):
        WeightingsRequest(weightings=bad)


def test_valid_recommendations_query_passes() -> None:
    query = RecommendationsQuery(position="CM", min_minutes=900)
    assert query.position == "CM"
    assert query.sort == "fit_score_desc"


def test_invalid_position_rejected() -> None:
    with pytest.raises(ValidationError):
        RecommendationsQuery(position="SWEEPER")


def test_negative_min_minutes_rejected() -> None:
    with pytest.raises(ValidationError):
        RecommendationsQuery(min_minutes=-1)


def test_age_out_of_range_rejected() -> None:
    with pytest.raises(ValidationError):
        RecommendationsQuery(age_min=10)
    with pytest.raises(ValidationError):
        RecommendationsQuery(age_max=99)


def test_page_size_over_max_rejected() -> None:
    with pytest.raises(ValidationError):
        RecommendationsQuery(page_size=101)
