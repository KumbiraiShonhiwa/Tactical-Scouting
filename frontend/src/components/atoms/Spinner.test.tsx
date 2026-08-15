import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Spinner } from "./Spinner";

describe("Spinner", () => {
  it("renders as a status region with the given label", () => {
    render(<Spinner label="Checking session" />);
    expect(screen.getByRole("status")).toHaveTextContent("Checking session");
  });
});
