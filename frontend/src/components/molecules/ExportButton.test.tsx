import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ExportButton } from "./ExportButton";
import { mockRecommendation } from "../../test/mocks/handlers";

describe("ExportButton", () => {
  it("is disabled when there are no players to export", () => {
    render(<ExportButton players={[]} clubName="Test United" />);
    expect(screen.getByRole("button", { name: /Export/ })).toBeDisabled();
  });

  it("triggers a client-side CSV download when clicked", async () => {
    const createObjectURL = vi.fn(() => "blob:mock-url");
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", { ...URL, createObjectURL, revokeObjectURL });

    render(<ExportButton players={[mockRecommendation]} clubName="Test United" />);
    await userEvent.click(screen.getByRole("button", { name: /Export/ }));

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
    vi.unstubAllGlobals();
  });
});
