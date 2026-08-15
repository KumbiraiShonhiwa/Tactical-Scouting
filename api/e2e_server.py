"""E2E test-harness entrypoint — NOT the production/dev entrypoint (that's `uvicorn
app.main:create_app --factory`, see docs/runbook.md). Runs the real app with exactly one
override: the GitHub Actions dispatch call is stubbed out, via the same
`app.dependency_overrides` mechanism `api/tests/integration/conftest.py` already uses for
pytest, exposed here as a runnable script so Playwright's E2E-04 (UC-4) can exercise the real
UI -> API -> DB -> Realtime path without making a real external call to GitHub — matching the
Testing Documentation §5.1's "against a stubbed ETL trigger in CI" for that scenario.
"""

from __future__ import annotations

import uvicorn

from app.main import create_app
from app.routers.admin import get_github_dispatcher

app = create_app()
app.dependency_overrides[get_github_dispatcher] = lambda: (lambda triggered_by, run_id: None)

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)
