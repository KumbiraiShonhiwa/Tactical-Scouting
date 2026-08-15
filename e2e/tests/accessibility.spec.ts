import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// Testing Documentation §6.4: axe-core run against key pages, asserting no critical/serious
// violations (SRS 8.3, 3.2.3), plus a keyboard-only smoke test of the primary flow.

const MAN_UTD_CLUB_ID = "c1111111-1111-1111-1111-111111111111";
const FORWARD_PLAYER_ID = "b1111111-0001-0001-0001-000000000001";

const PAGES = [
  { name: "Home", path: "/" },
  { name: "Club Detail", path: `/clubs/${MAN_UTD_CLUB_ID}` },
  { name: "Player Detail", path: `/players/${FORWARD_PLAYER_ID}?club_id=${MAN_UTD_CLUB_ID}` },
  { name: "Comparison", path: "/compare" },
];

for (const { name, path } of PAGES) {
  test(`${name} has no critical/serious accessibility violations`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState("networkidle");

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();

    const seriousOrCritical = results.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical",
    );
    expect(seriousOrCritical, JSON.stringify(seriousOrCritical, null, 2)).toEqual([]);
  });
}

test("keyboard-only smoke test: select club -> view shortlist -> open player", async ({
  page,
  isMobile,
}) => {
  // A hardware-keyboard "Tab between focusable elements" flow is a desktop-input concept —
  // Playwright's mobile emulation is touch-primary and doesn't model an external keyboard, so
  // this is scoped to the non-touch (desktop) project. axe-core's own colour-contrast/ARIA
  // checks above still run on both viewports.
  test.skip(isMobile, "keyboard-only navigation is a desktop-input concern, not mobile touch");
  // Club Detail has enough interactive controls ahead of the ranked table (nav, radar's "Show
  // as table", FilterBar fields, FitValueScatter's "Show as list", Export/Share) that tabbing
  // to a specific player link can take well over the default 30s test timeout end-to-end.
  test.setTimeout(60_000);

  await page.goto("/");

  // Tab through the nav, then the club grid (alphabetically ordered by useClubs' `.order
  // ("name")` — Manchester United is not first), until Manchester United's card is focused,
  // then activate it with the keyboard only.
  let reachedClub = false;
  for (let i = 0; i < 15 && !reachedClub; i++) {
    await page.keyboard.press("Tab");
    const focused = page.locator(":focus");
    const text = await focused.textContent().catch(() => null);
    if (text?.includes("Manchester United")) {
      reachedClub = true;
      await page.keyboard.press("Enter");
    }
  }
  expect(reachedClub).toBe(true);

  await expect(page.getByRole("heading", { level: 1, name: "Manchester United" })).toBeVisible();

  // Keep tabbing until a player link is focused, then activate it — proves the ranked list is
  // fully keyboard-reachable without a mouse.
  let reachedPlayer = false;
  for (let i = 0; i < 80 && !reachedPlayer; i++) {
    await page.keyboard.press("Tab");
    const focused = page.locator(":focus");
    const text = await focused.textContent().catch(() => null);
    if (text?.includes("Golden Test Forward One")) {
      reachedPlayer = true;
      await page.keyboard.press("Enter");
    }
  }

  expect(reachedPlayer).toBe(true);
  await expect(
    page.getByRole("heading", { level: 1, name: "Golden Test Forward One" }),
  ).toBeVisible();
});
