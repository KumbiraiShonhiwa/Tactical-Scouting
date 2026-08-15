---
name: python-quality
description: Ruff, mypy and Python maintainability skill for ETL and FastAPI.
---
# Python Quality

Use:
```bash
ruff check .
ruff format --check .
mypy .
```

Rules:
- keep type boundaries explicit;
- avoid `Any` in core scoring/validation logic;
- keep functions small and testable;
- prefer clear domain types over dictionaries where practical;
- do not silence lint/type errors without documenting why.

CI target: zero ruff/mypy errors.
