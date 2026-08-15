---
name: accessibility
description: WCAG 2.1 AA accessibility skill for Tactical-Scouting UI and automated checks.
---
# Accessibility

Baseline: WCAG 2.1 AA.

Require:
- keyboard operation;
- visible focus;
- descriptive labels;
- semantic HTML;
- sufficient contrast;
- no color-only meaning;
- accessible chart data-table fallbacks;
- descriptive labels for crests and icon-only buttons.

Automate:
- axe-core in Playwright;
- keyboard-navigation smoke tests.

Check Club Dashboard, Player Detail, Comparison and relevant admin flows.
