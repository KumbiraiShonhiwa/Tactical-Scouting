import type { Config } from "tailwindcss";

// Design tokens from Tactical-Scouting_Frontend-Design.docx §3.1-3.3 / CLAUDE.md §8.
// No arbitrary one-off colors, font sizes, or spacing are introduced outside this scale.
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        "primary-900": "#1F3864",
        "accent-teal": "#0F766E",
        "accent-blue": "#2E74B5",
        "success-green": "#0F9D58",
        "warning-amber": "#B45309",
        "neutral-50": "#F7F9FB",
        "neutral-100": "#EEF2F6",
        "neutral-700": "#4B5563",
        "neutral-900": "#111827",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      fontSize: {
        xs: "12px",
        sm: "14px",
        base: "16px",
        xl: "20px",
        "2xl": "24px",
        "3xl": "32px",
      },
      spacing: {
        1: "4px",
        2: "8px",
        3: "12px",
        4: "16px",
        6: "24px",
        8: "32px",
      },
      maxWidth: {
        content: "1280px",
      },
    },
  },
  plugins: [],
} satisfies Config;
