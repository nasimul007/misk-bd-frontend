import type { CSSProperties, ReactNode } from "react";
import { Badge } from "@/components/ui/Badge";

export const th: CSSProperties = { textAlign: "left", padding: "10px 12px", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--lux-ink-muted)", fontWeight: 500, borderBottom: "1px solid var(--lux-line)", whiteSpace: "nowrap" };
export const td: CSSProperties = { padding: "12px", fontSize: 14, borderBottom: "1px solid var(--lux-line)", verticalAlign: "middle" };

export function PageHead({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3" style={{ marginBottom: 22 }}>
      <h1 className="font-display" style={{ fontSize: 28, fontWeight: 500, margin: 0 }}>{title}</h1>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

export function Panel({ title, children, style }: { title?: string; children: ReactNode; style?: CSSProperties }) {
  return (
    <section className="lux-surface" style={{ borderRadius: 16, padding: 20, ...style }}>
      {title && <h2 style={{ margin: "0 0 14px", fontSize: 13, textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--lux-ink-muted)", fontWeight: 500 }}>{title}</h2>}
      {children}
    </section>
  );
}

/** Wide tables scroll sideways on a phone instead of breaking the page. */
export function TableWrap({ children }: { children: ReactNode }) {
  return <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", minWidth: 560 }}>{children}</table></div>;
}

const tone = { pending: "warning", confirmed: "glass", packed: "glass", shipped: "gold", delivered: "success", returned: "danger", cancelled: "danger" } as const;
export function StatusBadge({ status }: { status: string }) {
  return <Badge tone={tone[status as keyof typeof tone] ?? "glass"}>{status}</Badge>;
}

export const dateTime = (d: Date) => d.toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Dhaka" });
