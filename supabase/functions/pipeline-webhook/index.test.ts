import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { handler, isWebhookPayload } from "./index.ts";

Deno.test("isWebhookPayload accepts a valid payload", () => {
  assertEquals(isWebhookPayload({ run_id: "r1", error_log: "job timed out" }), true);
});

Deno.test("isWebhookPayload rejects an empty run_id", () => {
  assertEquals(isWebhookPayload({ run_id: "", error_log: "job timed out" }), false);
});

Deno.test("isWebhookPayload rejects a missing error_log", () => {
  assertEquals(isWebhookPayload({ run_id: "r1" }), false);
});

Deno.test("isWebhookPayload rejects null and non-object input", () => {
  assertEquals(isWebhookPayload(null), false);
  assertEquals(isWebhookPayload("nope"), false);
});

// VibeSec audit finding (medium): no response set any hardening headers. The 401
// unauthorized-secret path is the cheapest one to reach without any env-var manipulation —
// proves the headers are applied via the actual response-building code, not just that the
// SECURITY_HEADERS constant exists somewhere.
Deno.test("handler applies security headers on the unauthorized-secret path", async () => {
  const response = await handler(
    new Request("http://localhost/pipeline-webhook", {
      method: "POST",
      headers: { "X-Webhook-Secret": "wrong-secret" },
      body: JSON.stringify({ run_id: "r1", error_log: "x" }),
    }),
  );
  assertEquals(response.status, 401);
  assertEquals(response.headers.get("X-Content-Type-Options"), "nosniff");
  assertEquals(response.headers.get("X-Frame-Options"), "DENY");
  assertEquals(response.headers.get("Content-Security-Policy"), "default-src 'none'");
});
