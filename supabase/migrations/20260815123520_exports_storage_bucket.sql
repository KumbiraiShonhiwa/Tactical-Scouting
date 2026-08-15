-- Phase 5, ADD §5.4: "Storage holds only generated export artifacts in a private bucket;
-- access is exclusively through short-lived signed URLs issued by the generate-export
-- function, never a public bucket." Only the generate-export Edge Function's service-role
-- client ever touches this bucket — service_role bypasses RLS entirely (same convention as
-- private.quarantine), so deliberately NO policies are added for anon/authenticated on
-- storage.objects for this bucket.
insert into storage.buckets (id, name, public)
values ('exports', 'exports', false)
on conflict (id) do nothing;
