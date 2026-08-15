// Phase 5, ADD §5.3: invoked by the public.notify_recompute_fit_scores() Postgres trigger (via
// pg_net) whenever a new *current* tactical_profile row is inserted (UC-5). Forwards to the
// FastAPI analysis service's internal recompute route rather than reimplementing the
// cosine-similarity/z-scoring algorithm in Deno, which would risk drift between two
// implementations of the same scoring logic (see the Phase 5 plan's "problem with calling
// FastAPI's scoring logic from an Edge Function" note).

import { SECURITY_HEADERS } from "../_shared/security-headers.ts";

interface RecomputePayload {
  club_id: string;
  profile_version: number;
  weightings: Record<string, number>;
}

export function isRecomputePayload(value: unknown): value is RecomputePayload {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.club_id === "string" &&
    typeof v.profile_version === "number" &&
    typeof v.weightings === "object" &&
    v.weightings !== null
  );
}

export async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method not allowed" }), {
      status: 405,
      headers: SECURITY_HEADERS,
    });
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid JSON body" }), {
      status: 400,
      headers: SECURITY_HEADERS,
    });
  }

  if (!isRecomputePayload(payload)) {
    return new Response(
      JSON.stringify({ error: "body must include club_id, profile_version, weightings" }),
      { status: 400, headers: SECURITY_HEADERS },
    );
  }

  const apiBaseUrl = Deno.env.get("API_BASE_URL");
  const internalSecret = Deno.env.get("INTERNAL_FUNCTION_SECRET");
  if (!apiBaseUrl || !internalSecret) {
    console.error("recompute-fit-scores: API_BASE_URL / INTERNAL_FUNCTION_SECRET not set");
    return new Response(JSON.stringify({ error: "function misconfigured" }), {
      status: 500,
      headers: SECURITY_HEADERS,
    });
  }

  const response = await fetch(`${apiBaseUrl}/internal/tactical-profiles/recompute`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Internal-Secret": internalSecret,
    },
    body: JSON.stringify(payload),
  });

  const body = await response.text();
  if (!response.ok) {
    console.error(`recompute-fit-scores: internal route returned ${response.status}: ${body}`);
  }

  return new Response(body, {
    status: response.status,
    headers: { "Content-Type": "application/json", ...SECURITY_HEADERS },
  });
}

if (import.meta.main) {
  Deno.serve(handler);
}
