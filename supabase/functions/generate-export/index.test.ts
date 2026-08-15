import { assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildExportCsv, isExportRequest } from "./index.ts";

Deno.test("isExportRequest accepts a payload with just a club_id", () => {
  assertEquals(isExportRequest({ club_id: "c1" }), true);
});

Deno.test("isExportRequest accepts filters alongside club_id", () => {
  assertEquals(
    isExportRequest({ club_id: "c1", filters: { position: "ST", recommended_only: true } }),
    true,
  );
});

Deno.test("isExportRequest rejects a missing club_id", () => {
  assertEquals(isExportRequest({ filters: {} }), false);
});

Deno.test("isExportRequest rejects an empty club_id", () => {
  assertEquals(isExportRequest({ club_id: "" }), false);
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
