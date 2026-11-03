"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { bulkSetOrderStatusAction } from "@/app/actions/admin";
import { OrderStatusSelect } from "@/components/admin/OrderStatusSelect";
import { TableWrap, td, th } from "@/components/admin/ui";
import { Badge } from "@/components/ui/Badge";

export type OrderRow = {
  no: string; placed: string; items: number; name: string; phone: string; division: string;
  payMethod: string; payStatus: string; total: string; status: string; next: string[]; returnRequested: boolean;
};

const TARGETS = ["confirmed", "packed", "shipped", "delivered", "cancelled", "returned"] as const;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** The orders table with checkboxes: pick several orders, then move them all to the next status in one go. */
export function OrdersTable({ rows }: { rows: OrderRow[] }) {
  const router = useRouter();
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [to, setTo] = useState<(typeof TARGETS)[number]>("confirmed");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const all = picked.size === rows.length && rows.length > 0;
  const toggle = (no: string) => setPicked((p) => { const n = new Set(p); if (n.has(no)) n.delete(no); else n.add(no); return n; });

  const apply = async () => {
    if (busy || picked.size === 0) return;
    if ((to === "cancelled" || to === "returned") && !window.confirm(`Mark ${picked.size} order${picked.size === 1 ? "" : "s"} as ${to}? Their items go back into stock.`)) return;
    setBusy(true);
    setMsg(null);
    try {
      const r = await bulkSetOrderStatusAction([...picked], to);
      if (r.ok) {
        const skipped = r.skipped.length ? ` ${r.skipped.length} skipped: ${r.skipped.slice(0, 3).map((s) => `${s.no} (${s.reason})`).join("; ")}${r.skipped.length > 3 ? "…" : ""}` : "";
        setMsg({ ok: r.skipped.length === 0, text: `${r.done} order${r.done === 1 ? "" : "s"} marked ${to}.${skipped}` });
        setPicked(new Set());
        router.refresh();
      } else setMsg({ ok: false, text: r.error });
    } catch {
      setMsg({ ok: false, text: "We couldn't reach the server. Please try again." });
    }
    setBusy(false);
  };

  return (
    <>
      {(picked.size > 0 || msg) && (
        <div className="flex flex-wrap items-center gap-3" style={{ marginBottom: 14, padding: "10px 14px", borderRadius: 12, border: "1px solid var(--lux-gold)", background: "var(--lux-gold-soft)" }}>
          {picked.size > 0 && (
            <>
              <strong style={{ fontSize: 14 }}>{picked.size} selected</strong>
              <label className="flex items-center gap-2" style={{ fontSize: 13.5 }}>
                Mark as
                <select aria-label="New status for the selected orders" value={to} onChange={(e) => setTo(e.target.value as typeof to)} style={{ padding: "6px 8px", borderRadius: 8, border: "1px solid var(--lux-line)", background: "var(--lux-bg-2)", color: "var(--lux-ink)", fontSize: 13 }}>
                  {TARGETS.map((t) => <option key={t} value={t}>{cap(t)}</option>)}
                </select>
              </label>
              <button type="button" onClick={apply} disabled={busy} className="lux-btn-fill lux-focus" style={{ padding: "0.45rem 1.2rem", fontSize: "0.85rem" }}>{busy ? "Applying…" : "Apply"}</button>
              <button type="button" onClick={() => setPicked(new Set())} disabled={busy} className="lux-btn lux-focus" style={{ padding: "0.45rem 1rem", fontSize: "0.82rem" }}>Clear</button>
            </>
          )}
          {msg && <span role={msg.ok ? "status" : "alert"} style={{ fontSize: 13.5, color: msg.ok ? "var(--lux-success)" : "var(--lux-warning)" }}>{msg.text}</span>}
        </div>
      )}
      <TableWrap>
        <thead>
          <tr>
            <th style={{ ...th, width: 36 }}><input type="checkbox" aria-label="Select all orders on this page" checked={all} onChange={() => setPicked(all ? new Set() : new Set(rows.map((r) => r.no)))} style={{ accentColor: "var(--lux-gold)" }} /></th>
            <th style={th}>Order</th><th style={th}>Customer</th><th style={th}>Division</th><th style={th}>Payment</th><th style={th}>Total</th><th style={th}>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((o) => (
            <tr key={o.no} style={{ background: picked.has(o.no) ? "var(--lux-gold-soft)" : undefined }}>
              <td style={td}><input type="checkbox" aria-label={`Select order ${o.no}`} checked={picked.has(o.no)} onChange={() => toggle(o.no)} style={{ accentColor: "var(--lux-gold)" }} /></td>
              <td style={td}>
                <Link href={`/admin/orders/${o.no}`} className="lux-link">{o.no}</Link>
                <div style={{ fontSize: 12, color: "var(--lux-ink-muted)" }}>{o.placed} · {o.items} item{o.items === 1 ? "" : "s"}</div>
              </td>
              <td style={td}>{o.name}<div style={{ fontSize: 12, color: "var(--lux-ink-muted)" }}>{o.phone}</div></td>
              <td style={{ ...td, color: "var(--lux-ink-muted)" }}>{o.division}</td>
              <td style={td}><Badge tone={o.payMethod === "cod" ? "warning" : "glass"}>{o.payMethod}</Badge><div style={{ fontSize: 12, color: "var(--lux-ink-muted)", marginTop: 2 }}>{o.payStatus}</div></td>
              <td style={td}>{o.total}</td>
              <td style={td}><OrderStatusSelect orderNo={o.no} status={o.status} next={o.next} />{o.returnRequested && <div style={{ marginTop: 6 }}><Badge tone="warning">Return requested</Badge></div>}</td>
            </tr>
          ))}
        </tbody>
      </TableWrap>
    </>
  );
}
