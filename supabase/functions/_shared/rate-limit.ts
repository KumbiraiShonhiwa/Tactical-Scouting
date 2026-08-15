// VibeSec audit finding (low): generate-export had no rate limiting of its own, unlike every
// FastAPI route (api/app/rate_limit.py, applied globally) — a caller with a valid Supabase JWT
// could spam it to fill the private Storage bucket / rack up cost. Deliberately mirrors
// api/app/rate_limit.py's FixedWindowRateLimiter shape and algorithm rather than reaching for
// an external dependency, for the same reason that module gives: no third-party library's
// internal assumptions to break.
//
// Caveat, same as elsewhere in this project (see perf-nightly.yml's RATE_LIMIT_PER_MINUTE
// override comment): this is a best-effort, per-instance in-memory limiter, not a distributed
// one — acceptable for this low-severity finding rather than provisioning shared state.

const WINDOW_MS = 60_000;

const windows = new Map<string, { windowStart: number; count: number }>();

export function checkRateLimit(key: string, limitPerMinute: number, now = Date.now()): boolean {
  const entry = windows.get(key);

  if (!entry || now - entry.windowStart >= WINDOW_MS) {
    windows.set(key, { windowStart: now, count: 1 });
    return true;
  }

  if (entry.count >= limitPerMinute) {
    return false;
  }

  entry.count += 1;
  return true;
}

export function resetRateLimits(): void {
  windows.clear();
}
