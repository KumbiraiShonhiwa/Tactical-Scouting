"""Pydantic models mirroring the Phase 1 schema (docs/data-dictionary.md) — the validated
shape a record must have before the loader will write it. Field names and constraints match
the `public.player`, `public.player_statistics`, and `public.market_valuation` migrations
exactly; do not drift from them without a corresponding migration.
"""

from __future__ import annotations

from datetime import date, datetime

from pydantic import BaseModel, Field, field_validator

VALID_POSITIONS = {
    "GK", "CB", "LB", "RB", "CDM", "CM", "CAM", "LM", "RM", "LW", "RW", "ST",
}
VALID_DATA_SOURCES = {"fbref", "footystats", "whoscored", "transfermarkt"}


class ValidatedPlayer(BaseModel):
    full_name: str = Field(min_length=1)
    date_of_birth: date | None = None
    nationality: str | None = None
    position: str
    current_club: str | None = None
    source_ids: dict[str, str] = Field(default_factory=dict)

    @field_validator("position")
    @classmethod
    def position_must_be_known(cls, v: str) -> str:
        if v not in VALID_POSITIONS:
            raise ValueError(f"unknown position '{v}' — not in {sorted(VALID_POSITIONS)}")
        return v


class ValidatedPlayerStatistics(BaseModel):
    season: str = Field(min_length=1)
    minutes_played: int = Field(ge=0)
    appearances: int | None = Field(default=None, ge=0)
    possession_involvement_pct: float | None = None
    passes_completed_per90: float | None = None
    pass_completion_pct: float | None = None
    progressive_passes_per90: float | None = None
    progressive_carries_per90: float | None = None
    defensive_actions_per90: float | None = None
    pressures_per90: float | None = None
    tackles_won_per90: float | None = None
    interceptions_per90: float | None = None
    crosses_per90: float | None = None
    goals_per90: float | None = None
    assists_per90: float | None = None
    expected_goals_per90: float | None = None
    expected_assists_per90: float | None = None
    data_source: str
    retrieved_at: datetime

    @field_validator("data_source")
    @classmethod
    def data_source_must_be_known(cls, v: str) -> str:
        if v not in VALID_DATA_SOURCES:
            raise ValueError(f"unknown data_source '{v}' — not in {sorted(VALID_DATA_SOURCES)}")
        return v

    @field_validator(
        "possession_involvement_pct",
        "passes_completed_per90",
        "pass_completion_pct",
        "progressive_passes_per90",
        "progressive_carries_per90",
        "defensive_actions_per90",
        "pressures_per90",
        "tackles_won_per90",
        "interceptions_per90",
        "crosses_per90",
        "goals_per90",
        "assists_per90",
        "expected_goals_per90",
        "expected_assists_per90",
    )
    @classmethod
    def stats_must_not_be_negative(cls, v: float | None) -> float | None:
        if v is not None and v < 0:
            raise ValueError("statistic values cannot be negative")
        return v


class ValidatedMarketValuation(BaseModel):
    valuation_amount: float = Field(ge=0)
    currency: str = Field(min_length=1)
    valuation_date: date
    data_source: str

    @field_validator("data_source")
    @classmethod
    def data_source_must_be_known(cls, v: str) -> str:
        if v not in VALID_DATA_SOURCES:
            raise ValueError(f"unknown data_source '{v}' — not in {sorted(VALID_DATA_SOURCES)}")
        return v
