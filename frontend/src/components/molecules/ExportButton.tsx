import { buildCsv } from "../../lib/csv.utils";
import type { PlayerRecommendation } from "../../lib/types";
import { Button } from "../atoms/Button";

// Phase 4 decision: client-side CSV export, no backend call — see the Phase 4 plan's
// "Export mechanism" decision. Exports exactly the rows currently visible in
// RankedPlayerTable (already filtered/sorted/paginated).
export function ExportButton({
  players,
  clubName,
}: {
  players: PlayerRecommendation[];
  clubName: string;
}) {
  function handleExport() {
    const csv = buildCsv(
      players.map((p) => ({
        player: p.full_name,
        position: p.position,
        age: p.age,
        minutes_played: p.minutes_played,
        fit_score: p.fit_score,
        undervaluation_index: p.undervaluation_index,
        recommended: p.recommended,
        current_valuation: p.current_valuation,
        currency: p.valuation_currency,
      })),
    );
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${clubName.replace(/\s+/g, "-").toLowerCase()}-shortlist.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <Button
      variant="secondary"
      onClick={handleExport}
      disabled={players.length === 0}
      aria-label={`Export ${clubName} shortlist as CSV`}
    >
      Export CSV
    </Button>
  );
}
