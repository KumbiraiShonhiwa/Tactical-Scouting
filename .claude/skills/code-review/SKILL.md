---
name: code-review
description: Tactical-Scouting architecture-aware code review skill.
---
# Code Review

Review every change against:

## Architecture
Does it preserve ETL/API/frontend/Supabase boundaries?

## Security
Could it bypass RLS, expose service_role, leak credentials or weaken JWT validation?

## Database
Are schema changes migrations? Are indexes/constraints/RLS considered?

## ETL
Does it preserve rate limiting, robots.txt, attribution, quarantine and atomic publication?

## Frontend
Does it reuse the design-system components? Are all four component states present? Is URL state preserved?

## Testing
Are the correct unit/integration/E2E/security/accessibility tests added?

## Performance
Could queries, rendering, connections or scoring exceed documented targets?

## Accessibility
Are keyboard operation, labels, contrast and chart fallbacks preserved?

## Scope
Reject unrelated refactors unless explicitly requested.
