import type {
  ErrorEnvelope,
  FitBreakdownResponse,
  PipelineTriggerResponse,
  RecommendationsFilters,
  RecommendationsResponse,
  WeightingsRequest,
  WeightingsResponse,
} from "./types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export class ApiError extends Error {
  code: string;
  status: number;
  details: Record<string, unknown>;

  constructor(status: number, envelope: ErrorEnvelope) {
    super(envelope.error.message);
    this.name = "ApiError";
    this.code = envelope.error.code;
    this.status = status;
    this.details = envelope.error.details;
  }
}

async function request<T>(
  path: string,
  options: RequestInit & { accessToken?: string } = {},
): Promise<T> {
  const { accessToken, headers, ...rest } = options;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...headers,
    },
  });

  if (!response.ok) {
    const envelope = (await response.json()) as ErrorEnvelope;
    throw new ApiError(response.status, envelope);
  }

  return (await response.json()) as T;
}

function buildQueryString(filters: RecommendationsFilters): string {
  const params = new URLSearchParams();
  if (filters.position) params.set("position", filters.position);
  if (filters.age_min !== undefined) params.set("age_min", String(filters.age_min));
  if (filters.age_max !== undefined) params.set("age_max", String(filters.age_max));
  if (filters.min_minutes !== undefined)
    params.set("min_minutes", String(filters.min_minutes));
  if (filters.sort) params.set("sort", filters.sort);
  if (filters.recommended_only) params.set("recommended_only", "true");
  if (filters.page !== undefined) params.set("page", String(filters.page));
  if (filters.page_size !== undefined) params.set("page_size", String(filters.page_size));
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export const apiClient = {
  getRecommendations(
    clubId: string,
    filters: RecommendationsFilters = {},
  ): Promise<RecommendationsResponse> {
    return request(`/clubs/${clubId}/recommendations${buildQueryString(filters)}`);
  },

  getFitBreakdown(playerId: string, clubId: string): Promise<FitBreakdownResponse> {
    return request(
      `/players/${playerId}/fit-breakdown?${new URLSearchParams({ club_id: clubId })}`,
    );
  },

  saveWeightings(
    clubId: string,
    payload: WeightingsRequest,
    accessToken: string,
  ): Promise<WeightingsResponse> {
    return request(`/admin/tactical-profiles/${clubId}/weightings`, {
      method: "POST",
      body: JSON.stringify(payload),
      accessToken,
    });
  },

  triggerPipeline(accessToken: string): Promise<PipelineTriggerResponse> {
    return request(`/admin/pipeline/trigger`, {
      method: "POST",
      accessToken,
    });
  },
};
