"use client";

import { useState, type ReactNode } from "react";
import { Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/checkout/Field";
import { ImageField } from "@/components/admin/ImageField";
import { useAdminCall } from "@/components/admin/useAdminCall";
import { resetBlockAction, saveBlockAction } from "@/app/actions/admin";
import { TRUST_ICON_NAMES } from "@/lib/trust-icons";
import type { SiteContent } from "@/lib/types";

const panel = { borderRadius: 16, padding: 20 } as const;
const glass = { borderRadius: 12, padding: 14 } as const;
const small = { width: 30, height: 30, borderRadius: 8, border: "1px solid var(--lux-line)", background: "transparent", color: "var(--lux-ink)", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" } as const;

/** One editable block: its own Save, an error line, and "Restore default" once it has been customised. */
function Block<T>({ id, title, hint, initial, customised, children }: { id: string; title: string; hint?: string; initial: T; customised: boolean; children: (value: T, set: (next: T) => void) => ReactNode }) {
  const { run, busy, error, note } = useAdminCall();
  const [value, setValue] = useState<T>(initial);
  const dirty = JSON.stringify(value) !== JSON.stringify(initial);
  return (
    <form className="lux-surface flex flex-col gap-4" style={panel} onSubmit={(e) => { e.preventDefault(); run(() => saveBlockAction(id, value), "Saved. The storefront is updated."); }}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display" style={{ margin: 0, fontSize: 17, fontWeight: 500 }}>{title} {customised && <Badge tone="gold">Customised</Badge>}</h2>
      </div>
      {hint && <p style={{ margin: "-6px 0 0", fontSize: 13, color: "var(--lux-ink-muted)" }}>{hint}</p>}
      {children(value, setValue)}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="sm" disabled={busy || !dirty}>{busy ? "Saving…" : "Save"}</Button>
        {customised && <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => { if (window.confirm(`Restore the original ${title.toLowerCase()}? Your edits will be lost.`)) run(() => resetBlockAction(id), "Restored the default."); }}>Restore default</Button>}
        {error && <span role="alert" style={{ fontSize: 13, color: "var(--lux-warning)" }}>{error}</span>}
        {note && <span role="status" style={{ fontSize: 13, color: "var(--lux-success)" }}>{note}</span>}
      </div>
    </form>
  );
}

const text = (id: string, label: string, v: string, set: (v: string) => void, max = 120, span = false) => (
  <Field id={id} label={label} className={span ? "sm:col-span-2" : ""}><input id={id} className="lux-input" maxLength={max} value={v} onChange={(e) => set(e.target.value)} /></Field>
);
const area = (id: string, label: string, v: string, set: (v: string) => void, max: number) => (
  <Field id={id} label={label} className="sm:col-span-2"><textarea id={id} rows={3} className="lux-input" maxLength={max} value={v} onChange={(e) => set(e.target.value)} /></Field>
);

export function ContentEditor({ content, customised }: { content: SiteContent; customised: string[] }) {
  const c = (key: string) => customised.includes(key);
  return (
    <div className="flex flex-col gap-5">
      <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.6, color: "var(--lux-ink-muted)", maxWidth: 680 }}>
        Edit the words and pictures on the home page and in the footer. Each block saves on its own and goes live straight away. The collections and their home-page heading are managed under Sections.
      </p>

      <Block id="hero" title="Hero section" initial={content.hero} customised={c("hero")}>
        {(v, set) => (
          <div className="flex flex-wrap gap-4">
            <ImageField label="Hero image" value={v.image} onChange={(image) => set({ ...v, image })} />
            <div className="grid min-w-[280px] flex-1 gap-3.5 sm:grid-cols-2">
              {text("hero-eyebrow", "Eyebrow", v.eyebrow, (x) => set({ ...v, eyebrow: x }), 80, true)}
              {text("hero-l1", "Headline line 1", v.titleLine1, (x) => set({ ...v, titleLine1: x }), 80)}
              {text("hero-l2", "Headline line 2 (italic)", v.titleLine2, (x) => set({ ...v, titleLine2: x }), 80)}
              {area("hero-sub", "Subtitle", v.subtitle, (x) => set({ ...v, subtitle: x }), 300)}
            </div>
          </div>
        )}
      </Block>

      <Block id="trust" title="Trust bar" hint="Up to 6 short promises shown under the hero." initial={content.trust} customised={c("trust")}>
        {(items, set) => (
          <div className="flex flex-col gap-3">
            {items.map((t, i) => (
              <div key={i} className="lux-glass flex flex-wrap items-end gap-3" style={glass}>
                <Field id={`tr-icon-${i}`} label="Icon">
                  <select id={`tr-icon-${i}`} className="lux-input" value={t.icon} onChange={(e) => set(items.map((x, j) => (j === i ? { ...x, icon: e.target.value } : x)))}>{TRUST_ICON_NAMES.map((n) => <option key={n} value={n}>{n}</option>)}</select>
                </Field>
                <div style={{ flex: "1 1 160px" }}>{text(`tr-title-${i}`, "Title", t.title, (x) => set(items.map((y, j) => (j === i ? { ...y, title: x } : y))), 40)}</div>
                <div style={{ flex: "1 1 200px" }}>{text(`tr-sub-${i}`, "Subtext", t.sub, (x) => set(items.map((y, j) => (j === i ? { ...y, sub: x } : y))), 60)}</div>
                <button type="button" style={small} aria-label={`Remove ${t.title || "item"}`} onClick={() => set(items.filter((_, j) => j !== i))}><Trash2 size={14} /></button>
              </div>
            ))}
            {items.length < 6 && <div><Button type="button" variant="ghost" size="sm" onClick={() => set([...items, { icon: "sparkles", title: "New benefit", sub: "Description" }])}>Add item</Button></div>}
          </div>
        )}
      </Block>

      <Block id="manifesto" title={'Manifesto ("The House")'} initial={content.manifesto} customised={c("manifesto")}>
        {(v, set) => (
          <div className="flex flex-wrap gap-4">
            <ImageField label="Manifesto image" value={v.image} onChange={(image) => set({ ...v, image })} />
            <div className="grid min-w-[280px] flex-1 gap-3.5 sm:grid-cols-2">
              {text("mf-eyebrow", "Eyebrow", v.eyebrow, (x) => set({ ...v, eyebrow: x }), 60)}
              {text("mf-title", "Title", v.title, (x) => set({ ...v, title: x }), 120)}
              {area("mf-body", "Body", v.body, (x) => set({ ...v, body: x }), 1200)}
              {text("mf-quote", "Pull quote", v.quote, (x) => set({ ...v, quote: x }), 200, true)}
            </div>
          </div>
        )}
      </Block>

      <Block id="categories" title="Categories" hint="The picture tiles on the home page. Each name links to the shop filtered by that category." initial={content.categories} customised={c("categories")}>
        {(items, set) => (
          <div className="flex flex-col gap-3">
            {items.map((cat, i) => (
              <div key={i} className="lux-glass flex flex-wrap items-center gap-3" style={glass}>
                <ImageField label={`${cat.name || "Category"} image`} size={56} value={cat.image} onChange={(image) => set(items.map((x, j) => (j === i ? { ...x, image } : x)))} />
                <div style={{ flex: "1 1 200px" }}>{text(`cat-${i}`, "Name", cat.name, (x) => set(items.map((y, j) => (j === i ? { ...y, name: x } : y))), 40)}</div>
                <button type="button" style={small} aria-label={`Remove ${cat.name || "category"}`} onClick={() => set(items.filter((_, j) => j !== i))}><Trash2 size={14} /></button>
              </div>
            ))}
            {items.length < 12 && <div><Button type="button" variant="ghost" size="sm" onClick={() => set([...items, { name: "New category", image: "/images/product-1.jpg" }])}>Add category</Button></div>}
          </div>
        )}
      </Block>

      <Block id="testimonials" title="Testimonials" initial={content.testimonials} customised={c("testimonials")}>
        {(items, set) => (
          <div className="flex flex-col gap-3">
            {items.map((t, i) => (
              <div key={i} className="lux-glass flex flex-wrap items-start gap-3" style={glass}>
                <div className="grid min-w-[260px] flex-1 gap-3.5 sm:grid-cols-3">
                  {text(`ts-name-${i}`, "Name", t.name, (x) => set(items.map((y, j) => (j === i ? { ...y, name: x } : y))), 60)}
                  {text(`ts-loc-${i}`, "Location", t.location, (x) => set(items.map((y, j) => (j === i ? { ...y, location: x } : y))), 60)}
                  <Field id={`ts-rate-${i}`} label="Rating (1–5)"><input id={`ts-rate-${i}`} type="number" min={1} max={5} className="lux-input" value={t.rating} onChange={(e) => set(items.map((y, j) => (j === i ? { ...y, rating: Number(e.target.value) } : y)))} /></Field>
                  <div className="sm:col-span-3">{area(`ts-quote-${i}`, "Quote", t.quote, (x) => set(items.map((y, j) => (j === i ? { ...y, quote: x } : y))), 400)}</div>
                </div>
                <button type="button" style={small} aria-label={`Remove ${t.name || "testimonial"}`} onClick={() => set(items.filter((_, j) => j !== i))}><Trash2 size={14} /></button>
              </div>
            ))}
            {items.length < 12 && <div><Button type="button" variant="ghost" size="sm" onClick={() => set([...items, { quote: "Share what patrons say…", name: "Customer name", location: "City, Bangladesh", rating: 5 }])}>Add testimonial</Button></div>}
          </div>
        )}
      </Block>

      <Block id="cta" title="Closing call to action" initial={content.cta} customised={c("cta")}>
        {(v, set) => (
          <div className="grid gap-3.5 sm:grid-cols-2">
            {text("cta-eyebrow", "Eyebrow", v.eyebrow, (x) => set({ ...v, eyebrow: x }), 60)}
            {text("cta-title", "Title", v.title, (x) => set({ ...v, title: x }), 120)}
            {area("cta-body", "Body", v.body, (x) => set({ ...v, body: x }), 400)}
          </div>
        )}
      </Block>

      <Block id="footer" title="Footer & contact" initial={content.footer} customised={c("footer")}>
        {(v, set) => (
          <div className="grid gap-3.5 sm:grid-cols-2">
            {area("ft-desc", "Brand description", v.description, (x) => set({ ...v, description: x }), 300)}
            {text("ft-addr", "Address", v.address, (x) => set({ ...v, address: x }), 160)}
            {text("ft-phone", "Phone (as shown)", v.phone, (x) => set({ ...v, phone: x }), 30)}
            {text("ft-wa", "WhatsApp number (digits only)", v.whatsapp, (x) => set({ ...v, whatsapp: x.replace(/\D/g, "") }), 20)}
            {text("ft-mail", "Email", v.email, (x) => set({ ...v, email: x }), 120)}
            {text("ft-fb", "Facebook link (https://…)", v.facebook, (x) => set({ ...v, facebook: x }), 300)}
            {text("ft-ig", "Instagram link (https://…)", v.instagram, (x) => set({ ...v, instagram: x }), 300)}
          </div>
        )}
      </Block>
    </div>
  );
}
