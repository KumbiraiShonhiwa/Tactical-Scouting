# User Guide

Short walkthroughs for each role, against the actual built product (Phases 4–6). No sign-in is
needed for anything except the Administrator section below — every route under `/admin` is the
only part of the site that requires it.

## Scout / Analyst (public — no sign-in required)

**Browsing tactical fit recommendations (UC-1).** The home page (`/`) lists all six covered
clubs. Selecting one opens its Club Detail page (`/clubs/:clubId`), which shows:

- the club's **tactical profile** as a radar chart (possession share, pressing, build-up
  speed, defensive line height, crossing frequency, pressing intensity) — every chart also has
  a "Show as table" toggle for an accessible, screen-reader-friendly alternative to the visual;
- a **Filters** panel (position, age range, minimum minutes played, sort order, and a
  "Recommended (undervalued) only" checkbox) — on narrow/mobile screens this collapses behind a
  "Show filters" toggle to save space; filter state lives in the URL's query string, so a
  filtered view can be bookmarked or shared as a link;
- a **fit-vs-value scatter plot** and a **ranked candidate table**, both reflecting whatever
  filters are currently applied.

**Identifying undervalued players (UC-2).** Each candidate's `fit_score` (0–1, how well their
statistical profile matches the club's tactical weightings) and `undervaluation_index` (higher
= more undervalued relative to same-position peers' market value) are both shown in the ranked
table. Players whose undervaluation index clears the platform's threshold get a "★ Recommended"
badge — check "Recommended (undervalued) only" in Filters to see just those.

**Opening a player's detail view.** Clicking a player's name from the ranked table or the
scatter plot opens their Player Detail page (`/players/:playerId?club_id=...`), which explains
*why* they scored the way they did — a per-metric breakdown of how much each tactical dimension
contributed to the overall fit score, in plain language rather than raw numbers.

**Comparing two players (UC-3).** Add a player to the comparison list from either the ranked
table ("Compare" button per row) or their own Player Detail page ("Add to comparison"). This
list is entirely client-side (saved to the browser's `localStorage`, so it survives a page
refresh but isn't shared across devices or requires an account). Once at least one player is
added, a "Compare (N)" link appears — it opens the Comparison page
(`/compare?players=id1,id2,...`), which overlays both players' tactical radars and shows a
side-by-side statistics table, with a "Remove" action per player.

**Exporting or sharing a shortlist.** On a Club Detail page, "Export CSV" immediately downloads
the currently visible (filtered) ranked list as a CSV file, entirely in the browser. "Get
shareable link" instead asks the server to generate the same CSV and returns a short-lived
signed download link you can copy and send to someone else — useful when the recipient doesn't
have the site open themselves.

## Administrator (sign-in required — `/admin/*` only)

Signing in (`/login`) only gates the `/admin` section; every page described above works fully
without an account. Visiting `/admin` lands on Pipeline Runs by default.

**Reviewing and triggering a data refresh (UC-4).** `/admin/pipeline-runs` shows the pipeline
run history (status, start/completion time, records processed) and updates live as a run
progresses. A "Trigger run" action starts a fresh scrape → validate → load cycle outside the
normal schedule.

**Updating a club's tactical profile (UC-5).** `/admin/tactical-profiles` lets you pick a club
and adjust its six weighting sliders (they must stay non-negative and sum to 1.0 — the editor
enforces this before allowing a save). Saving creates a new, versioned profile — previous
versions and the fit scores computed from them are never overwritten, so historical scores
stay reproducible. Recomputing every candidate player's fit score against the new weightings
happens automatically in the background after saving (not instantly): the page shows the new
profile version and a "recompute enqueued" status right away, and the updated scores appear
across the site (ranked tables, scatter plots) within a few seconds.

**Viewing users.** `/admin/users` lists registered users and their roles. **This page is
read-only** — it does not support promoting, demoting, or inviting users. Role changes are
performed directly via the Supabase dashboard, not through this UI.

## Disclaimer (present on every screen per SRS 8.4)

This platform's outputs are for educational and portfolio demonstration purposes only. They
are not intended for professional scouting, recruitment, or financial/betting decisions.
