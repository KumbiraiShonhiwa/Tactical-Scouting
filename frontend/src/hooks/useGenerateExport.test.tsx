import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { useGenerateExport } from "./useGenerateExport";
import { server } from "../test/mocks/server";

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe("useGenerateExport", () => {
  it("returns the signed URL on success", async () => {
    const { result } = renderHook(() => useGenerateExport("club-1"), { wrapper });
    result.current.mutate({ position: "ST" });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.signed_url).toContain("mock-signed-url");
  });

  it("surfaces an error when the function call fails", async () => {
    server.use(
      http.post("http://localhost:54321/functions/v1/generate-export", () =>
        HttpResponse.json({ error: "boom" }, { status: 500 }),
      ),
    );
    const { result } = renderHook(() => useGenerateExport("club-1"), { wrapper });
    result.current.mutate({});
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
