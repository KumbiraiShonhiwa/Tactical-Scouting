from fastapi.testclient import TestClient

MAN_UTD_CLUB_ID = "c1111111-1111-1111-1111-111111111111"
FORWARD_PLAYER_ID = "b1111111-0001-0001-0001-000000000001"


def test_fit_breakdown_uses_stored_score(client: TestClient) -> None:
    response = client.get(
        f"/players/{FORWARD_PLAYER_ID}/fit-breakdown", params={"club_id": MAN_UTD_CLUB_ID}
    )
    assert response.status_code == 200
    body = response.json()
    assert body["player_id"] == FORWARD_PLAYER_ID
    assert body["profile_version"] == 1
    # Matches the seeded fit_score row exactly (0.8421) — proves it read the stored row
    # rather than recomputing live with the real (unseeded) player_statistics vectors.
    assert body["overall_score"] == 0.8421


def test_fit_breakdown_unknown_club_returns_404(client: TestClient) -> None:
    response = client.get(
        f"/players/{FORWARD_PLAYER_ID}/fit-breakdown",
        params={"club_id": "00000000-0000-0000-0000-000000000099"},
    )
    assert response.status_code == 404
