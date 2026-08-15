# Data Ethics / ToS Compliance Record

Dated record of what each source's `robots.txt` actually permits, checked directly (not
assumed) before any scraper code is written, per SRS 8.1/8.4/DC-07 and CLAUDE.md §5. This is
evidence behind the compliance claims, not a restated constraint — see the raw findings below.

**Check performed:** 2026-08-15, from this development environment.
**Re-check cadence:** re-verify each source's `robots.txt` immediately before Phase 2 (ETL)
implementation begins, and quarterly thereafter (per the Testing Documentation Appendix C open
item on fixture-refresh cadence — the same cadence is applied here).

**Runtime enforcement, not just this document's static snapshot:** `etl/scrapers/base.py`'s
`RobotsChecker` re-fetches and re-parses each source's `robots.txt` at request time using a
custom wildcard/`$`-anchor matcher — stdlib `urllib.robotparser` was found to silently
under-enforce FootyStats' `/players?*` rule (a `*` wildcard combined with a literal `?`) and
was replaced for that reason (see `.claude/PROJECT_STATUS.md`'s Phase 2 entry). So the findings
below are re-verified live on every scrape, not just trusted from this document.

## FBref (fbref.com) — superseded, see FootyStats.org below

**Status: ⚠️ Could not verify `robots.txt` — blocked by Cloudflare's bot-challenge page before
any content is returned**, both via the WebFetch tool and a direct `curl` request with a
descriptive User-Agent. The response was an HTML "Just a moment..." Cloudflare managed
challenge (JS-required), not the actual `robots.txt` file. This is a materially different
finding than "robots.txt disallows scraping" — FBref's edge infrastructure blocks non-browser
automated requests before robots.txt can even be read, independent of compliance intent.

**Decision (2026-08-15): DC-01's data source is changed from FBref to FootyStats.org** (see
below), which was verified accessible and robots.txt-compliant. This is a **resolved, not
deferred**, item — no headless-browser workaround is needed for the current release. FBref
remains a permitted `data_source` value in the schema (`player_statistics.data_source` check
constraint) in case a future release revisits it via a browser-based approach, but no scraper
should be built against it now.

## FootyStats.org (replaces FBref for DC-01)

**Status: ✅ Verified 2026-08-15**, checked against the list of free football data sources at
https://english-programs.sportsdatacampus.com/free-football-data-websites/ after FBref proved
unreachable.

Representative rules from `robots.txt` (abbreviated — the full file also lists per-bot
crawl-delays and many non-football esports/locale paths not relevant here):

```
User-agent: *
Disallow: /api/club*
Disallow: /api/team*
Disallow: /api/match*
Disallow: /england/league-one
Disallow: /england/league-one/*
Disallow: /england/league-two
Disallow: /england/league-two/*
Disallow: /*.php
Disallow: /matches?*
Disallow: /team-stats?*
Disallow: /players?*
```

**Compliance interpretation:** static club/player pages (e.g. `/england/manchester-united-fc`,
confirmed reachable with a `200` response) are not in the disallow list. Only query-string
endpoints (`/players?*`, `/team-stats?*`, `/matches?*`), the `/api/*` paths, and English
League One/Two are blocked — none of which the six-target-club Premier League scope needs.
No `Crawl-delay` is set for the wildcard agent (only for named bots: `Applebot` 20s,
`SeznamBot` 5s, `ClaudeBot` 1s, others 10s) — the ETL layer applies the same conservative 2s
floor used for WhoScored/Transfermarkt rather than assuming an unstated default is fast.

| Source | Rate limit | User-Agent |
|---|---|---|
| FootyStats.org | ≥ 2 s between requests; only static (non-query-string) club/player pages | `TacticalScoutingBot/1.0 (+https://github.com/KumbiraiShonhiwa/Tactical-Scouting; educational/portfolio project, contact via repo issues)` |

## Other candidates evaluated and rejected (2026-08-15)

Checked against the same source list after the FBref block was discovered:

- **Understat.com** — `robots.txt` is `Disallow: /` for every user-agent (confirmed via direct
  fetch, even though the site itself returns `200 OK` for a browser). **Not usable** — DC-07
  means honoring robots.txt even when a block is technically bypassable.
- **StatsBomb Open Data** (github.com/statsbomb/open-data) — free, open, not scraping at all
  (JSON via GitHub), but its Premier League coverage is limited to the 2003/04 and 2015/16
  seasons (confirmed via `competitions.json`). **Not usable for current-season data** — noted
  as a possible future historical/backtesting enhancement, out of scope for this release.
- **API-Football (RapidAPI)** — a legitimate sanctioned API, not scraping, so no robots.txt
  concern. Deferred, not rejected: it would add a new external credential (RapidAPI key) not
  currently budgeted in `docs/environment-and-secrets.md`, and its freemium tier doesn't cover
  market valuations (Transfermarkt remains necessary regardless). Worth reconsidering if
  FootyStats' data proves insufficient during Phase 2 implementation.

## WhoScored (whoscored.com)

**Status: ✅ `robots.txt` compliant, but ⚠️ BLOCKED at implementation by client-side
rendering — DC-03 deferred (2026-08-15).**

Unlike FBref, WhoScored's `robots.txt` is fully compliant (see below) and a static fetch of a
team page succeeds (`200 OK`, no Cloudflare challenge). But a real captured fixture
(`etl/tests/fixtures/whoscored/team_manchester_united.html`) shows the page is a client-side-
rendered SPA: zero `<table>` elements, no embedded player/stats JSON, only JS application
bootstrap configuration. All real statistics are fetched by the browser after JS execution —
a plain `httpx` GET (the approach used for FootyStats and Transfermarkt, both proven to work
against real fixtures) returns none of the data DC-03 needs.

Two ways to unblock this, neither implemented in this pass (a decision for the project owner,
per CLAUDE.md §15 — not silently picked):
1. A headless-browser scraper (e.g. Playwright) that executes the page's JS before scraping
   the rendered DOM — same category of complexity/runtime cost already rejected for FBref.
2. Reverse-engineer WhoScored's internal JSON API endpoints that the JS app itself calls —
   lighter than a headless browser, but those endpoints are undocumented/unofficial, a
   materially different compliance posture than scraping public HTML pages even though
   still same-origin and within `robots.txt`'s scope.

Since DC-03 is "Should" priority (SRS 3.1.1), not "Must" like DC-01/DC-02, Phase 2 proceeds
with FootyStats (DC-01) and Transfermarkt (DC-02) fully implemented and tested against real
captured fixtures, leaving WhoScored/DC-03 as a flagged, documented gap rather than a forced
fragile implementation.

```
User-agent: *
Disallow: /Accounts/
Disallow: /Predictions/
Disallow: /Users/
Disallow: /accounts/
Disallow: /predictions/
Disallow: /users/
```

No `Crawl-delay` directive present. No bot-specific sections beyond the wildcard.

**Compliance interpretation:** match/team/player statistics pages (the pages DC-03 needs) are
not disallowed. Account, prediction, and user-profile paths are off-limits — the scraper must
never touch those paths, which is consistent with the design anyway (only public
tactical/style-of-play match data is needed). Because no `Crawl-delay` is specified, the ETL
layer applies its own conservative default rate limit (see below) rather than assuming
unlimited request rate is acceptable.

## Transfermarkt (transfermarkt.com)

**Status: ✅ Verified 2026-08-15.**

```
User-agent: Slurp
Crawl-delay: 2

User-agent: Mediapartners-Google
Disallow:

User-agent: wget
Disallow: /

User-agent: *
Allow: /
```

**Compliance interpretation:** the wildcard rule (`User-agent: *` → `Allow: /`) permits
general crawling of public pages, satisfying DC-02's need for market valuation pages.
`wget`'s literal user-agent string is explicitly blocked — the scraper must send a descriptive,
non-generic User-Agent (see below), which the ADD's design already requires for other reasons
(ADD §4.4: "descriptive User-Agent, request throttling"). `Slurp` (Yahoo) is given an explicit
2-second crawl-delay; since no delay is specified for `*`, the ETL layer applies at least that
same 2-second floor as a conservative default rather than assuming zero delay is acceptable
just because it isn't explicitly stated for the wildcard agent.

## Rate limits and User-Agent chosen (for Phase 2 implementation)

| Source | Rate limit | User-Agent |
|---|---|---|
| FBref | **Blocked pending resolution above** — not yet implemented | N/A |
| WhoScored | ≥ 2 s between requests to the same host (no `Crawl-delay` given; matching Transfermarkt's stated floor as a conservative default) | `TacticalScoutingBot/1.0 (+https://github.com/KumbiraiShonhiwa/Tactical-Scouting; educational/portfolio project, contact via repo issues)` |
| Transfermarkt | ≥ 2 s between requests (matches the `Slurp` `Crawl-delay`) | same descriptive UA as above |

All three sources: public pages only, no authentication/paywall bypass, source attribution
carried on every stored row (`data_source` column, per the data dictionary) and rendered in
the UI (SRS 3.2.6), and every scraper request logged with enough detail to audit rate-limit
compliance after the fact.

## Legal basis

Per SRS 8.1: MIT-licensed project; scraped third-party data is not claimed as owned by the
project, and any redistribution stays consistent with each source's terms of use. This record
does not constitute legal advice — if the project moves beyond educational/portfolio use, each
source's full Terms of Service (not just `robots.txt`) should be independently reviewed.
