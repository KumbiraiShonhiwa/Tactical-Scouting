---
name: supabase-rls
description: Supabase/Postgres schema, migrations, RLS, Auth, Realtime, Storage, pooling and database best practices for Tactical-Scouting.
---
# Supabase/RLS

## Rules
- All schema changes use versioned CLI migrations.
- Never use the dashboard as the schema source of truth.
- Every exposed public table has RLS enabled and explicit policies.
- Centralize admin checks in `is_admin()` where appropriate.
- Internal/staging tables belong in a non-exposed schema.
- Use UUID keys.
- Use numeric for score/money values.
- Add indexes deliberately for dashboard query paths.
- Preserve historical fit-score/undervaluation versions.

## Roles
- `anon`: public read-only views.
- `authenticated`: authenticated scout/analyst access.
- authenticated + admin claim: administrative access.
- `service_role`: trusted server/CI only.

## Commands
```bash
supabase start
supabase status
supabase migration new <name>
supabase db diff
supabase db reset
supabase db push
supabase functions new <name>
supabase functions serve
supabase functions deploy <name>
```

## RLS testing
Every policy requires at least one allowed and one denied test. Test both pgTAP and representative PostgREST behavior where relevant.
