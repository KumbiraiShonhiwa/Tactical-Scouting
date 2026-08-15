import { readFileSync, rmSync } from "node:fs";
import { deleteE2EAdminUser } from "./test-users";

const STATE_DIR = "./.auth";
const USER_ID_FILE = `${STATE_DIR}/admin-user-id.txt`;

export default async function globalTeardown(): Promise<void> {
  try {
    const userId = readFileSync(USER_ID_FILE, "utf-8").trim();
    await deleteE2EAdminUser(userId);
  } finally {
    rmSync(STATE_DIR, { recursive: true, force: true });
  }
}
