import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { handler, isRecomputePayload } from "./index.ts";

Deno.test("isRecomputePayload accepts a valid payload", () => {
  assertEquals(
    isRecomputePayload({
      club_id: "c1111111-1111-1111-1111-111111111111",
      profile_version: 2,
      weightings: { possession_share: 0.5 },
    }),
    true,
  );
});

Deno.test("isRecomputePayload rejects a missing club_id", () => {
  assertEquals(
    isRecomputePayload({ profile_version: 2, weightings: {} }),
    false,
  );
});

Deno.test("isRecomputePayload rejects a non-numeric profile_version", () => {
  assertEquals(
    isRecomputePayload({ club_id: "c1", profile_version: "2", weightings: {} }),
    false,
  );
});

Deno.test("isRecomputePayload rejects a missing weightings object", () => {
  assertEquals(
    isRecomputePayload({ club_id: "c1", profile_version: 2 }),
    false,
  );
});

Deno.test("isRecomputePayload rejects null and non-object input", () => {
  assertEquals(isRecomputePayload(null), false);
  assertEquals(isRecomputePayload("not an object"), false);
  assertEquals(isRecomputePayload(42), false);
});

// VibeSec audit finding (medium): no response set any hardening headers. Env vars are
// intentionally left unset here so the handler takes its cheapest-to-reach error path (500,
// before any real fetch call) — proves the headers are applied via the actual response-building
// code, not just that the SECURITY_HEADERS constant exists somewhere.
Deno.test("handler applies security headers even on the misconfigured-env 500 path", async () => {
  const original = { apiBaseUrl: Deno.env.get("API_BASE_URL"), secret: Deno.env.get("INTERNAL_FUNCTION_SECRET") };
  Deno.env.delete("API_BASE_URL");
  Deno.env.delete("INTERNAL_FUNCTION_SECRET");
  try {
    const response = await handler(
      new Request("http://localhost/recompute-fit-scores", {
        method: "POST",
        body: JSON.stringify({ club_id: "c1", profile_version: 1, weightings: {} }),
      }),
    );
    assertEquals(response.status, 500);
    assertEquals(response.headers.get("X-Content-Type-Options"), "nosniff");
    assertEquals(response.headers.get("X-Frame-Options"), "DENY");
    assertEquals(response.headers.get("Content-Security-Policy"), "default-src 'none'");
  } finally {
    if (original.apiBaseUrl) Deno.env.set("API_BASE_URL", original.apiBaseUrl);
    if (original.secret) Deno.env.set("INTERNAL_FUNCTION_SECRET", original.secret);
  }
});
