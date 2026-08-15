import { test, expect } from "@playwright/test";
import { Client } from "pg";

// E2E-05 / UC-5 Update a Club's Tactical Profile (Testing Documentation §5.1): "Admin edits
// metric weightings, saves, and confirms fit scores for that club are recomputed and
// versioned." Exercises the full Phase 5 event-driven chain for real: FastAPI writes the new
// tactical_profile version -> the pg_net trigger fires -> recompute-fit-scores Edge Function
// -> POST /internal/tactical-profiles/recompute -> new fit_score rows, all asynchronously —
// so this test polls rather than asserting immediately after save.
//
// Requires the one-time local Vault setup from docs/runbook.md §8 to have been run against the
// stack this test targets, or the recompute never fires and this test will time out — that
// failure mode is itself a useful signal that the local environment isn't fully configured.
test.use({ storageState: "./.auth/admin-storage-state.json" });

const CRYSTAL_PALACE = "Crystal Palace";
const CRYSTAL_PALACE_CLUB_ID = "c6666666-6666-6666-6666-666666666666";
const DB_URL = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

test("admin edits tactical profile weightings and fit scores recompute", async ({ page }) => {
  const db = new Client({ connectionString: DB_URL });
  await db.connect();

  try {
    // Capture the exact pre-test state so this run is idempotent regardless of how many times
    // it's been run before against the same local stack (a real gap the first version of this
    // test had: it created a new version every run and never reverted, so weights silently
    // drifted across repeated local runs until the sum-to-100% invariant broke).
    const { rows } = await db.query<{ profile_id: string; version: number }>(
      "select profile_id, version from public.tactical_profile where club_id = $1 and is_current",
      [CRYSTAL_PALACE_CLUB_ID],
    );
    const original = rows[0];

    await page.goto("/admin/tactical-profiles");
    await page.getByLabel("Club").selectOption({ label: CRYSTAL_PALACE });

    const versionText = await page.getByText(/Current version: \d+/).textContent();
    const currentVersion = Number(versionText?.match(/\d+/)?.[0] ?? "1");

    // Move 10 percentage points from pressing intensity to possession share so the total
    // stays a valid 100% — the same technique frontend/src/components/organisms/
    // ProfileWeightEditor.test.tsx uses at the unit level, exercised here through real sliders.
    const possessionSlider = page.getByLabel("Possession share");
    const pressingSlider = page.getByLabel("Pressing intensity");

    const [possessionCurrent, pressingCurrent] = await Promise.all([
      possessionSlider.inputValue(),
      pressingSlider.inputValue(),
    ]);

    async function setSlider(locator: typeof possessionSlider, value: number) {
      await locator.evaluate((el: HTMLInputElement, v: number) => {
        const setter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype,
          "value",
        )!.set!;
        setter.call(el, String(v));
        el.dispatchEvent(new Event("change", { bubbles: true }));
      }, value);
    }

    await setSlider(possessionSlider, Math.min(1, Number(possessionCurrent) + 0.1));
    await setSlider(pressingSlider, Math.max(0, Number(pressingCurrent) - 0.1));

    await expect(page.getByText("Valid")).toBeVisible();

    await page.getByRole("button", { name: "Save new version" }).click();
    await page.getByRole("button", { name: "Confirm and recompute" }).click();

    await expect(
      page.getByText(new RegExp(`Saved as version ${currentVersion + 1}`)),
    ).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/recompute enqueued/)).toBeVisible();

    // The recompute itself is asynchronous (Phase 5) — poll fit-breakdown for a player on
    // this club until the new profile_version's score appears, rather than asserting
    // immediately.
    await expect(async () => {
      await page.goto("/admin/tactical-profiles");
      await page.getByLabel("Club").selectOption({ label: CRYSTAL_PALACE });
      await expect(page.getByText(`Current version: ${currentVersion + 1}`)).toBeVisible();
    }).toPass({ timeout: 20_000 });

    // Restore exactly the pre-test state: delete every version this run created (and the
    // fit_score/undervaluation_index rows the trigger chain wrote for them), then flip the
    // original row back to current.
    await db.query(
      "delete from public.undervaluation_index where club_id = $1 " +
        "and fit_score_id in (select fit_score_id from public.fit_score " +
        "where club_id = $1 and profile_version > $2)",
      [CRYSTAL_PALACE_CLUB_ID, original.version],
    );
    await db.query(
      "delete from public.fit_score where club_id = $1 and profile_version > $2",
      [CRYSTAL_PALACE_CLUB_ID, original.version],
    );
    await db.query(
      "delete from public.tactical_profile where club_id = $1 and version > $2",
      [CRYSTAL_PALACE_CLUB_ID, original.version],
    );
    await db.query(
      "update public.tactical_profile set is_current = true where profile_id = $1",
      [original.profile_id],
    );
  } finally {
    await db.end();
  }
});
