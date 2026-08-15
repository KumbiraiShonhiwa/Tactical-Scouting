---
name: react-dashboard
description: React SPA architecture skill for Tactical-Scouting dashboard pages, state, routing and reusable components.
---
# React Dashboard

## Pages
- `/`
- `/clubs/:clubId`
- `/players/:playerId`
- `/compare?players=a,b`
- `/login`
- `/admin/*`

## Data/state
- TanStack Query owns server state.
- URL query parameters own filters/sort/selected-club state.
- Supabase Auth context exposes session/role.
- Use PostgREST for simple RLS-protected reads.
- Use FastAPI for analysis endpoints.

## Component hierarchy
```text
atoms -> molecules -> organisms -> pages
```

Reuse:
- RadarChart
- FitValueScatter
- RankedPlayerTable
- FilterBar
- ClubProfileCard
- PlayerStatsPanel
- ValuationTrendChart
- ProfileWeightEditor
- PipelineRunLog
- ExportButton

## Component states
Every data-bearing component must have loading, populated, empty and error states.
