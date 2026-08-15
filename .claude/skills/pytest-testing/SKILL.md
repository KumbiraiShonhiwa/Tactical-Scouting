---
name: pytest-testing
description: Python pytest strategy for ETL, FastAPI, scoring, validation and integration tests.
---
# pytest

## Unit tests
Use pytest + pytest-mock. Mock HTTP/database I/O.

Cover:
- parsers;
- validators;
- normalization;
- scoring math;
- undervaluation;
- Pydantic validation;
- JWT verification.

Use Hypothesis where property-based testing adds value.

## Integration
Use pytest + httpx against the real local Supabase stack. Do not mock away RLS behavior.

## Coverage
Target:
- >=80% backend overall;
- >=90% scoring/validation modules.

## Test principles
- deterministic fixtures;
- focused assertions;
- meaningful failure messages;
- no live scraping;
- no production credentials.
