import { useEffect, useRef, useState, type ReactNode } from "react";

// Charts are rendered inside a container that recalculates on resize via ResizeObserver, never
// a fixed pixel size (Frontend Design Doc §6.1), so they stay legible mobile through desktop.
export function ResponsiveChartContainer({
  children,
  minHeight = 280,
}: {
  children: ReactNode;
  minHeight?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const lastWidthRef = useRef(0);
  const [, setSize] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    // react-chartjs-2's own `responsive: true` handling already resizes the canvas via its
    // own internal ResizeObserver — this outer observer only needs to force a re-render when
    // the container's width has genuinely changed (e.g. a breakpoint change), not on every
    // sub-pixel tick ResizeObserver reports while layout settles. Unconditionally incrementing
    // on every callback fought with Chart.js's own resize cycle and produced a brief layout
    // oscillation on narrow viewports, which is what caused Playwright's real hit-testing to
    // (correctly, in the moment) refuse clicks on elements below the chart during that churn.
    const observer = new ResizeObserver(([entry]) => {
      const width = Math.round(entry.contentRect.width);
      if (width !== lastWidthRef.current) {
        lastWidthRef.current = width;
        setSize((s) => s + 1);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} style={{ minHeight }} className="relative w-full">
      {children}
    </div>
  );
}
