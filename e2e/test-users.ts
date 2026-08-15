// Creates/deletes the dedicated E2E admin test user via the Supabase Auth admin API — a real
// Supabase Auth user, not a hand-crafted JWT, mirroring api/tests/integration/conftest.py's
// _create_auth_user() pattern (Testing Documentation §5.2/§7.4: throwaway @example.test
// account, created and torn down per run, never a shared/persistent credential).
//
// The two keys below are Supabase's well-known LOCAL-DEV-ONLY default demo keys — identical
// across every `supabase start` on every machine, documented in Supabase's own CLI output, not
// a secret of this project. Never used for anything but the local test stack (same convention
// as api/tests/integration/conftest.py).
import { Client } from "pg";

export const SUPABASE_API_URL = "http://127.0.0.1:54321";
export const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9." +
  "eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9." +
  "CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
const SUPABASE_SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9." +
  "eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0." +
  "EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";
const DB_URL = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

export const E2E_ADMIN_EMAIL = `e2e-admin-${Date.now()}@example.test`;
export const E2E_ADMIN_PASSWORD = "Sup3rSecretE2EPass!23";

export async function createE2EAdminUser(): Promise<string> {
  const createResp = await fetch(`${SUPABASE_API_URL}/auth/v1/admin/users`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: E2E_ADMIN_EMAIL,
      password: E2E_ADMIN_PASSWORD,
      email_confirm: true,
    }),
  });
  if (!createResp.ok) {
    throw new Error(`Failed to create E2E admin user: ${createResp.status} ${await createResp.text()}`);
  }
  const { id: userId } = (await createResp.json()) as { id: string };

  const client = new Client({ connectionString: DB_URL });
  await client.connect();
  try {
    await client.query("update public.profiles set role = 'admin' where id = $1", [userId]);
  } finally {
    await client.end();
  }

  return userId;
}

export async function deleteE2EAdminUser(userId: string): Promise<void> {
  await fetch(`${SUPABASE_API_URL}/auth/v1/admin/users/${userId}`, {
    method: "DELETE",
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
  });
}
