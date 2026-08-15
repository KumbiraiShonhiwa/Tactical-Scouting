import type { RadarDimension } from "../../../lib/radarChart.utils";

// The 6 tactical dimensions (TP-01), plain-language labels (Frontend Design Doc §1.3
// "domain-first, not data-science-first").
export const TACTICAL_DIMENSIONS: RadarDimension[] = [
  { key: "possession_share", label: "Possession share" },
  { key: "ppda", label: "Pressing (PPDA)" },
  { key: "buildup_speed", label: "Build-up speed" },
  { key: "defensive_line_height", label: "Defensive line height" },
  { key: "crossing_frequency", label: "Crossing frequency" },
  { key: "pressing_intensity", label: "Pressing intensity" },
];
