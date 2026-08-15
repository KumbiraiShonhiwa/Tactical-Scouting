from app.scoring.normalize import to_percentile, z_scores


def test_z_scores_basic() -> None:
    values: dict[str, float | None] = {"a": 10.0, "b": 20.0, "c": 30.0}
    result = z_scores(values)
    assert result["b"] == 0.0  # mean
    assert result["a"] < 0
    assert result["c"] > 0


def test_z_scores_single_value_returns_neutral() -> None:
    result = z_scores({"a": 10.0})
    assert result == {"a": 0.0}


def test_z_scores_all_none_returns_neutral() -> None:
    result = z_scores({"a": None, "b": None})
    assert result == {"a": 0.0, "b": 0.0}


def test_z_scores_zero_variance_returns_neutral() -> None:
    result = z_scores({"a": 5.0, "b": 5.0, "c": 5.0})
    assert result == {"a": 0.0, "b": 0.0, "c": 0.0}


def test_z_scores_missing_value_stays_none_mapped_to_zero() -> None:
    result = z_scores({"a": 10.0, "b": 20.0, "c": None})
    assert result["c"] == 0.0


def test_to_percentile_zero_z_is_half() -> None:
    assert to_percentile(0.0) == 0.5


def test_to_percentile_monotonic() -> None:
    assert to_percentile(-2.0) < to_percentile(0.0) < to_percentile(2.0)


def test_to_percentile_bounded_between_zero_and_one() -> None:
    assert 0.0 < to_percentile(-5.0) < 1.0
    assert 0.0 < to_percentile(5.0) < 1.0
