import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { AdminLayout } from "./AdminLayout";

describe("AdminLayout", () => {
  it("renders the admin nav items and the routed child content", () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/admin/pipeline-runs"]}>
          <Routes>
            <Route path="/admin" element={<AdminLayout />}>
              <Route path="pipeline-runs" element={<div>Pipeline runs content</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );
    expect(screen.getByRole("link", { name: "Pipeline Runs" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Tactical Profiles" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Users" })).toBeInTheDocument();
    expect(screen.getByText("Pipeline runs content")).toBeInTheDocument();
  });
});
