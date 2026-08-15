"""Shared-secret auth for service-to-service calls (Edge Functions -> FastAPI), not a user
JWT. Used only by app/routers/internal.py — never exposed in docs/api-spec.yaml's public
contract.
"""

from __future__ import annotations

import os
from typing import Annotated

from fastapi import Header

from app.errors import unauthorized


def require_internal_secret(
    x_internal_secret: Annotated[str | None, Header()] = None,
) -> None:
    expected = os.environ["INTERNAL_FUNCTION_SECRET"]
    if x_internal_secret != expected:
        raise unauthorized("missing or invalid X-Internal-Secret header")
