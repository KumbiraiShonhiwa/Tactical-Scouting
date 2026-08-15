"""FastAPI app factory. Registers routers, the structured-error-envelope exception handlers,
and rate limiting for public endpoints (3.2.4), per docs/api-spec.yaml's shared conventions.
"""

from __future__ import annotations

import os
from collections.abc import Mapping, Sequence
from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import ValidationError
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi.util import get_remote_address

from app.errors import AppError
from app.routers import admin, fit_breakdown, health, recommendations

limiter = Limiter(
    key_func=get_remote_address,
    default_limits=[f"{os.environ.get('RATE_LIMIT_PER_MINUTE', 60)}/minute"],
)


def create_app() -> FastAPI:
    app = FastAPI(title="Tactical-Scouting Analysis API")
    app.state.limiter = limiter
    app.add_middleware(SlowAPIMiddleware)

    app.include_router(health.router)
    app.include_router(recommendations.router)
    app.include_router(fit_breakdown.router)
    app.include_router(admin.router)

    @app.exception_handler(AppError)
    def handle_app_error(_request: Request, exc: AppError) -> JSONResponse:
        return JSONResponse(status_code=exc.status_code, content=exc.to_envelope())

    def _validation_error_response(errors: Sequence[Mapping[str, Any]]) -> JSONResponse:
        field_errors: dict[str, Any] = {}
        for error in errors:
            field = ".".join(str(loc) for loc in error["loc"] if loc != "body")
            field_errors[field or "body"] = error["msg"]
        return JSONResponse(
            status_code=422,
            content={
                "error": {
                    "code": "validation_error",
                    "message": "request failed validation",
                    "details": {"field_errors": field_errors},
                }
            },
        )

    @app.exception_handler(RequestValidationError)
    def handle_validation_error(
        _request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        return _validation_error_response(exc.errors())

    @app.exception_handler(ValidationError)
    def handle_pydantic_validation_error(
        _request: Request, exc: ValidationError
    ) -> JSONResponse:
        # Raised when a route manually constructs a Pydantic model from query params (e.g.
        # RecommendationsQuery in routers/recommendations.py) rather than FastAPI parsing a
        # request body directly — a different exception type than RequestValidationError,
        # but the same 422 envelope shape applies.
        return _validation_error_response(exc.errors())

    @app.exception_handler(RateLimitExceeded)
    def handle_rate_limit(request: Request, exc: RateLimitExceeded) -> JSONResponse:
        _rate_limit_exceeded_handler(request, exc)
        return JSONResponse(
            status_code=429,
            content={
                "error": {
                    "code": "rate_limited",
                    "message": "rate limit exceeded",
                    "details": {},
                }
            },
        )

    @app.exception_handler(Exception)
    def handle_unexpected_error(_request: Request, _exc: Exception) -> JSONResponse:
        # Never leak internals (stack traces, SQL) — generic message, empty details.
        return JSONResponse(
            status_code=500,
            content={
                "error": {
                    "code": "internal_error",
                    "message": "an unexpected error occurred",
                    "details": {},
                }
            },
        )

    return app


app = create_app()
