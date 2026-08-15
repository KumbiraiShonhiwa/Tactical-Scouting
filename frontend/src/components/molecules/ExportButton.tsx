import { useState } from "react";
import { buildCsv } from "../../lib/csv.utils";
import type { PlayerRecommendation, RecommendationsFilters } from "../../lib/types";
import { Button } from "../atoms/Button";
import { useGenerateExport } from "../../hooks/useGenerateExport";

// Phase 4 decision: client-side CSV export, no backend call, stays the default/primary action
// — see the Phase 4 plan's "Export mechanism" decision. Exports exactly the rows currently
// visible in RankedPlayerTable (already filtered/sorted/paginated).
//
// Phase 5 adds an additive second action: "Get shareable link", calling the generate-export
// Edge Function for a signed URL to a server-rendered CSV (ADD §5.4). Only rendered when
// clubId/filters are supplied, keeping the component's original public API unchanged for any
// caller that doesn't need it.
export function ExportButton({
  players,
  clubName,
  clubId,
  filters,
}: {
  players: PlayerRecommendation[];
  clubName: string;
  clubId?: string;
  filters?: RecommendationsFilters;
}) {
  const [copied, setCopied] = useState(false);
  const generateExport = useGenerateExport(clubId ?? "");

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

  async function handleCopyLink() {
    setCopied(false);
    try {
      const result = await generateExport.mutateAsync(filters ?? {});
      await navigator.clipboard.writeText(result.signed_url);
      setCopied(true);
    } catch {
      // Surfaced to the user via generateExport.isError below — mutateAsync's rejection is
      // only caught here so it doesn't become an unhandled promise rejection from this
      // fire-and-forget onClick handler.
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant="secondary"
        onClick={handleExport}
        disabled={players.length === 0}
        aria-label={`Export ${clubName} shortlist as CSV`}
      >
        Export CSV
      </Button>
      {clubId && (
        <Button
          variant="secondary"
          onClick={handleCopyLink}
          disabled={players.length === 0 || generateExport.isPending}
          aria-label={
            copied
              ? `Link copied for the ${clubName} shortlist`
              : `Get a shareable link for the ${clubName} shortlist`
          }
        >
          {generateExport.isPending ? "Generating…" : copied ? "Link copied" : "Get shareable link"}
        </Button>
      )}
      {generateExport.isError && (
        <span role="alert" className="text-xs text-warning-amber">
          Couldn't generate a link — try again.
        </span>
      )}
    </div>
  );
}
