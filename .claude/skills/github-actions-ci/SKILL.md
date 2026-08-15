---
name: github-actions-ci
description: GitHub Actions CI/CD skill for Tactical-Scouting test gates, deployment and scheduled ETL.
---
# GitHub Actions

Architecture workflows:
- `test-and-lint.yml`
- `deploy-migrations.yml`
- `deploy-backend.yml`
- `etl-schedule.yml`

## PR gate
Run:
1. lint/type checks;
2. Python unit tests;
3. frontend tests/build;
4. local/ephemeral Supabase migrations;
5. pgTAP/RLS;
6. integration tests;
7. E2E smoke;
8. secret scanning.

## Deployment
- merge to main applies migrations;
- backend deployment builds FastAPI container;
- ETL is scheduled/manual;
- pipeline completion calls the pipeline-webhook Edge Function.

Never store secrets in workflow source. Use encrypted GitHub secrets/environment variables.
