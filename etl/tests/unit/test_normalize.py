from validators.normalize import per_90


def test_per_90_basic_conversion() -> None:
    assert per_90(9, 900) == 0.9


def test_per_90_zero_minutes_returns_none() -> None:
    assert per_90(5, 0) is None


def test_per_90_negative_minutes_returns_none() -> None:
    assert per_90(5, -10) is None


def test_per_90_single_appearance_edge_case() -> None:
    # A player with 1 minute and 1 goal has an inflated but defined per-90 rate.
    assert per_90(1, 1) == 90.0
