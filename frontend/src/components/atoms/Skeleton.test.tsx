import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Skeleton } from "./Skeleton";

describe("Skeleton", () => {
  it("renders a labeled status region so screen readers announce loading", () => {
    render(<Skeleton />);
    expect(screen.getByRole("status", { name: "Loading content" })).toBeInTheDocument();
  });
});
