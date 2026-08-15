"""Loader: the single-transaction upsert described in the Phase 2 plan's atomic-load
decision. One direct Postgres transaction wraps every upsert for a run; any exception
triggers a full ROLLBACK, so a failed run leaves previously published data untouched (SRS
3.2.2) without needing a parallel staging schema.

Callers are expected to have already validated records (etl.validators.rules) and reconciled
cross-source identity (etl.validators.dedup) before calling load_players — this module's job
is purely the atomic DB write, not business-rule validation.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field

from psycopg2.extensions import connection as PGConnection

from validators.dedup import normalize_name
from validators.models import ValidatedMarketValuation, ValidatedPlayer, ValidatedPlayerStatistics


@dataclass
class PlayerLoadRecord:
    player: ValidatedPlayer
    statistics: list[ValidatedPlayerStatistics] = field(default_factory=list)
    valuations: list[ValidatedMarketValuation] = field(default_factory=list)


def _find_existing_player_id(
    cur: object, player: ValidatedPlayer
) -> str | None:
    for source, source_id in player.source_ids.items():
        cur.execute(  # type: ignore[attr-defined]
            "select player_id from public.player where source_ids ->> %s = %s",
            (source, source_id),
        )
        row = cur.fetchone()  # type: ignore[attr-defined]
        if row is not None:
            return str(row[0])

    cur.execute("select player_id, full_name from public.player")  # type: ignore[attr-defined]
    target = normalize_name(player.full_name)
    for row in cur.fetchall():  # type: ignore[attr-defined]
        if normalize_name(row[1]) == target:
            return str(row[0])
    return None


def _upsert_player(cur: object, player: ValidatedPlayer) -> str:
    existing_id = _find_existing_player_id(cur, player)

    if existing_id is None:
        cur.execute(  # type: ignore[attr-defined]
            """
            insert into public.player
                (full_name, date_of_birth, nationality, position, current_club, source_ids)
            values (%s, %s, %s, %s, %s, %s)
            returning player_id
            """,
            (
                player.full_name,
                player.date_of_birth,
                player.nationality,
                player.position,
                player.current_club,
                json.dumps(player.source_ids),
            ),
        )
        row = cur.fetchone()  # type: ignore[attr-defined]
        assert row is not None
        return str(row[0])

    cur.execute(  # type: ignore[attr-defined]
        """
        update public.player
        set date_of_birth = coalesce(%s, date_of_birth),
            nationality = coalesce(%s, nationality),
            position = %s,
            current_club = coalesce(%s, current_club),
            source_ids = source_ids || %s::jsonb
        where player_id = %s
        """,
        (
            player.date_of_birth,
            player.nationality,
            player.position,
            player.current_club,
            json.dumps(player.source_ids),
            existing_id,
        ),
    )
    return existing_id


def _upsert_statistics(cur: object, player_id: str, stats: ValidatedPlayerStatistics) -> None:
    cur.execute(  # type: ignore[attr-defined]
        """
        insert into public.player_statistics (
            player_id, season, minutes_played, appearances,
            possession_involvement_pct, passes_completed_per90, pass_completion_pct,
            progressive_passes_per90, progressive_carries_per90, defensive_actions_per90,
            pressures_per90, tackles_won_per90, interceptions_per90, crosses_per90,
            goals_per90, assists_per90, expected_goals_per90, expected_assists_per90,
            data_source, retrieved_at
        ) values (
            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
        )
        on conflict (player_id, season, data_source) do update set
            minutes_played = excluded.minutes_played,
            appearances = excluded.appearances,
            possession_involvement_pct = excluded.possession_involvement_pct,
            passes_completed_per90 = excluded.passes_completed_per90,
            pass_completion_pct = excluded.pass_completion_pct,
            progressive_passes_per90 = excluded.progressive_passes_per90,
            progressive_carries_per90 = excluded.progressive_carries_per90,
            defensive_actions_per90 = excluded.defensive_actions_per90,
            pressures_per90 = excluded.pressures_per90,
            tackles_won_per90 = excluded.tackles_won_per90,
            interceptions_per90 = excluded.interceptions_per90,
            crosses_per90 = excluded.crosses_per90,
            goals_per90 = excluded.goals_per90,
            assists_per90 = excluded.assists_per90,
            expected_goals_per90 = excluded.expected_goals_per90,
            expected_assists_per90 = excluded.expected_assists_per90,
            retrieved_at = excluded.retrieved_at
        """,
        (
            player_id,
            stats.season,
            stats.minutes_played,
            stats.appearances,
            stats.possession_involvement_pct,
            stats.passes_completed_per90,
            stats.pass_completion_pct,
            stats.progressive_passes_per90,
            stats.progressive_carries_per90,
            stats.defensive_actions_per90,
            stats.pressures_per90,
            stats.tackles_won_per90,
            stats.interceptions_per90,
            stats.crosses_per90,
            stats.goals_per90,
            stats.assists_per90,
            stats.expected_goals_per90,
            stats.expected_assists_per90,
            stats.data_source,
            stats.retrieved_at,
        ),
    )


def _upsert_valuation(cur: object, player_id: str, valuation: ValidatedMarketValuation) -> None:
    cur.execute(  # type: ignore[attr-defined]
        """
        insert into public.market_valuation
            (player_id, valuation_amount, currency, valuation_date, data_source)
        values (%s, %s, %s, %s, %s)
        on conflict (player_id, valuation_date, data_source) do update set
            valuation_amount = excluded.valuation_amount,
            currency = excluded.currency
        """,
        (
            player_id,
            valuation.valuation_amount,
            valuation.currency,
            valuation.valuation_date,
            valuation.data_source,
        ),
    )


def load_players(conn: PGConnection, records: list[PlayerLoadRecord]) -> int:
    """Loads every record in a single transaction. Raises (and leaves the transaction rolled
    back by the caller) on the first failure — callers must call conn.rollback() on
    exception and conn.commit() on success; this function does not manage the transaction
    boundary itself so callers can wrap pipeline_run bookkeeping around it precisely."""
    processed = 0
    with conn.cursor() as cur:
        for record in records:
            player_id = _upsert_player(cur, record.player)
            for stats in record.statistics:
                _upsert_statistics(cur, player_id, stats)
            for valuation in record.valuations:
                _upsert_valuation(cur, player_id, valuation)
            processed += 1
    return processed
