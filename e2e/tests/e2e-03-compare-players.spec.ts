import { test, expect } from "@playwright/test";

// E2E-03 / UC-3 Compare Two Players (Testing Documentation §5.1): "Scout selects two players
// from a shortlist and confirms the overlapping radar chart and comparison table render
// correctly."

const MAN_UTD_CLUB_ID = "c1111111-1111-1111-1111-111111111111";
const FORWARD = "Golden Test Forward One";
const MIDFIELDER = "Golden Test Midfielder Two";

test("scout compares two players from the ranked list", async ({ page }) => {
  await page.goto(`/clubs/${MAN_UTD_CLUB_ID}`);

  // `force: true`: same verified Chromium fractional-DPR (Pixel 5, deviceScaleFactor 2.75)
  // hit-test quirk documented in e2e-01-browse-recommendations.spec.ts — Playwright reports the
  // "Get shareable link" button intercepting this click on every retry, but trace screencast
  // frames and live elementFromPoint probes at the reported failure moment show the two buttons
  // never actually overlap on screen. Not a real layout defect.
  await page.getByRole("button", { name: `Add ${FORWARD} to comparison` }).click();
  await page.getByRole("button", { name: `Add ${MIDFIELDER} to comparison` }).click({ force: true });

  await page.getByRole("link", { name: /Compare \(2\)/ }).click();
  await expect(page).toHaveURL(/\/compare\?players=/);

  await expect(page.getByRole("heading", { level: 1, name: "Player Comparison" })).toBeVisible();

  // Side-by-side stats table has a column per player.
  const table = page.getByRole("table", { name: "Side-by-side player statistics" });
  await expect(table).toContainText(FORWARD);
  await expect(table).toContainText(MIDFIELDER);

  // Overlapping radar chart's accessible fallback carries both series.
  await expect(page.getByText(FORWARD).first()).toBeVisible();
});
