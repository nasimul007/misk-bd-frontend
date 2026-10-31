"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/checkout/Field";
import { adjustStockAction } from "@/app/actions/admin";

export type StockRow = { slug: string; title: string; image: string; stock: number; active: boolean };

const REASONS = ["Restock", "Damaged", "Lost or missing", "Stock count correction", "Returned to supplier"];

export function InventoryManager({ rows }: { rows: StockRow[] }) {
  const router = useRouter();
  const [slug, setSlug] = useState(rows[0]?.slug ?? "");
  const [delta, setDelta] = useState("");
  const [reason, setReason] = useState(REASONS[0]);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const apply = async (target: string, change: number, why: string, done?: () => void) => {
    if (busy) return;
    setBusy(true);
    setError("");
    setNote("");
    try {
      const r = await adjustStockAction(target, change, why);
      if (r.ok) { done?.(); setNote(`Stock is now ${r.stock}.`); router.refresh(); } else setError(r.error);
    } catch {
      setError("We couldn't reach the server. Please try again.");
    }
    setBusy(false);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const n = Number(delta);
    if (!Number.isInteger(n) || n === 0) return setError("Enter a whole number such as 12 or -3.");
    apply(slug, n, reason, () => setDelta(""));
  };
  const pill = (stock: number) => (
    <span style={{ fontSize: 12, fontWeight: 600, padding: "2px 10px", borderRadius: 999, border: "1px solid var(--lux-line)", color: stock === 0 ? "var(--lux-danger)" : stock <= 5 ? "var(--lux-warning)" : "var(--lux-success)" }}>
      {stock === 0 ? "Out of stock" : stock <= 5 ? `Low · ${stock}` : `${stock} in stock`}
    </span>
  );
  const iconBtn = { width: 30, height: 30, borderRadius: 8, border: "1px solid var(--lux-line)", background: "transparent", color: "var(--lux-ink)", cursor: "pointer", fontSize: 16 } as const;

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={submit} noValidate className="lux-surface flex flex-col gap-4" style={{ borderRadius: 16, padding: 20, maxWidth: 760 }}>
        <h2 style={{ margin: 0, fontSize: 13, textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--lux-ink-muted)", fontWeight: 500 }}>Adjust stock</h2>
        <div className="grid gap-3.5 sm:grid-cols-[2fr_1fr_2fr]">
          <Field id="inv-product" label="Product">
            <select id="inv-product" className="lux-input" value={slug} onChange={(e) => setSlug(e.target.value)}>{rows.map((r) => <option key={r.slug} value={r.slug}>{r.title} ({r.stock})</option>)}</select>
          </Field>
          <Field id="inv-delta" label="Change (+ or −)"><input id="inv-delta" inputMode="numeric" className="lux-input" placeholder="+12 or -3" value={delta} onChange={(e) => setDelta(e.target.value.replace(/[^\d-+]/g, ""))} /></Field>
          <Field id="inv-reason" label="Reason">
            <input id="inv-reason" list="inv-reasons" className="lux-input" maxLength={120} value={reason} onChange={(e) => setReason(e.target.value)} />
            <datalist id="inv-reasons">{REASONS.map((r) => <option key={r} value={r} />)}</datalist>
          </Field>
        </div>
        <div className="flex items-center gap-3"><Button type="submit" size="sm" disabled={busy || !slug}>{busy ? "Saving…" : "Apply change"}</Button>
          {error && <span role="alert" style={{ fontSize: 13, color: "var(--lux-warning)" }}>{error}</span>}
          {note && <span role="status" style={{ fontSize: 13, color: "var(--lux-success)" }}>{note}</span>}
        </div>
      </form>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: 14 }}>
        {rows.map((r) => (
          <div key={r.slug} className="lux-surface flex flex-col gap-2.5" style={{ borderRadius: 14, padding: 14, opacity: r.active ? 1 : 0.6 }}>
            <div style={{ fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={r.title}>{r.title}{!r.active && " (hidden)"}</div>
            <div className="flex items-center justify-between gap-2">
              {pill(r.stock)}
              <span className="flex gap-1.5">
                <button type="button" style={iconBtn} disabled={busy || r.stock === 0} aria-label={`Remove one ${r.title}`} onClick={() => apply(r.slug, -1, "Manual adjustment")}>−</button>
                <button type="button" style={iconBtn} disabled={busy} aria-label={`Add one ${r.title}`} onClick={() => apply(r.slug, 1, "Manual adjustment")}>+</button>
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
