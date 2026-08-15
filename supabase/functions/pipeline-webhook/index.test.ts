import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { isWebhookPayload } from "./index.ts";

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
