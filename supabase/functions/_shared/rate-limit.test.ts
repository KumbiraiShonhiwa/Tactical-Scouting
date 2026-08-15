import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { checkRateLimit, resetRateLimits } from "./rate-limit.ts";

Deno.test("checkRateLimit allows requests up to the limit", () => {
  resetRateLimits();
  for (let i = 0; i < 5; i++) {
    assertEquals(checkRateLimit("key-a", 5, 1000), true);
  }
});

Deno.test("checkRateLimit rejects requests beyond the limit within the same window", () => {
  resetRateLimits();
  for (let i = 0; i < 5; i++) {
    checkRateLimit("key-b", 5, 1000);
  }
  assertEquals(checkRateLimit("key-b", 5, 1000), false);
});

Deno.test("checkRateLimit resets once a new 60s window starts", () => {
  resetRateLimits();
  for (let i = 0; i < 5; i++) {
    checkRateLimit("key-c", 5, 1000);
  }
  assertEquals(checkRateLimit("key-c", 5, 1000), false);
  assertEquals(checkRateLimit("key-c", 5, 1000 + 60_000), true);
});

Deno.test("checkRateLimit tracks each key independently", () => {
  resetRateLimits();
  for (let i = 0; i < 5; i++) {
    checkRateLimit("key-d", 5, 1000);
  }
  assertEquals(checkRateLimit("key-d", 5, 1000), false);
  assertEquals(checkRateLimit("key-e", 5, 1000), true);
});
