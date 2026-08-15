import { assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildExportCsv, handler, isExportRequest } from "./index.ts";
import { resetRateLimits } from "../_shared/rate-limit.ts";

const VALID_CLUB_ID = "c1111111-1111-1111-1111-111111111111";

Deno.test("isExportRequest accepts a payload with just a club_id", () => {
  assertEquals(isExportRequest({ club_id: VALID_CLUB_ID }), true);
});

Deno.test("isExportRequest accepts filters alongside club_id", () => {
  assertEquals(
    isExportRequest({
      club_id: VALID_CLUB_ID,
      filters: { position: "ST", recommended_only: true },
    }),
    true,
  );
});

Deno.test("isExportRequest rejects a missing club_id", () => {
  assertEquals(isExportRequest({ filters: {} }), false);
});

Deno.test("isExportRequest rejects an empty club_id", () => {
  assertEquals(isExportRequest({ club_id: "" }), false);
});

// VibeSec audit finding (low): club_id is used to build a Storage object path — previously
// only checked for "non-empty string", so a value like "../../whatever" would have been
// accepted. Confirms the UUID-shape check actually rejects path-traversal-shaped input.
Deno.test("isExportRequest rejects a non-UUID club_id", () => {
  assertEquals(isExportRequest({ club_id: "c1" }), false);
  assertEquals(isExportRequest({ club_id: "../../etc/passwd" }), false);
  assertEquals(isExportRequest({ club_id: "not-a-uuid-at-all" }), false);
});

Deno.test("isExportRequest rejects null and non-object input", () => {
  assertEquals(isExportRequest(null), false);
  assertEquals(isExportRequest("nope"), false);
});

const samplePlayer = {
  player_id: "p1",
  full_name: "Test Player",
  position: "ST",
  age: 24,
  minutes_played: 1800,
  fit_score: 0.82,
  undervaluation_index: 1.4,
  recommended: true,
  current_valuation: 20_000_000,
  valuation_currency: "EUR",
};

Deno.test("buildExportCsv writes a header row for an empty player list", () => {
  const csv = buildExportCsv([]);
  assertEquals(
    csv,
    "player,position,age,minutes_played,fit_score,undervaluation_index,recommended,current_valuation,currency",
  );
});

Deno.test("buildExportCsv writes one data row per player", () => {
  const csv = buildExportCsv([samplePlayer]);
  const lines = csv.split("\r\n");
  assertEquals(lines.length, 2);
  assertStringIncludes(lines[1], "Test Player");
  assertStringIncludes(lines[1], "20000000");
});

Deno.test("buildExportCsv quotes a name containing a comma", () => {
  const csv = buildExportCsv([{ ...samplePlayer, full_name: "Doe, John" }]);
  assertStringIncludes(csv, '"Doe, John"');
});

Deno.test("buildExportCsv renders a null age/valuation as an empty cell", () => {
  const csv = buildExportCsv([{ ...samplePlayer, age: null, current_valuation: null }]);
  const dataRow = csv.split("\r\n")[1];
  assertEquals(
    dataRow,
    "Test Player,ST,,1800,0.82,1.4,true,,EUR",
  );
});

// VibeSec audit finding (medium): no response set any hardening headers. Env vars are
// intentionally left unset here so the handler takes its cheapest-to-reach error path (500,
// before any real fetch call) — proves the headers are applied via the actual response-building
// code, not just that the SECURITY_HEADERS constant exists somewhere.
Deno.test("handler applies security headers even on the misconfigured-env 500 path", async () => {
  resetRateLimits();
  const original = {
    apiBaseUrl: Deno.env.get("API_BASE_URL"),
    supabaseUrl: Deno.env.get("SUPABASE_URL"),
    serviceRoleKey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
  };
  Deno.env.delete("API_BASE_URL");
  Deno.env.delete("SUPABASE_URL");
  Deno.env.delete("SUPABASE_SERVICE_ROLE_KEY");
  try {
    const response = await handler(
      new Request("http://localhost/generate-export", {
        method: "POST",
        headers: { Authorization: "Bearer test-token-headers" },
        body: JSON.stringify({ club_id: VALID_CLUB_ID }),
      }),
    );
    assertEquals(response.status, 500);
    assertEquals(response.headers.get("X-Content-Type-Options"), "nosniff");
    assertEquals(response.headers.get("X-Frame-Options"), "DENY");
    assertEquals(response.headers.get("Content-Security-Policy"), "default-src 'none'");
  } finally {
    if (original.apiBaseUrl) Deno.env.set("API_BASE_URL", original.apiBaseUrl);
    if (original.supabaseUrl) Deno.env.set("SUPABASE_URL", original.supabaseUrl);
    if (original.serviceRoleKey) {
      Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", original.serviceRoleKey);
    }
  }
});

// VibeSec audit finding (low): this function previously had no rate limiting of its own.
Deno.test("handler rejects a caller beyond the per-minute rate limit with 429", async () => {
  resetRateLimits();
  Deno.env.set("EXPORT_RATE_LIMIT_PER_MINUTE", "2");
  try {
    const makeRequest = () =>
      handler(
        new Request("http://localhost/generate-export", {
          method: "POST",
          headers: { Authorization: "Bearer test-token-rate-limit" },
          body: JSON.stringify({ club_id: VALID_CLUB_ID }),
        }),
      );
    // The first 2 calls proceed past the rate limiter (and then fail later with a 500, since
    // API_BASE_URL etc. aren't set in this unit-test environment — that's fine, we only care
    // about the rate limiter's own verdict here).
    await makeRequest();
    await makeRequest();
    const third = await makeRequest();
    assertEquals(third.status, 429);
    assertEquals(third.headers.get("X-Content-Type-Options"), "nosniff");
  } finally {
    Deno.env.delete("EXPORT_RATE_LIMIT_PER_MINUTE");
  }
});
