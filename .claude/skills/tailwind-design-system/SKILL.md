---
name: tailwind-design-system
description: Tactical-Scouting Tailwind design-system enforcement skill.
---
# Tailwind Design System

## Palette
- primary-900: `#1F3864`
- accent-teal: `#0F766E`
- accent-blue: `#2E74B5`
- success-green: `#0F9D58`
- warning-amber: `#B45309`
- neutral-50: `#F7F9FB`
- neutral-100: `#EEF2F6`
- neutral-700: `#4B5563`
- neutral-900: `#111827`

## Typography
System-first stack: Inter with ui-sans-serif fallback.

Use the documented 12/14/16/20/24/32px scale. Avoid one-off sizes.

## Layout
- 4px base spacing unit.
- 1280px max content width.
- 12-column desktop grid.
- Mobile-first responsive behavior.

## Interaction
Shared Tailwind classes should provide hover, focus-visible and disabled states. Do not create inconsistent per-component overrides without reason.
