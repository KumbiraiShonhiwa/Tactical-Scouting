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

export function isExportRequest(value: unknown): value is ExportRequest {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.club_id === "string" && v.club_id.length > 0;
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

async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method not allowed" }), { status: 405 });
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid JSON body" }), { status: 400 });
  }

  if (!isExportRequest(payload)) {
    return new Response(JSON.stringify({ error: "body must include club_id" }), { status: 400 });
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
    return new Response(JSON.stringify({ error: "function misconfigured" }), { status: 500 });
  }

  const recsResponse = await fetch(
    `${apiBaseUrl}/clubs/${payload.club_id}/recommendations${buildRecommendationsQuery(payload.filters)}`,
  );
  if (!recsResponse.ok) {
    return new Response(
      JSON.stringify({ error: "failed to fetch recommendations for export" }),
      { status: 502 },
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
    return new Response(JSON.stringify({ error: "upload failed" }), { status: 502 });
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
    return new Response(JSON.stringify({ error: "signing failed" }), { status: 502 });
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
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}

if (import.meta.main) {
  Deno.serve(handler);
}
