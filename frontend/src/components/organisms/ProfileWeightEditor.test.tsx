import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ProfileWeightEditor } from "./ProfileWeightEditor";
import type { TacticalDimension } from "../../lib/types";

const validWeightings: Record<TacticalDimension, number> = {
  possession_share: 0.2,
  ppda: 0.2,
  buildup_speed: 0.15,
  defensive_line_height: 0.15,
  crossing_frequency: 0.15,
  pressing_intensity: 0.15,
};

describe("ProfileWeightEditor", () => {
  it("renders a skeleton while loading", () => {
    render(<ProfileWeightEditor status="loading" onSave={vi.fn()} />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("renders an error alert with retry", async () => {
    const onRetry = vi.fn();
    render(<ProfileWeightEditor status="error" onRetry={onRetry} onSave={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("disables Save until a weighting has changed", () => {
    render(<ProfileWeightEditor initialWeightings={validWeightings} onSave={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Save new version" })).toBeDisabled();
  });

  it("shows a confirmation step before calling onSave, and only saves after confirming", async () => {
    const onSave = vi.fn();
    render(<ProfileWeightEditor initialWeightings={validWeightings} onSave={onSave} />);

    // Move 0.1 from ppda to possession_share so the total stays a valid 100%.
    fireEvent.change(screen.getByLabelText("Possession share"), { target: { value: "0.3" } });
    fireEvent.change(screen.getByLabelText("Pressing (PPDA)"), { target: { value: "0.1" } });

    const saveButton = screen.getByRole("button", { name: "Save new version" });
    expect(saveButton).not.toBeDisabled();
    await userEvent.click(saveButton);

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText(/every public-facing ranking will change/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Confirm and recompute" }));
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it("recovers once initialWeightings arrives after mount, not just when passed synchronously", async () => {
    // Regression test for a real bug e2e-05 caught: TacticalProfiles.tsx's real usage always
    // mounts this component *before* the PostgREST fetch for the current profile resolves
    // (status="loading", initialWeightings=undefined), then re-renders it with the real data a
    // moment later — every other test in this file passes initialWeightings synchronously from
    // the first render, which never exercised that transition.
    const onSave = vi.fn();
    const { rerender } = render(
      <ProfileWeightEditor status="loading" onSave={onSave} />,
    );
    expect(screen.getByRole("status")).toBeInTheDocument();

    rerender(
      <ProfileWeightEditor
        status="success"
        initialWeightings={validWeightings}
        onSave={onSave}
      />,
    );

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Save new version" })).toBeInTheDocument(),
    );
    expect(screen.getByLabelText("Possession share")).toHaveValue("0.2");
  });

  it("flags an invalid (non-100%) total", () => {
    render(
      <ProfileWeightEditor
        initialWeightings={{ ...validWeightings, possession_share: 0.9 }}
        onSave={vi.fn()}
      />,
    );
    expect(screen.getByText("Must sum to 100%")).toBeInTheDocument();
  });
});
