import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { EmptyState } from "./EmptyState";

describe("EmptyState", () => {
  it("renders the message", () => {
    render(<EmptyState message="No players match these filters" />);
    expect(screen.getByText("No players match these filters")).toBeInTheDocument();
  });

  it("does not render an action button when none is given", () => {
    render(<EmptyState message="Nothing here" />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("invokes onAction when the action button is clicked", async () => {
    const onAction = vi.fn();
    render(<EmptyState message="Nothing here" actionLabel="Clear filters" onAction={onAction} />);
    await userEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(onAction).toHaveBeenCalledTimes(1);
  });
});
