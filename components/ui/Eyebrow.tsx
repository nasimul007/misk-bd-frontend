import type { CSSProperties, ReactNode } from "react";

/** Tracked small-caps champagne-gold kicker. The maison's signature eyebrow. */
export function Eyebrow({ className = "", style, children }: { className?: string; style?: CSSProperties; children: ReactNode }) {
  return <span className={`lux-eyebrow ${className}`.trim()} style={style}>{children}</span>;
}
