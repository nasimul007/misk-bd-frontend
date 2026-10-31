import type { CSSProperties } from "react";

/** Gold gradient hairline divider. Centered under headings by default. */
export function Rule({ width = "110px", align = "center", style }: { width?: string; align?: "left" | "center" | "right"; style?: CSSProperties }) {
  const margin = align === "center" ? "0 auto" : align === "right" ? "0 0 0 auto" : "0";
  return <div role="separator" className="lux-rule" style={{ maxWidth: width, margin, ...style }} />;
}
