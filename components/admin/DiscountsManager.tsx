"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/checkout/Field";
import { deleteDiscountAction, saveDiscountAction } from "@/app/actions/admin";

const SIZES = ["1ml", "3ml", "6ml", "12ml", "Standard"];

export type DiscountRow = {
  id: string; name: string; scope: "product" | "category" | "all"; target: string; targetLabel: string;
  type: "percent" | "fixed"; value: number; sizes: string[]; startsOn: string; endsOn: string; active: boolean;
};
type Draft = Omit<DiscountRow, "targetLabel" | "value" | "id"> & { id: string | null; value: string };

const blank: Draft = { id: null, name: "", scope: "all", target: "", type: "percent", value: "", sizes: [], startsOn: "", endsOn: "", active: true };

const describe = (d: DiscountRow) =>
  `${d.type === "percent" ? `${d.value}%` : `৳${d.value}`} off ${d.scope === "all" ? "everything" : d.scope === "category" ? d.target : d.targetLabel}${d.sizes.length ? ` (${d.sizes.join(", ")})` : ""}`;

export function DiscountsManager({ rows, products }: { rows: DiscountRow[]; products: { slug: string; title: string }[] }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const edit = (d: DiscountRow) => { setDraft({ ...d, value: String(d.value) }); setError(""); };
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((p) => (p ? { ...p, [k]: v } : p));

  const call = async (fn: () => Promise<{ ok: boolean } & { error?: string }>, done?: () => void) => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const r = await fn();
      if (r.ok) { done?.(); router.refresh(); } else setError(r.error ?? "That didn't work.");
    } catch {
      setError("We couldn't reach the server. Please try again.");
    }
    setBusy(false);
  };
  const save = (e: React.FormEvent) => { e.preventDefault(); if (draft) call(() => saveDiscountAction(draft), () => setDraft(null)); };

  return (
    <div className="flex flex-col gap-5">
      <div><Button size="sm" onClick={() => { setDraft(blank); setError(""); }}>Add discount</Button></div>

      {draft && (
        <form onSubmit={save} noValidate className="lux-surface flex flex-col gap-4" style={{ borderRadius: 16, padding: 20, maxWidth: 720 }}>
          <div className="grid gap-3.5 sm:grid-cols-2">
            <Field id="dc-name" label="Name * (customers see it)"><input id="dc-name" className="lux-input" placeholder="Eid Sale" maxLength={80} value={draft.name} onChange={(e) => set("name", e.target.value)} /></Field>
            <Field id="dc-scope" label="Applies to">
              <select id="dc-scope" className="lux-input" value={draft.scope} onChange={(e) => { set("scope", e.target.value as Draft["scope"]); set("target", ""); }}>
                <option value="all">Everything</option><option value="category">A category</option><option value="product">One product</option>
              </select>
            </Field>
            {draft.scope === "category" && <Field id="dc-cat" label="Category"><input id="dc-cat" className="lux-input" placeholder="Women's Perfume" value={draft.target} onChange={(e) => set("target", e.target.value)} /></Field>}
            {draft.scope === "product" && (
              <Field id="dc-prod" label="Product">
                <select id="dc-prod" className="lux-input" value={draft.target} onChange={(e) => set("target", e.target.value)}>
                  <option value="">Choose…</option>{products.map((p) => <option key={p.slug} value={p.slug}>{p.title}</option>)}
                </select>
              </Field>
            )}
            <Field id="dc-type" label="Type">
              <select id="dc-type" className="lux-input" value={draft.type} onChange={(e) => set("type", e.target.value as Draft["type"])}>
                <option value="percent">Percent off</option><option value="fixed">Taka off each</option>
              </select>
            </Field>
            <Field id="dc-val" label={draft.type === "percent" ? "Percent (1–99)" : "Taka off each unit"}><input id="dc-val" inputMode="decimal" className="lux-input" value={draft.value} onChange={(e) => set("value", e.target.value.replace(/[^\d.]/g, ""))} /></Field>
            <Field id="dc-from" label="Starts (optional)"><input id="dc-from" type="date" className="lux-input" value={draft.startsOn} onChange={(e) => set("startsOn", e.target.value)} /></Field>
            <Field id="dc-to" label="Ends (optional)"><input id="dc-to" type="date" className="lux-input" value={draft.endsOn} onChange={(e) => set("endsOn", e.target.value)} /></Field>
          </div>
          <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
            <legend style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--lux-ink-muted)", marginBottom: 6 }}>Sizes (none ticked = all sizes)</legend>
            <div className="flex flex-wrap gap-4">
              {SIZES.map((s) => (
                <label key={s} className="flex cursor-pointer items-center gap-2" style={{ fontSize: 14 }}>
                  <input type="checkbox" checked={draft.sizes.includes(s)} onChange={(e) => set("sizes", e.target.checked ? [...draft.sizes, s] : draft.sizes.filter((x) => x !== s))} style={{ accentColor: "var(--lux-gold)" }} /> {s}
                </label>
              ))}
            </div>
          </fieldset>
          <label className="flex cursor-pointer items-center gap-2" style={{ fontSize: 14 }}><input type="checkbox" checked={draft.active} onChange={(e) => set("active", e.target.checked)} style={{ accentColor: "var(--lux-gold)" }} /> Active</label>
          {error && <p role="alert" style={{ margin: 0, fontSize: 14, color: "var(--lux-warning)" }}>{error}</p>}
          <div className="flex gap-2"><Button type="submit" size="sm" disabled={busy}>{busy ? "Saving…" : "Save discount"}</Button><Button type="button" variant="ghost" size="sm" onClick={() => setDraft(null)}>Cancel</Button></div>
        </form>
      )}
      {!draft && error && <p role="alert" style={{ margin: 0, fontSize: 14, color: "var(--lux-warning)" }}>{error}</p>}

      <div className="flex flex-col gap-3">
        {rows.length === 0 && <p style={{ color: "var(--lux-ink-muted)" }}>No discounts yet.</p>}
        {rows.map((d) => (
          <div key={d.id} className="lux-surface flex flex-wrap items-center gap-3" style={{ borderRadius: 14, padding: "14px 18px" }}>
            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ fontWeight: 600 }}>{d.name} {d.active ? <Badge tone="success">Active</Badge> : <Badge tone="glass">Paused</Badge>}</div>
              <div style={{ fontSize: 13, color: "var(--lux-ink-muted)", marginTop: 3 }}>{describe(d)}{d.startsOn || d.endsOn ? ` · ${d.startsOn || "…"} to ${d.endsOn || "…"}` : ""}</div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => edit(d)}>Edit</Button>
            <Button variant="ghost" size="sm" disabled={busy} onClick={() => { if (window.confirm(`Delete "${d.name}"? Prices go back to normal straight away.`)) call(() => deleteDiscountAction(d.id)); }}>Delete</Button>
          </div>
        ))}
      </div>
    </div>
  );
}
