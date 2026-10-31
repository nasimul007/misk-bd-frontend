import type { CSSProperties, ReactNode } from "react";

type Tone = "gold" | "glass" | "success" | "warning" | "danger";

const tint = (v: string): CSSProperties => ({
  background: `color-mix(in oklch, var(${v}) 14%, transparent)`,
  color: `var(${v})`,
  border: `1px solid color-mix(in oklch, var(${v}) 30%, transparent)`,
});

const tones: Record<Tone, CSSProperties | null> = {
  gold: { background: "var(--lux-gold)", color: "var(--lux-bg)", border: "none" },
  glass: null,
  success: tint("--lux-success"),
  warning: tint("--lux-warning"),
  danger: tint("--lux-danger"),
};

/** Small pill label. */
export function Badge({ tone = "gold", style, children }: { tone?: Tone; style?: CSSProperties; children: ReactNode }) {
  return (
    <span
      className={tone === "glass" ? "lux-glass" : undefined}
      style={{
        display: "inline-flex", alignItems: "center", gap: "0.4rem", borderRadius: "var(--radius-pill)",
        padding: "0.15rem 0.65rem", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.12em", lineHeight: 1.6,
        ...(tones[tone] ?? { color: "var(--lux-ink)" }), ...style,
      }}
    >
      {children}
    </span>
  );
}
