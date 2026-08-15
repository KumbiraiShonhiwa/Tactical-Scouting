import type { ReactNode } from "react";

type Tone = "success" | "warning" | "info" | "neutral";

const TONE_CLASSES: Record<Tone, string> = {
  success: "bg-success-green/10 text-success-green",
  warning: "bg-warning-amber/10 text-warning-amber",
  info: "bg-accent-blue/10 text-accent-blue",
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
