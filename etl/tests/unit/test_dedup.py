from validators.dedup import normalize_name, resolve_by_name


def test_normalize_strips_accents_and_case() -> None:
    assert normalize_name("Lisandro Martínez") == normalize_name("lisandro martinez")


def test_normalize_collapses_whitespace() -> None:
    assert normalize_name("  Bruno   Fernandes ") == "bruno fernandes"


def test_resolve_by_name_finds_match() -> None:
    known = {"bruno fernandes": "player-id-1"}
    assert resolve_by_name("Bruno Fernandes", known) == "player-id-1"


def test_resolve_by_name_no_match_returns_none() -> None:
    known = {"bruno fernandes": "player-id-1"}
    assert resolve_by_name("Someone Else", known) is None


def test_resolve_by_name_accent_insensitive() -> None:
    known = {normalize_name("Lisandro Martínez"): "player-id-2"}
    assert resolve_by_name("Lisandro Martinez", known) == "player-id-2"
