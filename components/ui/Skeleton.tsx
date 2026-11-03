import type { CSSProperties } from "react";

/** A softly pulsing placeholder block, shown while a page's data loads. Respects reduced-motion. */
export function Skeleton({ style, className = "" }: { style?: CSSProperties; className?: string }) {
  return <div aria-hidden className={`lux-skeleton ${className}`.trim()} style={{ borderRadius: 14, background: "color-mix(in oklch, var(--lux-ink) 8%, transparent)", ...style }} />;
}

/** Placeholder for a grid of product cards. */
export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div aria-busy="true" aria-label="Loading products" role="status" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 20 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex flex-col gap-3">
          <Skeleton style={{ aspectRatio: "1 / 1", borderRadius: 18 }} />
          <Skeleton style={{ height: 16, width: "75%" }} />
          <Skeleton style={{ height: 14, width: "40%" }} />
        </div>
      ))}
    </div>
  );
}
