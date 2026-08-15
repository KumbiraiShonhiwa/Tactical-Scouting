"""GET /clubs/{club_id}/recommendations — reads from public.latest_fit_score (a
pre-aggregated view, per ADD §3.5's 2-second target), never recomputes on the fly. A club with
no fit_score rows yet (never had an admin recompute run) returns an empty players list, not an
error — the graceful empty state the Frontend Design Doc's four-state component convention
expects.
"""

from __future__ import annotations

from typing import Any, Literal

from fastapi import APIRouter, Depends, Query

from app.auth.admin import get_optional_claims
from app.db import get_connection
from app.errors import not_found
from app.schemas import (
    Pagination,
    PlayerRecommendation,
    RecommendationsQuery,
    RecommendationsResponse,
)
from app.scoring.repository import age_from_dob

router = APIRouter()

SORT_COLUMNS = {
    "fit_score_desc": "lfs.score desc",
    "fit_score_asc": "lfs.score asc",
    "undervaluation_desc": "ui.index_value desc nulls last",
    "undervaluation_asc": "ui.index_value asc nulls last",
}


@router.get("/clubs/{club_id}/recommendations", response_model=RecommendationsResponse)
def get_recommendations(
    club_id: str,
    position: str | None = Query(default=None),
    age_min: int | None = Query(default=None),
    age_max: int | None = Query(default=None),
    min_minutes: int = Query(default=0),
    sort: Literal[
        "fit_score_desc", "fit_score_asc", "undervaluation_desc", "undervaluation_asc"
    ] = Query(default="fit_score_desc"),
    recommended_only: bool = Query(default=False),
    page: int = Query(default=1),
    page_size: int = Query(default=25),
    _claims: dict[str, Any] | None = Depends(get_optional_claims),
) -> RecommendationsResponse:
    query = RecommendationsQuery(
        position=position,
        age_min=age_min,
        age_max=age_max,
        min_minutes=min_minutes,
        sort=sort,
        recommended_only=recommended_only,
        page=page,
        page_size=page_size,
    )

    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("select 1 from public.club where club_id = %s", (club_id,))
            if cur.fetchone() is None:
                raise not_found(f"club {club_id} not found")

            cur.execute(
                "select version from public.tactical_profile where club_id = %s and is_current",
                (club_id,),
            )
            profile_row = cur.fetchone()
            profile_version = profile_row[0] if profile_row else 0

            where_clauses = ["lfs.club_id = %s"]
            params: list[Any] = [club_id]

            if query.position:
                where_clauses.append("p.position = %s")
                params.append(query.position)
            if query.age_min is not None:
                where_clauses.append("date_part('year', age(p.date_of_birth)) >= %s")
                params.append(query.age_min)
            if query.age_max is not None:
                where_clauses.append("date_part('year', age(p.date_of_birth)) <= %s")
                params.append(query.age_max)
            if query.min_minutes:
                where_clauses.append("coalesce(ps.minutes_played, 0) >= %s")
                params.append(query.min_minutes)
            if query.recommended_only:
                where_clauses.append("coalesce(ui.recommended, false) = true")

            where_sql = " and ".join(where_clauses)
            sort_sql = SORT_COLUMNS[query.sort]
            offset = (query.page - 1) * query.page_size

            joins = """
                from public.latest_fit_score lfs
                join public.player p on p.player_id = lfs.player_id
                left join lateral (
                    select minutes_played from public.player_statistics
                    where player_id = lfs.player_id order by retrieved_at desc limit 1
                ) ps on true
                left join public.undervaluation_index ui on ui.fit_score_id = lfs.fit_score_id
                left join lateral (
                    select valuation_amount, currency from public.market_valuation
                    where player_id = lfs.player_id order by valuation_date desc limit 1
                ) mv on true
            """

            cur.execute(f"select count(*) {joins} where {where_sql}", params)
            count_row = cur.fetchone()
            total_count = count_row[0] if count_row else 0

            cur.execute(
                f"""
                select p.player_id, p.full_name, p.position, p.date_of_birth,
                       ps.minutes_played, lfs.score, ui.index_value,
                       coalesce(ui.recommended, false), mv.valuation_amount, mv.currency
                {joins}
                where {where_sql}
                order by {sort_sql}
                limit %s offset %s
                """,
                [*params, query.page_size, offset],
            )
            rows = cur.fetchall()
    finally:
        conn.close()

    players = [
        PlayerRecommendation(
            player_id=str(row[0]),
            full_name=row[1],
            position=row[2],
            age=age_from_dob(row[3]),
            minutes_played=row[4] or 0,
            fit_score=float(row[5]),
            undervaluation_index=float(row[6]) if row[6] is not None else 0.0,
            recommended=row[7],
            current_valuation=float(row[8]) if row[8] is not None else None,
            valuation_currency=row[9] or "EUR",
        )
        for row in rows
    ]

    total_pages = (
        (total_count + query.page_size - 1) // query.page_size if total_count else 0
    )

    return RecommendationsResponse(
        club_id=club_id,
        profile_version=profile_version,
        players=players,
        pagination=Pagination(
            page=query.page,
            page_size=query.page_size,
            total_count=total_count,
            total_pages=total_pages,
        ),
    )
