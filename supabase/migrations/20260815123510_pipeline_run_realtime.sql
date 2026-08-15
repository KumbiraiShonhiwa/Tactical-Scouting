-- Phase 4: PipelineRunLog (Admin) subscribes to live status updates on pipeline_run via
-- Supabase Realtime (Frontend Design Doc §4.3). This only adds the table to the Realtime
-- publication — it does not change RLS, so Realtime change events still respect the existing
-- pipeline_run_admin_read policy (only admins receive them).
alter publication supabase_realtime add table public.pipeline_run;
