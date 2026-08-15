export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      role="status"
      aria-label="Loading content"
      className={`animate-pulse rounded bg-neutral-100 ${className}`}
    />
  );
}
