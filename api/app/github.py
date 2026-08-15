"""GitHub Actions workflow_dispatch call for /admin/pipeline/trigger (DC-08). Always mocked
in tests — a real external side effect doesn't belong in an automated test suite, per the
football-etl / pytest-testing skills' "never live-scrape/never hit live external services in
tests" convention extended to this call.
"""

from __future__ import annotations

import os

import httpx


def dispatch_etl_workflow(triggered_by: str = "admin") -> None:
    token = os.environ["GITHUB_TOKEN"]
    repo = os.environ["GITHUB_REPO"]
    response = httpx.post(
        f"https://api.github.com/repos/{repo}/actions/workflows/etl-schedule.yml/dispatches",
        headers={
            "Authorization": f"Bearer {token}",
            "Accept": "application/vnd.github+json",
        },
        json={"ref": "main", "inputs": {"triggered_by": triggered_by}},
        timeout=10,
    )
    response.raise_for_status()
