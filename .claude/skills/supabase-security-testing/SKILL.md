---
name: supabase-security-testing
description: RLS, Auth, secret handling, rate-limit and database security testing skill.
---
# Supabase Security Testing

RLS is a critical architectural risk.

For every policy:
1. Test the intended role can perform the action.
2. Test unauthorized roles cannot.
3. Test no-JWT behavior where relevant.
4. Prefer pgTAP for SQL-level behavior.
5. Add PostgREST-level tests to catch integration discrepancies.

Also test:
- `service_role` is never client-exposed;
- secrets are not logged/committed;
- JWT validation;
- rate limits;
- dependency vulnerabilities;
- internal schemas are not exposed.

Run security tests on every PR where feasible.
