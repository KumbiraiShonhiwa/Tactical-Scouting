import type { ReactNode } from "react";

type Tone = "success" | "warning" | "info" | "neutral";

// Real WCAG AA failure caught by e2e/tests/accessibility.spec.ts's axe-core pass: colored text
// on a 10%-opacity tint of the same color (e.g. text-success-green on bg-success-green/10)
// measured 2.98:1 — well under the 4.5:1 small-text threshold, and even white-on-solid
// success-green only reaches ~3.5:1 (#0F9D58 isn't dark enough). Fixed by keeping the tinted
// background as the color cue (still "never the only signal" — paired with an icon) but using
// the existing neutral-900 token for the text itself, which is dark enough to clear AA
// comfortably against every tint — no new colors introduced, per CLAUDE.md §8.
const TONE_CLASSES: Record<Tone, string> = {
  success: "bg-success-green/10 text-neutral-900",
  warning: "bg-warning-amber/10 text-neutral-900",
  info: "bg-accent-blue/10 text-neutral-900",
  neutral: "bg-neutral-100 text-neutral-700",
};

// Color is never the only signal (Frontend Design Doc §7) — every Badge takes a label, and
// callers using it for "recommended" pair it with an icon, not color alone.
export function Badge({
  tone = "neutral",
  icon,
  children,
}: {
  tone?: Tone;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${TONE_CLASSES[tone]}`}
    >
      {icon}
      {children}
    </span>
  );
}
