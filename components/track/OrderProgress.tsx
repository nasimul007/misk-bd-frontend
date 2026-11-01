import { Check, PackageCheck, Truck, ClipboardCheck, ShoppingBag, XCircle, Undo2 } from "lucide-react";
import type { Order } from "@/lib/orders";

const STEPS = [
  { key: "pending", label: "Placed", Icon: ShoppingBag },
  { key: "confirmed", label: "Confirmed", Icon: ClipboardCheck },
  { key: "packed", label: "Packed", Icon: PackageCheck },
  { key: "shipped", label: "Shipped", Icon: Truck },
  { key: "delivered", label: "Delivered", Icon: Check },
] as const;

const when = (iso?: string) => (iso ? new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Dhaka" }) : "");

/** Where an order is, step by step. Dates come from the order's status history; staff notes are never shown. */
export function OrderProgress({ order }: { order: Pick<Order, "status" | "placedAt" | "timeline"> }) {
  const closed = order.status === "cancelled" || order.status === "returned";
  const at = (key: string) => (key === "pending" ? order.placedAt : order.timeline.find((t) => t.status === key)?.at);
  const reached = closed ? STEPS.filter((s) => at(s.key)).length : STEPS.findIndex((s) => s.key === order.status) + 1;

  return (
    <div>
      {closed && (
        <div role="status" className="flex items-center gap-2.5" style={{ marginBottom: 18, padding: "12px 16px", borderRadius: 12, border: "1px solid color-mix(in oklch, var(--lux-danger) 35%, transparent)", background: "color-mix(in oklch, var(--lux-danger) 10%, transparent)", color: "var(--lux-danger)", fontSize: 14 }}>
          {order.status === "cancelled" ? <XCircle size={18} /> : <Undo2 size={18} />}
          <span>This order was {order.status}{at(order.status) ? ` on ${when(at(order.status))}` : ""}.</span>
        </div>
      )}
      <ol className="grid" style={{ gridTemplateColumns: `repeat(${STEPS.length}, 1fr)`, listStyle: "none", margin: 0, padding: 0, opacity: closed ? 0.55 : 1 }}>
        {STEPS.map((s, i) => {
          const done = i < reached;
          const current = !closed && i === reached - 1;
          return (
            <li key={s.key} aria-current={current ? "step" : undefined} className="flex flex-col items-center gap-1.5 text-center" style={{ position: "relative" }}>
              {i > 0 && <span aria-hidden style={{ position: "absolute", top: 19, right: "50%", width: "100%", height: 2, background: done ? "var(--lux-gold)" : "var(--lux-line)" }} />}
              <span style={{ position: "relative", zIndex: 1, width: 40, height: 40, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", border: `1px solid ${done ? "var(--lux-gold)" : "var(--lux-line)"}`, background: done ? (current ? "var(--lux-gold)" : "var(--lux-gold-soft)") : "var(--lux-bg-2)", color: done ? (current ? "var(--lux-bg)" : "var(--lux-gold)") : "var(--lux-ink-muted)" }}>
                <s.Icon size={18} aria-hidden />
              </span>
              <span style={{ fontSize: 13, fontWeight: done ? 600 : 400, color: done ? "var(--lux-ink)" : "var(--lux-ink-muted)" }}>{s.label}</span>
              <span style={{ fontSize: 11, color: "var(--lux-ink-muted)", minHeight: 14 }}>{done ? when(at(s.key)) : ""}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
