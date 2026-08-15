---
name: playwright-e2e
description: Playwright full-stack E2E skill for UC-1 through UC-5 and responsive testing.
---
# Playwright

Use deterministic seeded data and a fully running stack.

## Required journeys
- E2E-01 UC-1: browse tactical fit recommendations.
- E2E-02 UC-2: identify undervalued players.
- E2E-03 UC-3: compare two players.
- E2E-04 UC-4: refresh the pipeline.
- E2E-05 UC-5: update a tactical profile.

## Execution
- PR: one smoke test per use case.
- Nightly: full suite including responsive/mobile checks.
- Enable trace/video on failure.
- Use dedicated throwaway admin accounts for admin scenarios.
- Never use live scraped data.

## Accessibility
Run axe-core on key pages and keyboard-navigation smoke tests.
