---
name: football-etl
description: Football data ETL skill for FBref, WhoScored and Transfermarkt extraction, validation, normalization, quarantine and atomic loading.
---
# Football ETL

Pipeline:

```text
Extract -> Transform/Validate -> Load
```

## Extract
- Keep source-specific scraper modules.
- Respect robots.txt.
- Rate-limit requests.
- Use source-specific throttling/User-Agent handling.
- Public pages only.
- Preserve source attribution.
- Never live-scrape during automated tests.

## Transform
- Validate required fields.
- Reject impossible ranges.
- Deduplicate and resolve player names across sources.
- Calculate per-90 values.
- Calculate position-relative z-scores.
- Send invalid records to `private.quarantine` with a reason.

## Load
- Write validated data to staging.
- Use `service_role` only in trusted server-side ETL context.
- Perform atomic swap/merge.
- Preserve last-known-good public data if the run fails.
- Record run status and counts in `pipeline_run`.

## Tests
Use recorded HTML/JSON fixtures for each source. Test parsing, validation, normalization, rate limiting/backoff, quarantine and partial-failure behavior.
