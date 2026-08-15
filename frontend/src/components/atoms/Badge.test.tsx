import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Badge } from "./Badge";

describe("Badge", () => {
  it("renders its children as text", () => {
    render(<Badge>Recommended</Badge>);
    expect(screen.getByText("Recommended")).toBeInTheDocument();
  });

  it("renders an icon alongside the label, not as the only signal", () => {
    render(
      <Badge tone="success" icon={<span data-testid="icon">★</span>}>
        Recommended
      </Badge>,
    );
    expect(screen.getByTestId("icon")).toBeInTheDocument();
    expect(screen.getByText("Recommended")).toBeInTheDocument();
  });
});
