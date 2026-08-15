"""De-duplication / name resolution across sources (DC-04).

Transfermarkt is treated as the primary identity source (it carries a stable numeric player
ID in every squad-page URL), so its records seed `public.player` rows. Records from a second
source (FootyStats) that don't carry a matching ID of their own are resolved to an existing
player by normalized full-name matching; if no match is found, the record is quarantined
rather than silently creating a duplicate player or guessing.
"""

from __future__ import annotations

import unicodedata


def normalize_name(name: str) -> str:
    """Case-fold and strip accents so 'Martínez' and 'Martinez' compare equal, without
    attempting any fuzzier (edit-distance) matching — exact post-normalization match only,
    so a genuine near-miss is quarantined for human review rather than silently merged."""
    decomposed = unicodedata.normalize("NFKD", name)
    without_accents = "".join(c for c in decomposed if not unicodedata.combining(c))
    return " ".join(without_accents.strip().lower().split())


def resolve_by_name(full_name: str, known_players_by_name: dict[str, str]) -> str | None:
    """known_players_by_name: normalized-name -> player_id. Returns the matching player_id,
    or None if no exact normalized-name match exists."""
    return known_players_by_name.get(normalize_name(full_name))
