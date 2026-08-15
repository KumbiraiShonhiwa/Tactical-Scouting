"""FastAPI app factory. Registers routers, the structured-error-envelope exception handlers,
and rate limiting for public endpoints (3.2.4), per docs/api-spec.yaml's shared conventions.
"""

from __future__ import annotations

import os
from collections.abc import Mapping, Sequence
from typing import Any

from fastapi import Depends, FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import ValidationError

from app.errors import AppError
from app.rate_limit import enforce_rate_limit, get_rate_limiter
from app.routers import admin, fit_breakdown, health, internal, recommendations


def create_app() -> FastAPI:
    app = FastAPI(
        title="Tactical-Scouting Analysis API",
        dependencies=[Depends(enforce_rate_limit)],
    )
    app.state.rate_limiter = get_rate_limiter()

    # Real bug caught by Phase 6's Playwright E2E suite: the frontend (a different origin —
    # localhost:5173/4173 locally, a distinct deployed domain in production) had never
    # actually been able to call this service from a real browser. Every prior test used a
    # direct HTTP client (curl/httpx/pytest's TestClient) — none of those enforce CORS, since
    # it's a browser-side security mechanism, not a server-side one — so the browser's
    # preflight OPTIONS request silently 405'd and every fetch failed, invisibly, until a real
    # browser actually made the call.
    cors_origins = [
        origin.strip()
        for origin in os.environ.get(
            "CORS_ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:4173"
        ).split(",")
        if origin.strip()
    ]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=cors_origins,
        allow_methods=["GET", "POST"],
        allow_headers=["Authorization", "Content-Type"],
    )

    # VibeSec audit finding (medium): no response set any hardening headers. This is a
    # JSON-only API — never serves HTML/JS — so the CSP is maximally strict (default-src
    # 'none') rather than the 'self'-based policy a page-serving app would need.
    @app.middleware("http")
    async def add_security_headers(request: Request, call_next: Any) -> Any:
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Content-Security-Policy"] = "default-src 'none'"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return response

    app.include_router(health.router)
    app.include_router(recommendations.router)
    app.include_router(fit_breakdown.router)
    app.include_router(admin.router)
    app.include_router(internal.router)

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
