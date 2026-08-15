---
name: performance-testing
description: k6/Locust performance skill for Tactical-Scouting documented non-functional targets.
---
# Performance

Targets:
- dashboard: 3s;
- fit computation: 2s;
- six-club ETL refresh: 2 hours.

Test against:
- ~2,000-player dataset for dashboard;
- ~500-player filtered scoring pool for fit computation.

Run performance tests nightly/pre-release against staging, not production.

Use k6 or Locust. Prefer p95 metrics for endpoint performance.

When optimizing, first inspect query plans, indexes, pre-aggregation, caching and connection pooling before adding complexity.
