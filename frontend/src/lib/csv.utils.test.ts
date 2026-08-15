import { describe, expect, it } from "vitest";
import { buildCsv } from "./csv.utils";

describe("buildCsv", () => {
  it("returns an empty string for no rows", () => {
    expect(buildCsv([])).toBe("");
  });

  it("builds a header row from the first row's keys", () => {
    const csv = buildCsv([{ name: "Test", age: 20 }]);
    expect(csv.split("\r\n")[0]).toBe("name,age");
  });

  it("serializes null as an empty cell", () => {
    const csv = buildCsv([{ name: "Test", value: null }]);
    expect(csv.split("\r\n")[1]).toBe("Test,");
  });

  it("serializes booleans and numbers as their string form", () => {
    const csv = buildCsv([{ recommended: true, score: 0.5 }]);
    expect(csv.split("\r\n")[1]).toBe("true,0.5");
  });

  it("quotes and escapes cells containing commas, quotes, or newlines", () => {
    const csv = buildCsv([{ note: 'Say "hi", then\nleave' }]);
    expect(csv.split("\r\n").slice(1).join("\r\n")).toBe('"Say ""hi"", then\nleave"');
  });

  it("produces one line per row, in order", () => {
    const csv = buildCsv([{ n: 1 }, { n: 2 }, { n: 3 }]);
    expect(csv.split("\r\n")).toEqual(["n", "1", "2", "3"]);
  });
});
