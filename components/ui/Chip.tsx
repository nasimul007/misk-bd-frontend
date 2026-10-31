import Link from "next/link";
import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from "react";

const style = (active: boolean): CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  borderRadius: "var(--radius-pill)",
  padding: "0.375rem 0.875rem",
  fontSize: "0.875rem",
  cursor: "pointer",
  transition: "all var(--dur-fast) ease",
  background: active ? "var(--lux-gold)" : "transparent",
  color: active ? "var(--lux-bg)" : "var(--lux-ink-muted)",
  fontWeight: active ? 500 : 400,
  border: active ? "1px solid var(--lux-gold)" : "1px solid var(--lux-line)",
});

/** Filter pill. Active = gold fill; inactive = hairline. Renders a link when given `href`. */
export function Chip({ active = false, href, children, ...rest }: { active?: boolean; href?: string; children: ReactNode } & ButtonHTMLAttributes<HTMLButtonElement>) {
  if (href) {
    return <Link href={href} scroll={false} aria-current={active || undefined} className="lux-focus" style={style(active)}>{children}</Link>;
  }
  return <button type="button" aria-pressed={active} className="lux-focus" style={style(active)} {...rest}>{children}</button>;
}
