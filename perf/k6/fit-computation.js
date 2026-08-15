// Testing Documentation §6.1: "Fit computation: the FastAPI scoring endpoint is load-tested
// with a ~500-player filtered pool and asserted to complete within the 2-second target when
// served from cached/pre-aggregated statistics — covers 3.2.1."
//
// Targets the LOCAL ephemeral stack (see dashboard-load.js's header comment for why — no
// staging project exists). GET /clubs/{id}/recommendations reads the pre-aggregated
// latest_fit_score view (ADD §3.5), not a live recompute, matching "served from cached/
// pre-aggregated statistics" — the seeded pool is ~2 players per club, not ~500, so this
// checks headroom against the target, not production-scale throughput.
import http from "k6/http";
import { check } from "k6";

const API_BASE_URL = __ENV.API_BASE_URL || "http://127.0.0.1:8000";
const MAN_UTD_CLUB_ID = "c1111111-1111-1111-1111-111111111111";

export const options = {
  vus: 10,
  duration: "20s",
  thresholds: {
    http_req_duration: ["p(95)<2000"], // 3.2.1's 2-second fit-computation target
    checks: ["rate>0.99"],
  },
};

export default function () {
  const res = http.get(
    `${API_BASE_URL}/clubs/${MAN_UTD_CLUB_ID}/recommendations?min_minutes=0&page_size=100`,
  );
  check(res, {
    "recommendations fetch is 200": (r) => r.status === 200,
    "response has players array": (r) => JSON.parse(r.body).players !== undefined,
  });
}
