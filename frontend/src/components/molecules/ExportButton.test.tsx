import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { ExportButton } from "./ExportButton";
import { mockRecommendation } from "../../test/mocks/handlers";
import { server } from "../../test/mocks/server";

function renderWithQueryClient(ui: ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe("ExportButton", () => {
  it("is disabled when there are no players to export", () => {
    renderWithQueryClient(<ExportButton players={[]} clubName="Test United" />);
    expect(screen.getByRole("button", { name: /Export/ })).toBeDisabled();
  });

  it("triggers a client-side CSV download when clicked", async () => {
    const createObjectURL = vi.fn(() => "blob:mock-url");
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", { ...URL, createObjectURL, revokeObjectURL });

    renderWithQueryClient(<ExportButton players={[mockRecommendation]} clubName="Test United" />);
    await userEvent.click(screen.getByRole("button", { name: /Export/ }));

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
    vi.unstubAllGlobals();
  });

  it("does not render the share-link action when no clubId is given", () => {
    renderWithQueryClient(<ExportButton players={[mockRecommendation]} clubName="Test United" />);
    expect(screen.queryByRole("button", { name: /shareable link/ })).not.toBeInTheDocument();
  });

  it("renders the share-link action when a clubId is given", () => {
    renderWithQueryClient(
      <ExportButton players={[mockRecommendation]} clubName="Test United" clubId="club-1" />,
    );
    expect(screen.getByRole("button", { name: /shareable link/ })).toBeInTheDocument();
  });

  it("copies the signed URL to the clipboard on success", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    renderWithQueryClient(
      <ExportButton
        players={[mockRecommendation]}
        clubName="Test United"
        clubId="club-1"
        filters={{ position: "ST" }}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /shareable link/ }));

    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    expect(writeText.mock.calls[0][0]).toContain("mock-signed-url");
    expect(await screen.findByRole("button", { name: /Link copied/ })).toBeInTheDocument();
  });

  it("shows an error message when the export function call fails", async () => {
    server.use(
      http.post("http://localhost:54321/functions/v1/generate-export", () =>
        HttpResponse.json({ error: "boom" }, { status: 500 }),
      ),
    );
    Object.assign(navigator, { clipboard: { writeText: vi.fn() } });

    renderWithQueryClient(
      <ExportButton players={[mockRecommendation]} clubName="Test United" clubId="club-1" />,
    );
    await userEvent.click(screen.getByRole("button", { name: /shareable link/ }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't generate a link");
  });
});
