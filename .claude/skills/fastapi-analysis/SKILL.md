---
name: fastapi-analysis
description: FastAPI analysis-service implementation skill for tactical fit, undervaluation, validation and JWT verification.
---
# FastAPI Analysis

## Responsibilities
Use FastAPI for:
- tactical-fit computation;
- undervaluation computation;
- computation-heavy analysis;
- protected admin operations that require server-side privileges.

Use scikit-learn for the specified similarity/clustering work.

## Rules
- Pydantic validates incoming filters.
- Reject invalid positions, negative minutes and malformed inputs before business logic.
- Verify Supabase JWTs using the project's JWKS on authenticated routes.
- Do not create a second identity provider.
- Never put `service_role` in frontend code.
- Return structured error payloads.
- Apply rate limiting to public endpoints.

## Testing
Test:
- known similarity boundary cases;
- undervaluation threshold behavior;
- request validation;
- expired/malformed/wrong-audience JWTs;
- API ↔ local Supabase integration with seeded data.
