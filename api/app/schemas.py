"""Pydantic request/response models mirroring docs/api-spec.yaml exactly. Field names and
shapes are a fixed contract from Phase 0 — do not drift from the spec without updating it.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, field_validator

VALID_POSITIONS = {
    "GK", "CB", "LB", "RB", "CDM", "CM", "CAM", "LM", "RM", "LW", "RW", "ST",
}

# The 5 fit-scoring dimensions with a real player-side proxy (defensive_line_height is
# excluded — see docs/data-dictionary.md and the Phase 3 plan's documented decision).
SCORABLE_DIMENSIONS = {
    "possession_share",
    "ppda",
    "buildup_speed",
    "crossing_frequency",
    "pressing_intensity",
}
# All dimensions an admin may set a weight for, including the club-only defensive_line_height.
ALL_DIMENSIONS = SCORABLE_DIMENSIONS | {"defensive_line_height"}


class ErrorDetail(BaseModel):
    code: str
    message: str
    details: dict[str, object] = Field(default_factory=dict)


class ErrorEnvelope(BaseModel):
    error: ErrorDetail


class Pagination(BaseModel):
    page: int
    page_size: int
    total_count: int
    total_pages: int


class PlayerRecommendation(BaseModel):
    player_id: str
    full_name: str
    position: str
    age: int | None = None
    minutes_played: int
    fit_score: float = Field(ge=0, le=1)
    undervaluation_index: float
    recommended: bool
    current_valuation: float | None = None
    valuation_currency: str = "EUR"


class RecommendationsResponse(BaseModel):
    club_id: str
    profile_version: int
    players: list[PlayerRecommendation]
    pagination: Pagination


class RecommendationsQuery(BaseModel):
    """Validated shape of GET /clubs/{club_id}/recommendations' query params — a malformed
    position or negative min_minutes is rejected with 422 before business logic runs."""

    position: str | None = None
    age_min: int | None = Field(default=None, ge=15, le=45)
    age_max: int | None = Field(default=None, ge=15, le=45)
    min_minutes: int = Field(default=0, ge=0)
    sort: Literal[
        "fit_score_desc", "fit_score_asc", "undervaluation_desc", "undervaluation_asc"
    ] = "fit_score_desc"
    recommended_only: bool = False
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=25, ge=1, le=100)

    @field_validator("position")
    @classmethod
    def position_must_be_known(cls, v: str | None) -> str | None:
        if v is not None and v not in VALID_POSITIONS:
            raise ValueError(f"unknown position '{v}' — not in {sorted(VALID_POSITIONS)}")
        return v


class ContributingMetric(BaseModel):
    metric: str
    label: str
    player_value: float | None
    club_target_value: float
    weight: float
    contribution: float


class FitBreakdownResponse(BaseModel):
    player_id: str
    club_id: str
    profile_version: int
    overall_score: float = Field(ge=0, le=1)
    contributing_metrics: list[ContributingMetric]


class WeightingsRequest(BaseModel):
    weightings: dict[str, float]

    @field_validator("weightings")
    @classmethod
    def weightings_must_be_valid(cls, v: dict[str, float]) -> dict[str, float]:
        unknown = set(v) - ALL_DIMENSIONS
        if unknown:
            raise ValueError(f"unknown weighting keys: {sorted(unknown)}")
        missing = ALL_DIMENSIONS - set(v)
        if missing:
            raise ValueError(f"missing weighting keys: {sorted(missing)}")
        if any(weight < 0 for weight in v.values()):
            raise ValueError("weights must be non-negative")
        total = sum(v.values())
        if abs(total - 1.0) > 1e-6:
            raise ValueError(f"weights must sum to 1.0, got {total}")
        return v


class WeightingsResponse(BaseModel):
    club_id: str
    profile_version: int
    recompute_status: Literal["enqueued", "completed"]


class PipelineTriggerResponse(BaseModel):
    run_id: str
    status: str
