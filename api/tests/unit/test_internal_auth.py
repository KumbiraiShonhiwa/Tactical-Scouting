"""Unit tests for the internal shared-secret dependency (service-to-service, not a user JWT) —
see app/auth/internal.py's module docstring."""

from __future__ import annotations

import pytest

from app.auth.internal import require_internal_secret
from app.errors import AppError


def test_missing_secret_header_is_rejected(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("INTERNAL_FUNCTION_SECRET", "correct-secret")
    with pytest.raises(AppError) as exc_info:
        require_internal_secret(x_internal_secret=None)
    assert exc_info.value.status_code == 401


def test_wrong_secret_header_is_rejected(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("INTERNAL_FUNCTION_SECRET", "correct-secret")
    with pytest.raises(AppError) as exc_info:
        require_internal_secret(x_internal_secret="wrong-secret")
    assert exc_info.value.status_code == 401


def test_correct_secret_header_is_accepted(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("INTERNAL_FUNCTION_SECRET", "correct-secret")
    require_internal_secret(x_internal_secret="correct-secret")  # does not raise
