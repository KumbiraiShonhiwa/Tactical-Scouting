// Phase 5, ADD §5.4/§5.3 (generate-export, DV-06): renders the currently-filtered shortlist
// as a CSV, writes it to the private "exports" Storage bucket (see the Phase 5 migration —
// no anon/authenticated policies exist on it), and returns a short-lived signed URL. Phase 4
// already ships a fully-functional client-side CSV download in ExportButton; this is the
// additive "get a shareable link" action, per the Phase 5 plan's decision to keep both.
//
// Deliberately does NOT trust client-supplied player rows — it re-fetches the authoritative
// ranked list from the public GET /clubs/{club_id}/recommendations FastAPI route itself
// (already anon-accessible, no new auth surface needed), matching "renders a shortlist" in
// the ADD rather than "uploads whatever the caller sent."

import { SECURITY_HEADERS } from "../_shared/security-headers.ts";
import { checkRateLimit } from "../_shared/rate-limit.ts";

interface ExportFilters {
  position?: string;
  age_min?: number;
  age_max?: number;
  min_minutes?: number;
  sort?: string;
  recommended_only?: boolean;
}

interface ExportRequest {
  club_id: string;
  filters?: ExportFilters;
}

// General UUID shape (8-4-4-4-12 hex), not a strict v4-only check — the seeded golden dataset's
// club_ids (e.g. "c1111111-1111-1111-1111-111111111111") are synthetic and don't set the
// version/variant nibbles a strict RFC 4122 v4 regex would require.
const UUID_SHAPE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// VibeSec audit finding (low): club_id is used to build a Storage object path
// (`${club_id}/${Date.now()}.csv`) below — previously only checked for "non-empty string",
// so a value like "../../whatever" would have been accepted and used as a path segment.
// Constraining it to a real UUID shape closes that off without needing a DB round-trip here.
export function isExportRequest(value: unknown): value is ExportRequest {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.club_id === "string" && UUID_SHAPE.test(v.club_id);
}

interface PlayerRecommendation {
  player_id: string;
  full_name: string;
  position: string;
  age: number | null;
  minutes_played: number;
  fit_score: number;
  undervaluation_index: number;
  recommended: boolean;
  current_valuation: number | null;
  valuation_currency: string;
}

function escapeCsvCell(value: string | number | boolean | null): string {
  const str = value === null ? "" : String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// Same column shape as frontend/src/lib/csv.utils.ts's buildCsv + ExportButton's row mapping,
// kept in sync deliberately (both are small, stable, and independently unit-tested).
export function buildExportCsv(players: PlayerRecommendation[]): string {
  const headers = [
    "player",
    "position",
    "age",
    "minutes_played",
    "fit_score",
    "undervaluation_index",
    "recommended",
    "current_valuation",
    "currency",
  ];
  const lines = [headers.join(",")];
  for (const p of players) {
    lines.push(
      [
        escapeCsvCell(p.full_name),
        escapeCsvCell(p.position),
        escapeCsvCell(p.age),
        escapeCsvCell(p.minutes_played),
        escapeCsvCell(p.fit_score),
        escapeCsvCell(p.undervaluation_index),
        escapeCsvCell(p.recommended),
        escapeCsvCell(p.current_valuation),
        escapeCsvCell(p.valuation_currency),
      ].join(","),
    );
  }
  return lines.join("\r\n");
}

function buildRecommendationsQuery(filters: ExportFilters | undefined): string {
  const params = new URLSearchParams();
  if (!filters) return "";
  if (filters.position) params.set("position", filters.position);
  if (filters.age_min !== undefined) params.set("age_min", String(filters.age_min));
  if (filters.age_max !== undefined) params.set("age_max", String(filters.age_max));
  if (filters.min_minutes !== undefined) params.set("min_minutes", String(filters.min_minutes));
  if (filters.sort) params.set("sort", filters.sort);
  if (filters.recommended_only) params.set("recommended_only", "true");
  params.set("page_size", "100"); // export the full filtered pool, not just one page
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method not allowed" }), {
      status: 405,
      headers: SECURITY_HEADERS,
    });
  }

  // VibeSec audit finding (low): this function had no rate limiting of its own, unlike every
  // FastAPI route — a caller with a valid Supabase JWT (the platform-level verify_jwt gate
  // already requires one) could otherwise spam it to fill the private Storage bucket / rack up
  // cost. Keyed by the raw Authorization header rather than IP, since that's the actual
  // authenticated principal and more reliable behind a proxy/NAT.
  const authKey = req.headers.get("Authorization") ?? "anonymous";
  const limitPerMinute = Number(Deno.env.get("EXPORT_RATE_LIMIT_PER_MINUTE") ?? "10");
  if (!checkRateLimit(authKey, limitPerMinute)) {
    return new Response(JSON.stringify({ error: "rate limit exceeded" }), {
      status: 429,
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

  if (!isExportRequest(payload)) {
    return new Response(JSON.stringify({ error: "body must include a valid club_id" }), {
      status: 400,
      headers: SECURITY_HEADERS,
    });
  }

  const apiBaseUrl = Deno.env.get("API_BASE_URL");
  // SUPABASE_URL is auto-injected by the Supabase runtime and resolves to the *internal*
  // Docker-network address (e.g. http://kong:8000 locally) — correct for this function's own
  // server-to-server Storage calls below, but not reachable from a browser. The signed URL
  // handed back to the caller must use a publicly-reachable base instead.
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const publicSupabaseUrl = Deno.env.get("PUBLIC_SUPABASE_URL") ?? supabaseUrl;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!apiBaseUrl || !supabaseUrl || !serviceRoleKey) {
    console.error("generate-export: required env vars not set");
    return new Response(JSON.stringify({ error: "function misconfigured" }), {
      status: 500,
      headers: SECURITY_HEADERS,
    });
  }

  const recsResponse = await fetch(
    `${apiBaseUrl}/clubs/${payload.club_id}/recommendations${buildRecommendationsQuery(payload.filters)}`,
  );
  if (!recsResponse.ok) {
    return new Response(
      JSON.stringify({ error: "failed to fetch recommendations for export" }),
      { status: 502, headers: SECURITY_HEADERS },
    );
  }
  const recs = (await recsResponse.json()) as { players: PlayerRecommendation[] };

  const csv = buildExportCsv(recs.players);
  const path = `${payload.club_id}/${Date.now()}.csv`;

  const uploadResponse = await fetch(`${supabaseUrl}/storage/v1/object/exports/${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "text/csv",
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
    },
    body: csv,
  });
  if (!uploadResponse.ok) {
    const body = await uploadResponse.text();
    console.error(`generate-export: upload failed ${uploadResponse.status}: ${body}`);
    return new Response(JSON.stringify({ error: "upload failed" }), {
      status: 502,
      headers: SECURITY_HEADERS,
    });
  }

  const expiresInSeconds = 300;
  const signResponse = await fetch(
    `${supabaseUrl}/storage/v1/object/sign/exports/${path}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({ expiresIn: expiresInSeconds }),
    },
  );
  if (!signResponse.ok) {
    const body = await signResponse.text();
    console.error(`generate-export: signing failed ${signResponse.status}: ${body}`);
    return new Response(JSON.stringify({ error: "signing failed" }), {
      status: 502,
      headers: SECURITY_HEADERS,
    });
  }
  const { signedURL } = (await signResponse.json()) as { signedURL: string };
  // signedURL from the Storage API is relative to /storage/v1 (e.g.
  // "/object/sign/exports/...?token=..."), not to the API root — a real bug caught by an
  // actual end-to-end call: the un-prefixed version 404s.

  return new Response(
    JSON.stringify({
      signed_url: `${publicSupabaseUrl}/storage/v1${signedURL}`,
      expires_at: new Date(Date.now() + expiresInSeconds * 1000).toISOString(),
    }),
    { status: 200, headers: { "Content-Type": "application/json", ...SECURITY_HEADERS } },
  );
}

if (import.meta.main) {
  Deno.serve(handler);
}
