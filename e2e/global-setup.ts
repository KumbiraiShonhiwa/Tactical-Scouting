import { chromium } from "@playwright/test";
import { writeFileSync, mkdirSync } from "node:fs";
import { createE2EAdminUser, E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD } from "./test-users";

const STATE_DIR = "./.auth";
const USER_ID_FILE = `${STATE_DIR}/admin-user-id.txt`;
const STORAGE_STATE_FILE = `${STATE_DIR}/admin-storage-state.json`;

export default async function globalSetup(): Promise<void> {
  mkdirSync(STATE_DIR, { recursive: true });

  const userId = await createE2EAdminUser();
  writeFileSync(USER_ID_FILE, userId, "utf-8");

  // Real UI login (fills the actual Login form), not a crafted session — proves the real
  // Supabase Auth + AuthContext chain works, then reuses the resulting session across the
  // admin-scoped specs (E2E-04/05) via Playwright's storageState mechanism.
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto("http://localhost:4173/login");
  await page.getByLabel("Email").fill(E2E_ADMIN_EMAIL);
  await page.getByLabel("Password").fill(E2E_ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("**/admin/**", { timeout: 15_000 });
  await page.context().storageState({ path: STORAGE_STATE_FILE });
  await browser.close();
}
