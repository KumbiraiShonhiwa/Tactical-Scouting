---
name: tactical-scouting
description: Master project skill for Tactical-Scouting architecture, requirements, boundaries, conventions, and safe implementation.
---
# Tactical-Scouting

Use this skill for cross-cutting work.

## Core architecture
- `etl/`: Python scraping, validation, normalization, loading.
- `api/`: FastAPI + scikit-learn analysis.
- `frontend/`: React + Tailwind + Chart.js/D3.
- `supabase/`: migrations, seed, Edge Functions.
- `.github/workflows/`: CI/CD.

## Operating rules
- Preserve the ETL/API/frontend/Supabase boundaries.
- Treat RLS as the authorization boundary.
- Use migrations for every schema change.
- Never expose `service_role`.
- Prefer PostgREST for simple filtered reads.
- Prefer FastAPI for computation-heavy scoring.
- Use Edge Functions for short triggered jobs.
- Add tests with feature changes.
- Do not invent requirements when the design documents are silent.

## Requirement traceability
When implementing a feature, identify the relevant SRS IDs such as DC-*, TP-*, PA-*, UV-*, DV-*, AD-* and keep the implementation/test traceable to them.
