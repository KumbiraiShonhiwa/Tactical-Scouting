"""Validation entry points: turn a raw scraped record into either a validated Pydantic model
or a QuarantineCandidate with a human-readable reason — never a silent drop, never a silently
coerced value (per the data-quality skill).
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from pydantic import ValidationError

from validators.models import ValidatedMarketValuation, ValidatedPlayer, ValidatedPlayerStatistics


@dataclass
class QuarantineCandidate:
    source_table: str
    raw_record: dict[str, Any]
    reason: str
    data_source: str


def validate_player(
    raw: dict[str, Any], data_source: str
) -> tuple[ValidatedPlayer | None, QuarantineCandidate | None]:
    try:
        return ValidatedPlayer(**raw), None
    except ValidationError as exc:
        return None, QuarantineCandidate(
            source_table="public.player",
            raw_record=raw,
            reason=str(exc),
            data_source=data_source,
        )


def validate_player_statistics(
    raw: dict[str, Any], data_source: str
) -> tuple[ValidatedPlayerStatistics | None, QuarantineCandidate | None]:
    try:
        return ValidatedPlayerStatistics(**raw), None
    except ValidationError as exc:
        return None, QuarantineCandidate(
            source_table="public.player_statistics",
            raw_record=raw,
            reason=str(exc),
            data_source=data_source,
        )


def validate_market_valuation(
    raw: dict[str, Any], data_source: str
) -> tuple[ValidatedMarketValuation | None, QuarantineCandidate | None]:
    try:
        return ValidatedMarketValuation(**raw), None
    except ValidationError as exc:
        return None, QuarantineCandidate(
            source_table="public.market_valuation",
            raw_record=raw,
            reason=str(exc),
            data_source=data_source,
        )
