import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import "./index.css";

if (import.meta.env.DEV) {
  // Dev-only accessibility console warnings (Frontend Design Doc §7) — the automated axe-core
  // gate is Playwright, Phase 6; this is just an early signal during `npm run dev`.
  import("@axe-core/react").then(({ default: axe }) => {
    axe(React, ReactDOM, 1000);
  });
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
