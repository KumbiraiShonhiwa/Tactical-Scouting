import { test, expect } from "@playwright/test";

// E2E-04 / UC-4 Refresh Data Pipeline (Testing Documentation §5.1): "Admin triggers a manual
// pipeline run and confirms the run appears with status in the admin log view (against a
// stubbed ETL trigger in CI)." Requires the API server to be running via api/e2e_server.py
// (not the normal `uvicorn app.main:create_app`), which overrides the GitHub dispatch
// dependency the same way api/tests/integration/conftest.py does for pytest — this proves the
// UI -> API -> DB -> Realtime path, not a real GitHub Actions trigger.
//
// Admin-scoped: uses the storageState global-setup.ts saved after a real UI login as the
// dedicated E2E admin test user (Testing Documentation §5.2).
test.use({ storageState: "./.auth/admin-storage-state.json" });

test("admin triggers a pipeline run and sees it appear in the log", async ({ page }) => {
  await page.goto("/admin/pipeline-runs");
  await expect(page.getByRole("heading", { name: "Pipeline runs" })).toBeVisible();

  const runsTableBefore = page.getByRole("table", { name: "Recent ETL pipeline runs" });
  const beforeRowCount = await runsTableBefore
    .locator("tbody tr")
    .count()
    .catch(() => 0);

  await page.getByRole("button", { name: "Trigger run" }).click();

  // Realtime pushes the new row without a page refresh (Frontend Design Doc §4.3).
  await expect(async () => {
    const table = page.getByRole("table", { name: "Recent ETL pipeline runs" });
    const rowCount = await table.locator("tbody tr").count();
    expect(rowCount).toBeGreaterThan(beforeRowCount);
  }).toPass({ timeout: 10_000 });

  await expect(page.getByText("queued").or(page.getByText("admin")).first()).toBeVisible();
});
