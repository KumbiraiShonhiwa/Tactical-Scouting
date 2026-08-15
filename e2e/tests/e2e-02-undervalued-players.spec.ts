import { test, expect } from "@playwright/test";
import { ensureFiltersExpanded } from "../helpers";

// E2E-02 / UC-2 Identify Undervalued Players (Testing Documentation §5.1):
// "Scout sorts by undervaluation index, confirms flagged 'recommended' players appear, opens
// the fit-vs-value scatter plot." Man Utd's forward is seeded recommended:true
// (undervaluation_index 1.87), the midfielder recommended:false (1.12) — supabase/seed.sql.

const MAN_UTD_CLUB_ID = "c1111111-1111-1111-1111-111111111111";
const FORWARD = "Golden Test Forward One";
const MIDFIELDER = "Golden Test Midfielder Two";

test("scout sorts by undervaluation and finds recommended players", async ({ page }) => {
  await page.goto(`/clubs/${MAN_UTD_CLUB_ID}`);

  await ensureFiltersExpanded(page);
  await page.getByLabel("Sort by").selectOption("undervaluation_desc");

  // Scoped to the ranked-list table specifically — the fit-vs-value scatter's own accessible
  // fallback table also has a row containing each player's name, so an unscoped page-wide
  // `getByRole("row")` matches both and trips Playwright's strict-mode uniqueness check.
  const rankedTable = page.getByRole("table", {
    name: "Ranked tactical-fit and undervaluation recommendations",
  });
  const rows = rankedTable.getByRole("row");
  await expect(rows.filter({ hasText: FORWARD })).toContainText("Recommended");
  await expect(rows.filter({ hasText: MIDFIELDER })).not.toContainText("Recommended");

  // Recommended-only filter narrows to just the flagged player.
  await page.getByLabel("Recommended (undervalued) only").check();
  await expect(page.getByRole("link", { name: FORWARD })).toBeVisible();
  await expect(page.getByRole("link", { name: MIDFIELDER })).not.toBeVisible();
  await page.getByLabel("Recommended (undervalued) only").uncheck();

  // Fit-vs-value scatter's accessible data-table fallback carries both players.
  await expect(page.getByRole("table", { name: /Fit score versus market valuation/ })).toContainText(
    FORWARD,
  );
});
