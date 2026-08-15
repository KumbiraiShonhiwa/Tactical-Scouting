"""WhoScored scraper — DC-03 (tactical/style-of-play match data). Currently BLOCKED, not
implemented. Priority is "Should" (SRS 3.1.1), not "Must", so this is a documented deferral,
not a silent gap — see docs/data-ethics-compliance.md for the full write-up.

Investigation (2026-08-15): unlike FBref, WhoScored's `robots.txt` is compliant (only
/Accounts/, /Predictions/, /Users/ are disallowed — team/player pages are fine). But a real
captured fixture of a team page (etl/tests/fixtures/whoscored/team_manchester_united.html)
confirms the site is a client-side-rendered SPA: the static HTML has zero <table> elements and
no embedded player/stats JSON, only JS application bootstrap config. All real statistics are
fetched by the browser after JS execution.

Two ways to unblock this, neither implemented here (a decision for the project owner, per
CLAUDE.md 15 — don't silently pick one):
  1. A headless-browser scraper (e.g. Playwright) that executes the page's JS before scraping
     the rendered DOM — same category of complexity/runtime cost flagged for the (also
     rejected) FBref headless-browser option.
  2. Reverse-engineer WhoScored's internal JSON API endpoints that the JS app itself calls —
     faster and lighter than a headless browser, but those endpoints are undocumented/
     unofficial, which is a materially different compliance posture than scraping public HTML
     pages (still same-origin, same robots.txt scope, but relies on an interface not intended
     for direct third-party consumption).
"""

from __future__ import annotations


def scrape_team_page(_html: str) -> None:
    raise NotImplementedError(
        "WhoScored requires JS-rendered content; see the module docstring and "
        "docs/data-ethics-compliance.md for the blocker and unblocking options."
    )
