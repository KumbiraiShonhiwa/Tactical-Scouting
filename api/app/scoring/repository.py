"""Data access for the scoring engine — kept separate from app/scoring/fit_score.py and
undervaluation.py so the scoring math stays pure and unit-testable without a database.
"""

from __future__ import annotations

from datetime import date
from typing import Any

from psycopg2.extensions import connection as PGConnection
from psycopg2.extras import RealDictCursor

STATS_COLUMNS = (
    "possession_involvement_pct",
    "defensive_actions_per90",
    "progressive_passes_per90",
    "progressive_carries_per90",
    "crosses_per90",
    "pressures_per90",
)


def _floatify_stats(row: dict[str, Any]) -> dict[str, Any]:
    """psycopg2 returns `numeric` columns as Decimal, which scipy/numpy can't operate on
    (e.g. norm.cdf raises TypeError on a Decimal input) — cast at the DB boundary so every
    downstream scoring function deals with plain floats consistently."""
    for column in STATS_COLUMNS:
        if row.get(column) is not None:
            row[column] = float(row[column])
    return row


def get_current_profile(conn: PGConnection, club_id: str) -> dict[str, Any] | None:
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            select profile_id, version, weightings
            from public.tactical_profile
            where club_id = %s and is_current
            """,
            (club_id,),
        )
        row = cur.fetchone()
    return dict(row) if row is not None else None


def get_all_player_stats(conn: PGConnection) -> dict[str, dict[str, Any]]:
    """Latest player_statistics row per player (by retrieved_at), joined with player identity
    fields, keyed by player_id. Used for a full club recompute (every stats-having player)."""
    columns = ", ".join(f"ps.{c}" for c in STATS_COLUMNS)
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            f"""
            select distinct on (ps.player_id)
                ps.player_id, p.full_name, p.position, p.date_of_birth,
                ps.minutes_played, {columns}
            from public.player_statistics ps
            join public.player p using (player_id)
            order by ps.player_id, ps.retrieved_at desc
            """
        )
        rows = cur.fetchall()
    return {row["player_id"]: _floatify_stats(dict(row)) for row in rows}


def get_player_stats(conn: PGConnection, player_id: str) -> dict[str, Any] | None:
    columns = ", ".join(f"ps.{c}" for c in STATS_COLUMNS)
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            f"""
            select distinct on (ps.player_id)
                ps.player_id, p.full_name, p.position, p.date_of_birth,
                ps.minutes_played, {columns}
            from public.player_statistics ps
            join public.player p using (player_id)
            where ps.player_id = %s
            order by ps.player_id, ps.retrieved_at desc
            """,
            (player_id,),
        )
        row = cur.fetchone()
    return _floatify_stats(dict(row)) if row is not None else None


def get_position_peers(
    conn: PGConnection, position: str, players_by_id: dict[str, dict[str, Any]] | None = None
) -> dict[str, dict[str, Any]]:
    """All players sharing a position, from an already-fetched players_by_id map if given
    (avoids re-querying during a full recompute), else queried directly."""
    if players_by_id is not None:
        return {pid: row for pid, row in players_by_id.items() if row["position"] == position}

    columns = ", ".join(f"ps.{c}" for c in STATS_COLUMNS)
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            f"""
            select distinct on (ps.player_id)
                ps.player_id, p.full_name, p.position, p.date_of_birth,
                ps.minutes_played, {columns}
            from public.player_statistics ps
            join public.player p using (player_id)
            where p.position = %s
            order by ps.player_id, ps.retrieved_at desc
            """,
            (position,),
        )
        rows = cur.fetchall()
    return {row["player_id"]: _floatify_stats(dict(row)) for row in rows}


def get_latest_valuations(conn: PGConnection) -> dict[str, float]:
    with conn.cursor() as cur:
        cur.execute(
            """
            select distinct on (player_id) player_id, valuation_amount
            from public.market_valuation
            order by player_id, valuation_date desc
            """
        )
        rows = cur.fetchall()
    return {str(player_id): float(amount) for player_id, amount in rows}


def age_from_dob(dob: date | None, as_of: date | None = None) -> int | None:
    if dob is None:
        return None
    as_of = as_of or date.today()
    years = as_of.year - dob.year
    if (as_of.month, as_of.day) < (dob.month, dob.day):
        years -= 1
    return years


def insert_fit_score(
    conn: PGConnection,
    player_id: str,
    club_id: str,
    profile_version: int,
    score: float,
    contributing_metrics: list[dict[str, Any]],
) -> str:
    import json

    with conn.cursor() as cur:
        cur.execute(
            """
            insert into public.fit_score
                (player_id, club_id, profile_version, score, contributing_metrics)
            values (%s, %s, %s, %s, %s)
            on conflict (player_id, club_id, profile_version) do update set
                score = excluded.score,
                contributing_metrics = excluded.contributing_metrics
            returning fit_score_id
            """,
            (player_id, club_id, profile_version, score, json.dumps(contributing_metrics)),
        )
        row = cur.fetchone()
    assert row is not None
    return str(row[0])


def insert_undervaluation_index(
    conn: PGConnection,
    player_id: str,
    club_id: str,
    fit_score_id: str,
    index_value: float,
    recommended: bool,
) -> None:
    with conn.cursor() as cur:
        # scipy/numpy computations upstream (percentileofscore, comparisons on np.float64)
        # can hand back numpy scalar types (np.float64, np.bool_) that psycopg2 doesn't know
        # how to adapt — cast to native Python types at the DB boundary.
        cur.execute(
            """
            insert into public.undervaluation_index
                (player_id, club_id, fit_score_id, index_value, recommended)
            values (%s, %s, %s, %s, %s)
            """,
            (player_id, club_id, fit_score_id, float(index_value), bool(recommended)),
        )
