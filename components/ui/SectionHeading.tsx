import type { CSSProperties } from "react";
import { Eyebrow } from "./Eyebrow";
import { Rule } from "./Rule";

/** Section header lockup: gold eyebrow, Bodoni serif title, gold rule. */
export function SectionHeading({ eyebrow, title, align = "center", rule = true, style }: {
  eyebrow?: string;
  title: string;
  align?: "left" | "center" | "right";
  rule?: boolean;
  style?: CSSProperties;
}) {
  return (
    <div style={{ textAlign: align, marginBottom: "3rem", ...style }}>
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <h2 className="font-display" style={{ marginTop: "1rem", color: "var(--lux-ink)", fontWeight: 500, letterSpacing: "-0.01em", lineHeight: "var(--leading-snug)", fontSize: "var(--text-h2)" }}>
        {title}
      </h2>
      {rule && <Rule width="110px" align={align} style={{ marginTop: "1.5rem" }} />}
    </div>
  );
}
