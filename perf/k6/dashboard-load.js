// Testing Documentation §6.1: "Dashboard load: scripted requests against the public PostgREST
// endpoints simulate a club selection and assert the p95 response time supports the 3-second
// full-page target... for a ~2,000-player dataset — covers 3.2.1."
//
// Targets the LOCAL ephemeral stack (no staging project exists yet — see the Phase 6 plan's
// confirmed decision). The seeded golden dataset is ~12 players, not ~2,000, so this is
// necessarily a headroom check against the target on a tiny dataset, not a claim about
// production-scale latency — documented here rather than silently implied.
import http from "k6/http";
import { check } from "k6";

const SUPABASE_URL = __ENV.SUPABASE_URL || "http://127.0.0.1:54321";
const ANON_KEY =
  __ENV.SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
const MAN_UTD_CLUB_ID = "c1111111-1111-1111-1111-111111111111";

export const options = {
  vus: 10,
  duration: "20s",
  thresholds: {
    // 3.2.1's 3-second full-page target, applied to the PostgREST calls a club-selection
    // dashboard load actually issues (club row + tactical_profile row).
    http_req_duration: ["p(95)<3000"],
    checks: ["rate>0.99"],
  },
};

const headers = { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` };

export default function () {
  // Mirrors ClubDetail.tsx's two direct PostgREST reads (useClub + useTacticalProfile) — the
  // FastAPI recommendations call is measured separately in fit-computation.js.
  const clubRes = http.get(
    `${SUPABASE_URL}/rest/v1/club?club_id=eq.${MAN_UTD_CLUB_ID}&select=*`,
    { headers },
  );
  check(clubRes, { "club fetch is 200": (r) => r.status === 200 });

  const profileRes = http.get(
    `${SUPABASE_URL}/rest/v1/tactical_profile?club_id=eq.${MAN_UTD_CLUB_ID}&is_current=eq.true&select=*`,
    { headers },
  );
  check(profileRes, { "tactical_profile fetch is 200": (r) => r.status === 200 });
}
