import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";
import { server } from "../test/mocks/server";
import { apiClient, ApiError } from "./apiClient";
import { mockClub, mockRecommendation } from "../test/mocks/handlers";

const API_BASE_URL = "http://localhost:8000";

describe("apiClient.getRecommendations", () => {
  it("returns the parsed recommendations response", async () => {
    const result = await apiClient.getRecommendations(mockClub.club_id);
    expect(result.players).toEqual([mockRecommendation]);
  });

  it("serializes filters into the query string", async () => {
    let capturedUrl = "";
    server.use(
      http.get(`${API_BASE_URL}/clubs/:clubId/recommendations`, ({ request }) => {
        capturedUrl = request.url;
        return HttpResponse.json({
          club_id: mockClub.club_id,
          profile_version: 1,
          players: [],
          pagination: { page: 1, page_size: 25, total_count: 0, total_pages: 0 },
        });
      }),
    );
    await apiClient.getRecommendations(mockClub.club_id, {
      position: "ST",
      recommended_only: true,
      page: 2,
    });
    expect(capturedUrl).toContain("position=ST");
    expect(capturedUrl).toContain("recommended_only=true");
    expect(capturedUrl).toContain("page=2");
  });

  it("throws an ApiError with the envelope's code/message on a non-2xx response", async () => {
    server.use(
      http.get(`${API_BASE_URL}/clubs/:clubId/recommendations`, () =>
        HttpResponse.json(
          { error: { code: "not_found", message: "Club not found", details: {} } },
          { status: 404 },
        ),
      ),
    );
    await expect(apiClient.getRecommendations("missing-club")).rejects.toMatchObject({
      code: "not_found",
      status: 404,
      message: "Club not found",
    });
    await expect(apiClient.getRecommendations("missing-club")).rejects.toBeInstanceOf(ApiError);
  });
});

describe("apiClient.saveWeightings", () => {
  it("attaches the bearer token to the request", async () => {
    let capturedAuth: string | null = null;
    server.use(
      http.post(`${API_BASE_URL}/admin/tactical-profiles/:clubId/weightings`, ({ request }) => {
        capturedAuth = request.headers.get("Authorization");
        return HttpResponse.json(
          { club_id: mockClub.club_id, profile_version: 2, recompute_status: "completed" },
          { status: 201 },
        );
      }),
    );
    await apiClient.saveWeightings(
      mockClub.club_id,
      {
        weightings: {
          possession_share: 0.2,
          ppda: 0.2,
          buildup_speed: 0.15,
          defensive_line_height: 0.15,
          crossing_frequency: 0.15,
          pressing_intensity: 0.15,
        },
      },
      "test-token",
    );
    expect(capturedAuth).toBe("Bearer test-token");
  });
});
