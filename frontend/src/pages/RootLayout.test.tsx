import { screen } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { RootLayout } from "./RootLayout";
import { renderWithAuth } from "../test/renderWithAuth";

describe("RootLayout", () => {
  it("renders the nav, the routed page content, and the disclaimer footer", () => {
    renderWithAuth(
      <Routes>
        <Route element={<RootLayout />}>
          <Route path="/" element={<div>Page content</div>} />
        </Route>
      </Routes>,
    );
    expect(screen.getByRole("navigation", { name: "Primary" })).toBeInTheDocument();
    expect(screen.getByText("Page content")).toBeInTheDocument();
    expect(screen.getByText(/Educational\/portfolio project/)).toBeInTheDocument();
  });
});
