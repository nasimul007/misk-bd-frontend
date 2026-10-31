"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/checkout/Field";
import { ImageField } from "@/components/admin/ImageField";
import { useAdminCall } from "@/components/admin/useAdminCall";
import { deleteSectionAction, deleteSubsectionAction, moveSectionAction, saveBlockAction, saveSectionAction, saveSubsectionAction } from "@/app/actions/admin";

export type SectionRow = { id: string; name: string; blurb: string; image: string; visible: boolean; showSpecs: boolean; products: number; children: { id: string; name: string; products: number }[] };

const panel = { borderRadius: 16, padding: 20 } as const;
const small = { width: 30, height: 30, borderRadius: 8, border: "1px solid var(--lux-line)", background: "transparent", color: "var(--lux-ink)", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" } as const;

function Heading({ initial }: { initial: { eyebrow: string; title: string } }) {
  const { run, busy, error, note } = useAdminCall();
  const [h, setH] = useState(initial);
  return (
    <form className="lux-surface flex flex-col gap-3.5" style={panel} onSubmit={(e) => { e.preventDefault(); run(() => saveBlockAction("sectionsMeta", h)); }}>
      <h2 className="font-display" style={{ margin: 0, fontSize: 17, fontWeight: 500 }}>Home page heading</h2>
      <div className="grid gap-3.5 sm:grid-cols-2">
        <Field id="sm-eyebrow" label="Eyebrow"><input id="sm-eyebrow" className="lux-input" maxLength={60} value={h.eyebrow} onChange={(e) => setH({ ...h, eyebrow: e.target.value })} /></Field>
        <Field id="sm-title" label="Title"><input id="sm-title" className="lux-input" maxLength={120} value={h.title} onChange={(e) => setH({ ...h, title: e.target.value })} /></Field>
      </div>
      <div className="flex items-center gap-3"><Button type="submit" size="sm" disabled={busy}>Save heading</Button>{error && <span role="alert" style={{ fontSize: 13, color: "var(--lux-warning)" }}>{error}</span>}{note && <span role="status" style={{ fontSize: 13, color: "var(--lux-success)" }}>{note}</span>}</div>
    </form>
  );
}

function SectionCard({ s, index, count }: { s: SectionRow; index: number; count: number }) {
  const { run, busy, error, note } = useAdminCall();
  const [d, setD] = useState({ name: s.name, blurb: s.blurb, image: s.image, visible: s.visible, showSpecs: s.showSpecs });
  const [newSub, setNewSub] = useState("");
  const [subNames, setSubNames] = useState<Record<string, string>>({});

  const remove = () => {
    const msg = `Delete "${s.name}"${s.children.length ? ` and its ${s.children.length} sub-section${s.children.length > 1 ? "s" : ""}` : ""}?${s.products ? ` ${s.products} product${s.products > 1 ? "s" : ""} will stay in the shop but become unassigned.` : ""}`;
    if (window.confirm(msg)) run(() => deleteSectionAction(s.id), "Deleted.");
  };
  const dirty = d.name !== s.name || d.blurb !== s.blurb || d.image !== s.image || d.visible !== s.visible || d.showSpecs !== s.showSpecs;

  return (
    <div className="lux-surface flex flex-col gap-4" style={panel}>
      <div className="flex flex-wrap items-start gap-4">
        <ImageField label={`${s.name} image`} value={d.image} onChange={(image) => setD({ ...d, image })} />
        <div className="flex min-w-[260px] flex-1 flex-col gap-3">
          <Field id={`sec-name-${s.id}`} label="Section name"><input id={`sec-name-${s.id}`} className="lux-input" maxLength={60} value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} /></Field>
          <Field id={`sec-blurb-${s.id}`} label="Short description"><textarea id={`sec-blurb-${s.id}`} rows={2} className="lux-input" maxLength={160} value={d.blurb} onChange={(e) => setD({ ...d, blurb: e.target.value })} /></Field>
          <div className="flex flex-wrap gap-5">
            <label className="flex cursor-pointer items-center gap-2" style={{ fontSize: 13 }}><input type="checkbox" checked={d.visible} onChange={(e) => setD({ ...d, visible: e.target.checked })} style={{ accentColor: "var(--lux-gold)" }} /> Show on storefront</label>
            <label className="flex cursor-pointer items-center gap-2" style={{ fontSize: 13 }}><input type="checkbox" checked={d.showSpecs} onChange={(e) => setD({ ...d, showSpecs: e.target.checked })} style={{ accentColor: "var(--lux-gold)" }} /> Fragrance details on product pages</label>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button type="button" style={small} aria-label="Move up" disabled={busy || index === 0} onClick={() => run(() => moveSectionAction(s.id, "up"), "Moved.")}><ArrowUp size={15} /></button>
          <button type="button" style={small} aria-label="Move down" disabled={busy || index === count - 1} onClick={() => run(() => moveSectionAction(s.id, "down"), "Moved.")}><ArrowDown size={15} /></button>
          <button type="button" style={small} aria-label={`Delete ${s.name}`} disabled={busy} onClick={remove}><Trash2 size={15} /></button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button size="sm" disabled={busy || !dirty} onClick={() => run(() => saveSectionAction({ id: s.id, ...d }))}>{busy ? "Saving…" : "Save section"}</Button>
        <Badge tone="glass">{s.products} product{s.products === 1 ? "" : "s"}</Badge>
        {!s.visible && <Badge tone="warning">Hidden</Badge>}
        {error && <span role="alert" style={{ fontSize: 13, color: "var(--lux-warning)" }}>{error}</span>}
        {note && <span role="status" style={{ fontSize: 13, color: "var(--lux-success)" }}>{note}</span>}
      </div>

      <div style={{ borderTop: "1px solid var(--lux-line)", paddingTop: 14 }}>
        <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--lux-ink-muted)", marginBottom: 8 }}>Sub-sections</div>
        <div className="flex flex-col gap-2">
          {s.children.map((c) => {
            const val = subNames[c.id] ?? c.name;
            return (
              <div key={c.id} className="flex flex-wrap items-center gap-2">
                <input aria-label={`Sub-section ${c.name}`} className="lux-input" style={{ maxWidth: 260 }} maxLength={60} value={val} onChange={(e) => setSubNames({ ...subNames, [c.id]: e.target.value })} />
                {val.trim() !== c.name && <Button variant="ghost" size="sm" disabled={busy} onClick={() => run(() => saveSubsectionAction(s.id, c.id, val), "Renamed.")}>Rename</Button>}
                <span style={{ fontSize: 12, color: "var(--lux-ink-muted)" }}>{c.products} product{c.products === 1 ? "" : "s"}</span>
                <button type="button" style={small} aria-label={`Remove ${c.name}`} disabled={busy} onClick={() => { if (window.confirm(`Remove "${c.name}"?${c.products ? ` ${c.products} product${c.products > 1 ? "s" : ""} stay in ${s.name} without a sub-section.` : ""}`)) run(() => deleteSubsectionAction(s.id, c.id), "Removed."); }}><Trash2 size={14} /></button>
              </div>
            );
          })}
          <form className="flex flex-wrap items-center gap-2" onSubmit={async (e) => { e.preventDefault(); if (newSub.trim() && (await run(() => saveSubsectionAction(s.id, "", newSub), "Added."))) setNewSub(""); }}>
            <input aria-label={`New sub-section in ${s.name}`} className="lux-input" style={{ maxWidth: 260 }} placeholder="New sub-section" maxLength={60} value={newSub} onChange={(e) => setNewSub(e.target.value)} />
            <Button type="submit" variant="ghost" size="sm" disabled={busy || !newSub.trim()}>Add</Button>
          </form>
        </div>
      </div>
    </div>
  );
}

export function SectionsManager({ sections, meta }: { sections: SectionRow[]; meta: { eyebrow: string; title: string } }) {
  const { run, busy, error } = useAdminCall();
  const [name, setName] = useState("");
  return (
    <div className="flex flex-col gap-5">
      <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.6, color: "var(--lux-ink-muted)", maxWidth: 680 }}>
        Sections are the store&apos;s main collections. They appear on the home page, in the shop filters and on product pages. Use ↑ ↓ to change their order.
      </p>
      <Heading initial={meta} />
      <form className="lux-surface flex flex-wrap items-end gap-3" style={panel} onSubmit={async (e) => { e.preventDefault(); if (name.trim() && (await run(() => saveSectionAction({ name }), "Section added."))) setName(""); }}>
        <div style={{ flex: "1 1 240px" }}><Field id="sec-new" label="New section" error={error}><input id="sec-new" className="lux-input" maxLength={60} placeholder="e.g. Gift Sets" value={name} onChange={(e) => setName(e.target.value)} /></Field></div>
        <Button type="submit" size="sm" disabled={busy || !name.trim()}>Add section</Button>
      </form>
      {sections.map((s, i) => <SectionCard key={`${s.id}-${s.name}-${s.blurb}-${s.image}-${s.visible}-${s.showSpecs}`} s={s} index={i} count={sections.length} />)}
    </div>
  );
}
