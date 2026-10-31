"use client";

import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowUpDown, Check, ChevronDown, Search, SlidersHorizontal } from "lucide-react";
import { Chip } from "@/components/ui/Chip";
import { CATEGORIES, FAMILIES, SIZES, SORTS, toSearch, type ShopQuery } from "@/lib/catalogue";
import { money } from "@/lib/format";
import type { Section } from "@/lib/types";

const label = { fontSize: 12, textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--lux-ink-muted)", marginBottom: 10 } as const;

type Props = {
  query: ShopQuery;
  sections: Section[];
  bounds: { lo: number; hi: number };
  hasSale: boolean;
  children: ReactNode; // the results, rendered on the server
};

/** Search, sort, chips and the filter rail. All state lives in the URL, so every view is shareable. */
export function ShopControls({ query, sections, bounds, hasSale, children }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();
  const [draft, setDraft] = useState(query.q);
  const [maxDraft, setMaxDraft] = useState(query.max ?? bounds.hi);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const go = (next: Partial<ShopQuery>) => {
    const merged = { ...query, ...next };
    startTransition(() => router.replace(`${pathname}${toSearch(merged)}`, { scroll: false }));
  };

  const debounced = (next: Partial<ShopQuery>) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => go(next), 300);
  };
  useEffect(() => () => clearTimeout(timer.current), []);

  useEffect(() => {
    if (!sortOpen) return;
    const away = (e: PointerEvent) => { if (sortRef.current && !sortRef.current.contains(e.target as Node)) setSortOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setSortOpen(false); };
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("pointerdown", away); document.removeEventListener("keydown", esc); };
  }, [sortOpen]);

  const activeSec = sections.find((s) => s.id === query.section);
  const sortLabel = SORTS.find((o) => o.v === query.sort)?.label ?? "Popularity";
  const maxShown = query.max ?? bounds.hi;
  const cats = ["", ...(hasSale ? ["On Sale"] : []), ...CATEGORIES];

  const setSize = (size: string) => { setMaxDraft(bounds.hi); go({ size, max: null }); };
  const toggleFam = (f: string) => go({ families: query.families.includes(f) ? query.families.filter((x) => x !== f) : [...query.families, f] });
  const clearAll = () => { setDraft(""); setMaxDraft(bounds.hi); go({ category: "", section: "", sub: "", q: "", size: "", max: null, families: [], inStock: false, best: false }); };

  const pill = (on: boolean) => ({ padding: "7px 0", borderRadius: 9, fontSize: 13, fontWeight: 500, cursor: "pointer", border: on ? "1px solid var(--lux-gold)" : "1px solid var(--lux-line)", background: on ? "var(--lux-gold-soft)" : "transparent", color: on ? "var(--lux-gold)" : "var(--lux-ink-muted)" }) as const;
  const check = { accentColor: "var(--lux-gold)", width: 15, height: 15 } as const;

  return (
    <>
      {sections.length > 0 && (
        <div className="flex flex-col gap-2.5 pb-4">
          <div className="flex flex-wrap items-center gap-2.5">
            <span style={{ ...label, margin: "0 6px 0 0" }}>Collections</span>
            <Chip active={!query.section} onClick={() => go({ section: "", sub: "" })}>All</Chip>
            {sections.map((s) => <Chip key={s.id} active={query.section === s.id} onClick={() => go({ section: s.id, sub: "", category: "" })}>{s.name}</Chip>)}
          </div>
          {activeSec && activeSec.children.length > 0 && (
            <div className="flex flex-wrap items-center gap-2.5">
              <span style={{ ...label, margin: "0 6px 0 0" }}>{activeSec.name}</span>
              <Chip active={!query.sub} onClick={() => go({ sub: "" })}>All</Chip>
              {activeSec.children.map((c) => <Chip key={c.id} active={query.sub === c.id} onClick={() => go({ sub: c.id })}>{c.name}</Chip>)}
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2.5 pb-4">
        <span style={{ ...label, margin: "0 6px 0 0" }}>Category</span>
        {cats.map((c) => <Chip key={c || "all"} active={query.category === c} onClick={() => go(c ? { category: c, section: "", sub: "" } : { category: "" })}>{c || "All"}</Chip>)}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="lux-glass flex h-12 items-center gap-2.5 rounded-full px-[18px]" style={{ flex: "1 1 260px" }}>
          <Search size={18} color="var(--lux-gold)" />
          <input
            value={draft}
            onChange={(e) => { setDraft(e.target.value); debounced({ q: e.target.value.trim() }); }}
            placeholder="Search your favourite fragrance"
            aria-label="Search products"
            style={{ flex: 1, border: "none", background: "transparent", color: "var(--lux-ink)", outline: "none", fontSize: 15 }}
          />
        </label>

        <div ref={sortRef} className="relative">
          <button type="button" className="lux-glass lux-focus flex h-12 items-center gap-2.5 rounded-full px-[18px]" onClick={() => setSortOpen((o) => !o)} aria-haspopup="listbox" aria-expanded={sortOpen} aria-label={`Sort by: ${sortLabel}`} style={{ color: "var(--lux-ink)", fontSize: 14, cursor: "pointer" }}>
            <ArrowUpDown size={16} color="var(--lux-gold)" />
            <span style={{ color: "var(--lux-ink-muted)" }}>Sort</span>
            <span style={{ fontWeight: 600 }}>{sortLabel}</span>
            <ChevronDown size={14} color="var(--lux-ink-muted)" style={{ transform: sortOpen ? "rotate(180deg)" : "none", transition: "transform var(--dur-mid) var(--ease-lux)" }} />
          </button>
          {sortOpen && (
            <div role="listbox" aria-label="Sort by" className="lux-surface flex flex-col gap-0.5" style={{ position: "absolute", top: 56, left: 0, minWidth: 268, borderRadius: 16, padding: 8, zIndex: 40, boxShadow: "0 24px 60px rgba(0,0,0,0.32)" }}>
              <div style={{ ...label, margin: "6px 10px 8px" }}>Sort by</div>
              {SORTS.map((o) => {
                const on = o.v === query.sort;
                return (
                  <button key={o.v} role="option" aria-selected={on} onClick={() => { go({ sort: o.v }); setSortOpen(false); }} className="flex min-h-12 items-center gap-3 px-3 text-left hover:bg-[var(--lux-gold-soft)]" style={{ borderRadius: 11, border: "none", background: on ? "var(--lux-gold-soft)" : "transparent", cursor: "pointer" }}>
                    <span className="inline-flex w-4 justify-center" style={{ color: "var(--lux-gold)" }}>{on && <Check size={15} />}</span>
                    <span className="flex flex-col gap-0.5">
                      <span style={{ fontSize: 14, color: "var(--lux-ink)", fontWeight: on ? 600 : 400 }}>{o.label}</span>
                      <span style={{ fontSize: 11.5, color: "var(--lux-ink-muted)", letterSpacing: "0.04em" }}>{o.hint}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <button type="button" className="lux-glass lux-focus flex h-12 items-center gap-2 rounded-full px-5 lg:hidden" onClick={() => setFiltersOpen((o) => !o)} aria-expanded={filtersOpen} style={{ color: "var(--lux-ink)", cursor: "pointer" }}>
          <SlidersHorizontal size={17} /> <span>{filtersOpen ? "Hide" : "Filters"}</span>
        </button>
      </div>

      <div className="mt-6 grid items-start gap-5 lg:grid-cols-[232px_1fr] lg:gap-7">
      <aside className={`lux-surface flex-col gap-6 p-[22px] lg:sticky lg:top-24 lg:flex ${filtersOpen ? "flex" : "hidden"}`} style={{ borderRadius: 18 }} aria-label="Filters">
        <div>
          <div style={label}>Price by size</div>
          <div role="group" aria-label="Size for price filter" className="mb-3.5 grid grid-cols-3 gap-1.5">
            {["", ...SIZES].map((sz) => <button key={sz || "all"} type="button" onClick={() => setSize(sz)} aria-pressed={query.size === sz} style={pill(query.size === sz)}>{sz || "All"}</button>)}
          </div>
          <input
            type="range"
            aria-label={query.size ? `Maximum price for ${query.size}` : "Maximum starting price"}
            min={bounds.lo} max={bounds.hi} step={50}
            value={Math.min(Math.max(maxDraft, bounds.lo), bounds.hi)}
            onChange={(e) => { const v = +e.target.value; setMaxDraft(v); debounced({ max: v >= bounds.hi ? null : v }); }}
            style={{ width: "100%", accentColor: "var(--lux-gold)" }}
          />
          <div className="mt-1.5 flex justify-between" style={{ fontSize: 13, color: "var(--lux-ink-muted)" }}>
            <span>{money(bounds.lo)}</span>
            <span style={{ color: "var(--lux-gold)", fontWeight: 600 }}>&le; {money(query.max ? maxShown : maxDraft)}</span>
          </div>
        </div>
        <div>
          <div style={label}>Scent family</div>
          <div className="flex flex-col gap-2">
            {FAMILIES.map((f) => (
              <label key={f} className="flex cursor-pointer items-center gap-[9px]" style={{ fontSize: 13, color: "var(--lux-ink)" }}>
                <input type="checkbox" checked={query.families.includes(f)} onChange={() => toggleFam(f)} style={check} /> {f}
              </label>
            ))}
          </div>
        </div>
        <label className="flex cursor-pointer items-center gap-[9px]" style={{ fontSize: 13, color: "var(--lux-ink)" }}>
          <input type="checkbox" checked={query.inStock} onChange={(e) => go({ inStock: e.target.checked })} style={check} /> In stock only
        </label>
        <button type="button" onClick={clearAll} style={{ border: "none", background: "transparent", color: "var(--lux-gold)", fontSize: 13, cursor: "pointer", textAlign: "left", padding: 0 }}>Clear all filters</button>
      </aside>
      <div>{children}</div>
      </div>
    </>
  );
}
