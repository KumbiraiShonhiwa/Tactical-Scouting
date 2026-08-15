import { describe, expect, it } from "vitest";
import { filtersFromSearchParams, filtersToSearchParams } from "./filterParams.utils";

describe("filtersFromSearchParams", () => {
  it("returns an empty object for an empty query string", () => {
    expect(filtersFromSearchParams(new URLSearchParams())).toEqual({});
  });

  it("parses a known position", () => {
    const filters = filtersFromSearchParams(new URLSearchParams("position=CM"));
    expect(filters.position).toBe("CM");
  });

  it("drops an unknown position rather than passing it through", () => {
    const filters = filtersFromSearchParams(new URLSearchParams("position=NOT_A_POSITION"));
    expect(filters.position).toBeUndefined();
  });

  it("parses age_min/age_max/min_minutes as numbers", () => {
    const filters = filtersFromSearchParams(
      new URLSearchParams("age_min=18&age_max=30&min_minutes=900"),
    );
    expect(filters).toMatchObject({ age_min: 18, age_max: 30, min_minutes: 900 });
  });

  it("drops a malformed numeric param", () => {
    const filters = filtersFromSearchParams(new URLSearchParams("age_min=not-a-number"));
    expect(filters.age_min).toBeUndefined();
  });

  it("parses a known sort value", () => {
    const filters = filtersFromSearchParams(new URLSearchParams("sort=undervaluation_desc"));
    expect(filters.sort).toBe("undervaluation_desc");
  });

  it("drops an unknown sort value", () => {
    const filters = filtersFromSearchParams(new URLSearchParams("sort=bogus"));
    expect(filters.sort).toBeUndefined();
  });

  it("only treats the literal string 'true' as recommended_only", () => {
    expect(filtersFromSearchParams(new URLSearchParams("recommended_only=true")).recommended_only).toBe(
      true,
    );
    expect(
      filtersFromSearchParams(new URLSearchParams("recommended_only=yes")).recommended_only,
    ).toBeUndefined();
  });

  it("parses page", () => {
    expect(filtersFromSearchParams(new URLSearchParams("page=3")).page).toBe(3);
  });
});

describe("filtersToSearchParams", () => {
  it("produces an empty params object for empty filters", () => {
    expect(filtersToSearchParams({}).toString()).toBe("");
  });

  it("round-trips through filtersFromSearchParams", () => {
    const original = {
      position: "ST" as const,
      age_min: 20,
      age_max: 28,
      min_minutes: 500,
      sort: "fit_score_asc" as const,
      recommended_only: true,
      page: 2,
    };
    const roundTripped = filtersFromSearchParams(filtersToSearchParams(original));
    expect(roundTripped).toEqual(original);
  });

  it("omits page=1 (the default) to keep URLs tidy", () => {
    expect(filtersToSearchParams({ page: 1 }).has("page")).toBe(false);
  });

  it("omits min_minutes=0 (the default)", () => {
    expect(filtersToSearchParams({ min_minutes: 0 }).has("min_minutes")).toBe(false);
  });
});
