import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "tactical-scouting:comparison-list";
const MAX_PLAYERS = 4;

function readStoredIds(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

// No backend "shortlist" table exists (a Phase 0 scope decision) — comparison state is
// client-only, persisted to localStorage so it survives a refresh.
export function useComparisonList() {
  const [playerIds, setPlayerIds] = useState<string[]>(() => readStoredIds());

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(playerIds));
  }, [playerIds]);

  const add = useCallback((playerId: string) => {
    setPlayerIds((current) =>
      current.includes(playerId) || current.length >= MAX_PLAYERS
        ? current
        : [...current, playerId],
    );
  }, []);

  const remove = useCallback((playerId: string) => {
    setPlayerIds((current) => current.filter((id) => id !== playerId));
  }, []);

  const clear = useCallback(() => setPlayerIds([]), []);

  return { playerIds, add, remove, clear, isFull: playerIds.length >= MAX_PLAYERS };
}
