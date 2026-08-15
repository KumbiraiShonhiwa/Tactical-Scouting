"""Integration tests against the golden seed dataset (supabase/seed.sql) — Manchester United
(c1111111-1111-1111-1111-111111111111) has two seeded players: a ST with fit_score 0.8421 /
1980 minutes, and a CM with fit_score 0.7715 / 2100 minutes."""

from fastapi.testclient import TestClient

MAN_UTD_CLUB_ID = "c1111111-1111-1111-1111-111111111111"
UNKNOWN_BUT_VALID_CLUB_ID = "c6666666-6666-6666-6666-666666666666"  # Crystal Palace, also seeded


def test_recommendations_ranked_by_fit_score_desc(client: TestClient) -> None:
    response = client.get(f"/clubs/{MAN_UTD_CLUB_ID}/recommendations")
    assert response.status_code == 200
    body = response.json()
    assert body["club_id"] == MAN_UTD_CLUB_ID
    assert body["profile_version"] == 1
    scores = [p["fit_score"] for p in body["players"]]
    assert scores == sorted(scores, reverse=True)
    assert len(body["players"]) == 2


def test_recommendations_filters_by_position(client: TestClient) -> None:
    response = client.get(f"/clubs/{MAN_UTD_CLUB_ID}/recommendations", params={"position": "CM"})
    assert response.status_code == 200
    body = response.json()
    assert all(p["position"] == "CM" for p in body["players"])
    assert len(body["players"]) == 1


def test_recommendations_filters_by_min_minutes(client: TestClient) -> None:
    response = client.get(
        f"/clubs/{MAN_UTD_CLUB_ID}/recommendations", params={"min_minutes": 2000}
    )
    assert response.status_code == 200
    body = response.json()
    assert all(p["minutes_played"] >= 2000 for p in body["players"])
    assert len(body["players"]) == 1


def test_recommendations_pagination(client: TestClient) -> None:
    response = client.get(
        f"/clubs/{MAN_UTD_CLUB_ID}/recommendations", params={"page": 1, "page_size": 1}
    )
    assert response.status_code == 200
    body = response.json()
    assert len(body["players"]) == 1
    assert body["pagination"]["total_count"] == 2
    assert body["pagination"]["total_pages"] == 2


def test_recommendations_unknown_club_returns_404(client: TestClient) -> None:
    response = client.get("/clubs/00000000-0000-0000-0000-000000000099/recommendations")
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "not_found"


def test_recommendations_invalid_position_returns_422(client: TestClient) -> None:
    response = client.get(
        f"/clubs/{MAN_UTD_CLUB_ID}/recommendations", params={"position": "SWEEPER"}
    )
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "validation_error"


def test_recommendations_undervaluation_sort(client: TestClient) -> None:
    response = client.get(
        f"/clubs/{MAN_UTD_CLUB_ID}/recommendations", params={"sort": "undervaluation_desc"}
    )
    assert response.status_code == 200
    body = response.json()
    indices = [p["undervaluation_index"] for p in body["players"]]
    assert indices == sorted(indices, reverse=True)
