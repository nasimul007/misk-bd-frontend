"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, ariaFor } from "@/components/checkout/Field";
import { ImageField } from "@/components/admin/ImageField";
import { saveProductAction, type ProductInput } from "@/app/actions/admin";

const SIZES = ["1ml", "3ml", "6ml", "12ml"];

export type ProductFormData = Omit<ProductInput, "variants"> & { variants: { size: string; price: string }[] };

/** Create or edit a product. The server validates everything again; these checks just save a round trip. */
export function ProductForm({ initial, sections }: { initial: ProductFormData; sections: { slug: string; name: string; children: { slug: string; name: string }[] }[] }) {
  const router = useRouter();
  const [f, setF] = useState<ProductFormData>(initial);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  const set = <K extends keyof ProductFormData>(k: K, v: ProductFormData[K]) => { setF((p) => ({ ...p, [k]: v })); setSaved(false); };
  const subs = sections.find((x) => x.slug === f.sectionSlug)?.children ?? [];
  const price = (size: string) => f.variants.find((v) => v.size === size)?.price;
  const setPrice = (size: string, value: string) =>
    set("variants", value === "" && !f.variants.some((v) => v.size === size) ? f.variants : [...f.variants.filter((v) => v.size !== size), ...(value === "" ? [] : [{ size, price: value }])]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const r = await saveProductAction(f);
      if (r.ok) {
        setSaved(true);
        if (!f.slug) router.replace(`/admin/products/${r.slug}`); else router.refresh();
      } else setError(r.error);
    } catch {
      setError("We couldn't reach the server. Please try again.");
    }
    setBusy(false);
  };

  const section = { borderRadius: 16, padding: 20 } as const;
  const h = { margin: "0 0 14px", fontSize: 13, textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--lux-ink-muted)", fontWeight: 500 } as const;
  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5" style={{ maxWidth: 820 }}>
      <section className="lux-surface" style={section}>
        <h2 style={h}>Details</h2>
        <div className="grid gap-3.5 sm:grid-cols-2">
          <Field id="pf-title" label="Name *"><input id="pf-title" className="lux-input" value={f.title} maxLength={120} onChange={(e) => set("title", e.target.value)} /></Field>
          <Field id="pf-ar" label="Arabic name"><input id="pf-ar" dir="rtl" className="lux-input" value={f.titleAr} maxLength={120} onChange={(e) => set("titleAr", e.target.value)} /></Field>
          <Field id="pf-cat" label="Category *"><input id="pf-cat" className="lux-input" placeholder="Men's Perfume" value={f.category} maxLength={60} onChange={(e) => set("category", e.target.value)} /></Field>
          <Field id="pf-fam" label="Scent family"><input id="pf-fam" className="lux-input" placeholder="Oud & Amber" value={f.scentFamily} maxLength={60} onChange={(e) => set("scentFamily", e.target.value)} /></Field>
          <Field id="pf-sec" label="Collection">
            <select id="pf-sec" className="lux-input" value={f.sectionSlug} onChange={(e) => setF((p) => ({ ...p, sectionSlug: e.target.value, subsectionSlug: "" }))}>
              <option value="">None</option>
              {sections.map((s) => <option key={s.slug} value={s.slug}>{s.name}</option>)}
            </select>
          </Field>
          <Field id="pf-sub" label="Sub-section">
            <select id="pf-sub" className="lux-input" value={f.subsectionSlug} disabled={!subs.length} onChange={(e) => set("subsectionSlug", e.target.value)}>
              <option value="">{subs.length ? "None" : "No sub-sections"}</option>
              {subs.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
            </select>
          </Field>
          <Field id="pf-tags" label="Tags (comma separated)"><input id="pf-tags" className="lux-input" placeholder="best seller, premium" value={f.tags} onChange={(e) => set("tags", e.target.value)} /></Field>
          <Field id="pf-desc" label="Description" className="sm:col-span-2"><textarea id="pf-desc" rows={4} className="lux-input" value={f.description} maxLength={4000} onChange={(e) => set("description", e.target.value)} /></Field>
        </div>
      </section>

      <section className="lux-surface" style={section}>
        <h2 style={h}>Sizes and prices (৳)</h2>
        <div className="grid gap-3.5 sm:grid-cols-5">
          {SIZES.map((s) => (
            <Field key={s} id={`pf-p-${s}`} label={s}>
              <input id={`pf-p-${s}`} inputMode="numeric" className="lux-input" placeholder="Not sold" value={price(s) ?? ""} onChange={(e) => setPrice(s, e.target.value.replace(/\D/g, ""))} />
            </Field>
          ))}
        </div>
        <p style={{ margin: "10px 0 0", fontSize: 12.5, color: "var(--lux-ink-muted)" }}>Leave a size empty to stop selling it. Discounts are set on the Discounts page.</p>
      </section>

      <section className="lux-surface" style={section}>
        <h2 style={h}>Stock and visibility</h2>
        <div className="grid items-end gap-3.5 sm:grid-cols-3">
          <Field id="pf-stock" label="In stock *"><input id="pf-stock" inputMode="numeric" className="lux-input" value={String(f.stock)} onChange={(e) => set("stock", e.target.value.replace(/\D/g, ""))} /></Field>
          <label className="flex cursor-pointer items-center gap-2" style={{ fontSize: 14, paddingBottom: 12 }}><input type="checkbox" checked={f.active} onChange={(e) => set("active", e.target.checked)} style={{ accentColor: "var(--lux-gold)" }} /> Visible in the shop</label>
          <label className="flex cursor-pointer items-center gap-2" style={{ fontSize: 14, paddingBottom: 12 }}><input type="checkbox" checked={f.bestseller} onChange={(e) => set("bestseller", e.target.checked)} style={{ accentColor: "var(--lux-gold)" }} /> Best seller</label>
        </div>
      </section>

      <section className="lux-surface" style={section}>
        <h2 style={h}>Fragrance details</h2>
        <div className="grid gap-3.5 sm:grid-cols-2">
          <Field id="pf-last" label="Lasts (hours)"><input id="pf-last" inputMode="numeric" className="lux-input" value={String(f.lastingHours)} onChange={(e) => set("lastingHours", e.target.value.replace(/\D/g, ""))} /></Field>
          <Field id="pf-proj" label="Projection"><input id="pf-proj" className="lux-input" placeholder="Moderate" value={f.projection} maxLength={60} onChange={(e) => set("projection", e.target.value)} /></Field>
          <Field id="pf-conc" label="Concentration"><input id="pf-conc" className="lux-input" placeholder="Eau de Parfum" value={f.concentration} maxLength={60} onChange={(e) => set("concentration", e.target.value)} /></Field>
          <Field id="pf-orig" label="Origin"><input id="pf-orig" className="lux-input" value={f.origin} maxLength={120} onChange={(e) => set("origin", e.target.value)} /></Field>
        </div>
      </section>

      <section className="lux-surface" style={section}>
        <h2 style={h}>Photos</h2>
        <div className="flex flex-wrap gap-4">
          {[...f.images, ...(f.images.length < 5 ? [""] : [])].map((url, i) => (
            <div key={i} className="flex flex-col items-start gap-1">
              <ImageField label={i === 0 ? "Main photo" : `Photo ${i + 1}`} size={96} value={url} onChange={(u) => set("images", url ? f.images.map((x, j) => (j === i ? u : x)) : [...f.images, u])} />
              <span style={{ fontSize: 11.5, color: "var(--lux-ink-muted)" }}>{i === 0 ? "Main" : i === 1 ? "Hover" : `Photo ${i + 1}`}</span>
              {url && <button type="button" onClick={() => set("images", f.images.filter((_, j) => j !== i))} className="lux-focus" style={{ border: 0, background: "none", color: "var(--lux-ink-muted)", cursor: "pointer", fontSize: 12, textDecoration: "underline" }}>Remove</button>}
            </div>
          ))}
        </div>
        <p style={{ margin: "10px 0 0", fontSize: 12.5, color: "var(--lux-ink-muted)" }}>Up to 5. The first is the main photo and the second shows when a shopper hovers. JPEG, PNG, WebP or GIF under 5 MB; they are resized and converted for you.</p>
      </section>

      {error && <p role="alert" {...ariaFor("pf-title", error)} style={{ margin: 0, fontSize: 14, color: "var(--lux-warning)" }}>{error}</p>}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={busy}>{busy ? "Saving…" : f.slug ? "Save changes" : "Create product"}</Button>
        <Link href="/admin/products" className="lux-btn lux-focus" style={{ padding: "0.9rem 2rem", fontSize: "0.95rem" }}>Back to products</Link>
        {saved && <span role="status" style={{ fontSize: 14, color: "var(--lux-success)" }}>Saved. The shop is updated.</span>}
      </div>
    </form>
  );
}
