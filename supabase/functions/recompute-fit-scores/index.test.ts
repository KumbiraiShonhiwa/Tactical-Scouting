import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { isRecomputePayload } from "./index.ts";

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
