import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, vi } from "vitest";
import { server } from "./mocks/server";

// jsdom has no <canvas> 2D context, which chart.js requires to construct a Chart instance.
// Components already render an accessible <table> fallback alongside every chart (Frontend
// Design Doc §7), so tests assert against that fallback instead of pixel output — the actual
// canvas element is stubbed out here rather than faked with a heavy canvas polyfill.
vi.mock("react-chartjs-2", () => ({
  Radar: () => null,
  Scatter: () => null,
  Line: () => null,
}));

beforeAll(() => server.listen({ onUnhandledRequest: "warn" }));
afterEach(() => {
  cleanup();
  server.resetHandlers();
  localStorage.clear();
});
afterAll(() => server.close());

if (typeof ResizeObserver === "undefined") {
  class MockResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  globalThis.ResizeObserver = MockResizeObserver;
}

