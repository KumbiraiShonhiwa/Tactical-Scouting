---
name: tactical-visualization
description: Chart.js/D3 visualization skill for tactical profiles, fit-vs-value analysis and valuation trends.
---
# Tactical Visualization

## Core visualizations
- RadarChart: club/player/comparison tactical profiles.
- FitValueScatter: fit vs value.
- ValuationTrendChart: valuation history.

## Rules
- Charts must be responsive.
- Use a responsive container and ResizeObserver.
- Never rely on fixed pixel dimensions.
- Provide loading, empty and error states.
- Provide accessible data-table fallback for charts.
- Never use color as the only signal.
- Tooltips should expose meaningful labels and values.
- On narrow screens, FitValueScatter should have a simplified list-view alternative.

## Testing
Test fixed data rendering, empty/loading states, comparison merging, transformations and accessibility.
