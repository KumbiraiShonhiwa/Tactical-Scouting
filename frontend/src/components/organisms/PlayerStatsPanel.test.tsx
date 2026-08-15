import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PlayerStatsPanel } from "./PlayerStatsPanel";
import { mockPlayer } from "../../test/mocks/handlers";

const statistics = {
  stat_id: "s1",
  player_id: mockPlayer.player_id,
  season: "2025/2026",
  minutes_played: 1500,
  appearances: 20,
  possession_involvement_pct: 60,
  passes_completed_per90: 40,
  pass_completion_pct: 85,
  progressive_passes_per90: 5,
  progressive_carries_per90: 2,
  defensive_actions_per90: 4,
  pressures_per90: 12,
  tackles_won_per90: 2,
  interceptions_per90: 1,
  crosses_per90: 1,
  goals_per90: 0.3,
  assists_per90: 0.2,
  expected_goals_per90: 0.25,
  expected_assists_per90: 0.18,
  data_source: "footystats",
  retrieved_at: "2026-01-01T00:00:00Z",
};

describe("PlayerStatsPanel", () => {
  it("renders skeletons while loading", () => {
    render(<PlayerStatsPanel status="loading" />);
    expect(screen.getAllByRole("status").length).toBeGreaterThan(0);
  });

  it("renders an error alert with retry", async () => {
    const onRetry = vi.fn();
    render(<PlayerStatsPanel status="error" onRetry={onRetry} />);
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("renders an empty state when there is no statistics row yet", () => {
    render(<PlayerStatsPanel status="success" player={mockPlayer} />);
    expect(screen.getByText("No statistics recorded for this player yet.")).toBeInTheDocument();
  });

  it("renders the player's name and per-90 stats", () => {
    render(<PlayerStatsPanel status="success" player={mockPlayer} statistics={statistics} />);
    expect(screen.getByText(mockPlayer.full_name)).toBeInTheDocument();
    expect(screen.getByText("1500")).toBeInTheDocument();
  });

  it("renders the fit-breakdown explainability list when provided", () => {
    render(
      <PlayerStatsPanel
        status="success"
        player={mockPlayer}
        statistics={statistics}
        breakdown={{
          player_id: mockPlayer.player_id,
          club_id: "club-1",
          profile_version: 1,
          overall_score: 0.75,
          contributing_metrics: [
            {
              metric: "pressing_intensity",
              label: "High pressing intensity",
              player_value: 12,
              club_target_value: 10,
              weight: 0.2,
              contribution: 0.15,
            },
          ],
        }}
      />,
    );
    expect(screen.getByText(/75% fit/)).toBeInTheDocument();
    expect(screen.getByText("High pressing intensity")).toBeInTheDocument();
  });
});
