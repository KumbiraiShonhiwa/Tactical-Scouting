import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { FilterBar } from "./FilterBar";

describe("FilterBar", () => {
  it("calls onChange with the selected position and resets page to 1", async () => {
    const onChange = vi.fn();
    render(<FilterBar filters={{ page: 3 }} onChange={onChange} />);
    await userEvent.selectOptions(screen.getByLabelText("Position"), "ST");
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ position: "ST", page: 1 }));
  });

  it("toggles the recommended-only checkbox", async () => {
    const onChange = vi.fn();
    render(<FilterBar filters={{}} onChange={onChange} />);
    await userEvent.click(screen.getByLabelText("Recommended (undervalued) only"));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ recommended_only: true }));
  });

  it("clears all filters when Clear filters is clicked", async () => {
    const onChange = vi.fn();
    render(<FilterBar filters={{ position: "ST", age_min: 20 }} onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(onChange).toHaveBeenCalledWith({});
  });
});
