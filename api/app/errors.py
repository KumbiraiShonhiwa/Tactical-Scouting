"""Structured error envelope per docs/api-spec.yaml's shared conventions:
{ "error": { "code": "...", "message": "...", "details": {} } } for every non-2xx response.
"""

from __future__ import annotations

from typing import Any


class AppError(Exception):
    """Raised anywhere in the app to produce a structured error response. Caught by the
    global exception handler registered in main.py — never a raw 500 with leaked internals."""

    def __init__(
        self,
        status_code: int,
        code: str,
        message: str,
        details: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.code = code
        self.message = message
        self.details = details or {}

    def to_envelope(self) -> dict[str, Any]:
        return {"error": {"code": self.code, "message": self.message, "details": self.details}}


def unauthorized(message: str = "missing or invalid authentication token") -> AppError:
    return AppError(401, "unauthorized", message)


def forbidden(message: str = "insufficient role for this action") -> AppError:
    return AppError(403, "forbidden", message)


def not_found(message: str) -> AppError:
    return AppError(404, "not_found", message)


def rate_limited(message: str = "rate limit exceeded") -> AppError:
    return AppError(429, "rate_limited", message)
