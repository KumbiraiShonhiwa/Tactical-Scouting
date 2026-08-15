import type { Page } from "@playwright/test";

// FilterBar collapses behind a "Show filters" toggle below the md breakpoint (Frontend Design
// Doc §6) — on the mobile viewport project the filter fields are hidden until that's clicked.
// No-op on desktop, where the toggle button isn't rendered at all (or is already expanded).
export async function ensureFiltersExpanded(page: Page): Promise<void> {
  // FilterBar itself only mounts once the club page has rendered, so a bare `isVisible()`
  // check run immediately after navigation can race the initial render and wrongly conclude
  // "no toggle, nothing to expand" before the toggle has even attached to the DOM. Waiting
  // (briefly, tolerating a timeout on desktop where the toggle never renders at all) makes the
  // check race-free without slowing down the desktop no-op path.
  const toggle = page.getByRole("button", { name: "Show filters" });
  const appeared = await toggle
    .waitFor({ state: "visible", timeout: 2000 })
    .then(() => true)
    .catch(() => false);
  if (appeared) {
    await toggle.click();
  }
}
