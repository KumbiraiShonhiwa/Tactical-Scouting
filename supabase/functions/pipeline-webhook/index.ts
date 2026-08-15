// Phase 5, ADD §5.3: "receives the GitHub Actions completion callback and updates
// pipeline_run, which Realtime then pushes to any open admin session (AD-03)."
//
// Scoped as a SAFETY NET, not the primary writer: run_pipeline.py's own success/failure paths
// already write pipeline_run directly via finish_run() (etl/loader/pipeline_run.py). This
// function only matters for job-level failures the Python script never reaches at all — a
// dependency-install failure, the runner OOM-killing the process, a workflow timeout — see
// .github/workflows/etl-schedule.yml's "Notify pipeline-webhook on job-level failure" step
// (if: failure(), only for admin-triggered runs that have a run_id to correlate against).

import { SECURITY_HEADERS } from "../_shared/security-headers.ts";

interface WebhookPayload {
  run_id: string;
  error_log: string;
}

export function isWebhookPayload(value: unknown): value is WebhookPayload {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.run_id === "string" && v.run_id.length > 0 && typeof v.error_log === "string";
}

export async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method not allowed" }), {
      status: 405,
      headers: SECURITY_HEADERS,
    });
  }

  const expectedSecret = Deno.env.get("PIPELINE_WEBHOOK_SECRET");
  if (!expectedSecret || req.headers.get("X-Webhook-Secret") !== expectedSecret) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: SECURITY_HEADERS,
    });
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid JSON body" }), {
      status: 400,
      headers: SECURITY_HEADERS,
    });
  }

  if (!isWebhookPayload(payload)) {
    return new Response(
      JSON.stringify({ error: "body must include run_id and error_log" }),
      { status: 400, headers: SECURITY_HEADERS },
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    console.error("pipeline-webhook: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set");
    return new Response(JSON.stringify({ error: "function misconfigured" }), {
      status: 500,
      headers: SECURITY_HEADERS,
    });
  }

  // Guarded with status=neq.success so an unlucky race (the script itself finishing
  // successfully just as the job-level failure step also fires) can't overwrite a real
  // success with a false failure.
  const response = await fetch(
    `${supabaseUrl}/rest/v1/pipeline_run?run_id=eq.${payload.run_id}&status=neq.success`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        status: "failure",
        error_log: payload.error_log,
        completed_at: new Date().toISOString(),
      }),
    },
  );

  if (!response.ok) {
    const body = await response.text();
    console.error(`pipeline-webhook: PostgREST update failed ${response.status}: ${body}`);
    return new Response(JSON.stringify({ error: "update failed" }), {
      status: 502,
      headers: SECURITY_HEADERS,
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json", ...SECURITY_HEADERS },
  });
}

if (import.meta.main) {
  Deno.serve(handler);
}
