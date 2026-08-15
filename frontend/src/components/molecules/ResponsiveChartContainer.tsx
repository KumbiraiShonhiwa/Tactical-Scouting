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
  const [, setSize] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => setSize((s) => s + 1));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} style={{ minHeight }} className="relative w-full">
      {children}
    </div>
  );
}
