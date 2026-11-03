"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { searchProductsAction, type SearchHit } from "@/app/actions/search";
import { useMoney } from "@/lib/currency";

const iconBtn = { width: 42, height: 42, borderRadius: "50%", background: "transparent", border: "none", color: "var(--lux-ink)", cursor: "pointer" } as const;

/**
 * Header search: a button that opens a panel under the header with a search field and live suggestions.
 * Enter (or "See all results") goes to the shop with the term; Escape or a click outside closes it.
 */
export function SearchBox() {
  const money = useMoney();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [searched, setSearched] = useState(false);
  const [active, setActive] = useState(-1);
  const wrap = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);

  const close = () => { setOpen(false); setActive(-1); };

  useEffect(() => { if (open) input.current?.focus(); }, [open]);

  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => { if (wrap.current && !wrap.current.contains(e.target as Node)) close(); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") { close(); } };
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("pointerdown", away); document.removeEventListener("keydown", esc); };
  }, [open]);

  // Suggestions, a moment after the shopper stops typing.
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) return;
    let live = true;
    const t = setTimeout(() => {
      searchProductsAction(term).then((r) => { if (live) { setHits(r); setSearched(true); setActive(-1); } }).catch(() => {});
    }, 180);
    return () => { live = false; clearTimeout(t); };
  }, [q]);

  const showResults = q.trim().length >= 2;
  const go = (term: string) => { close(); router.push(term ? `/shop?q=${encodeURIComponent(term)}` : "/shop"); };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(hits.length - 1, a + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(-1, a - 1)); }
    else if (e.key === "Enter") {
      e.preventDefault();
      if (active >= 0 && hits[active]) { close(); router.push(`/product/${hits[active].slug}`); } else go(q.trim());
    }
  };

  return (
    <div ref={wrap} className="inline-flex">
      <button type="button" className="inline-flex items-center justify-center lux-focus" style={iconBtn} aria-label={open ? "Close search" : "Search"} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        {open ? <X size={19} /> : <Search size={19} />}
      </button>
      {open && (
        <div role="search" style={{ position: "absolute", left: 0, right: 0, top: "100%", background: "var(--lux-bg-2)", borderTop: "1px solid var(--lux-line)", borderBottom: "1px solid var(--lux-line)", boxShadow: "0 24px 60px rgba(0,0,0,0.35)", zIndex: 45 }}>
          <div className="alignment" style={{ padding: "18px 24px 22px", maxWidth: 760 }}>
            <div className="flex items-center gap-3" style={{ borderBottom: "1px solid var(--lux-gold)", paddingBottom: 8 }}>
              <Search size={18} aria-hidden style={{ color: "var(--lux-gold)", flex: "none" }} />
              <input
                ref={input}
                type="search"
                aria-label="Search the shop"
                aria-controls="search-results"
                aria-activedescendant={active >= 0 ? `search-hit-${active}` : undefined}
                autoComplete="off"
                placeholder="Search for a fragrance, oud, bakhoor…"
                value={q}
                onChange={(e) => { setQ(e.target.value); if (e.target.value.trim().length < 2) { setHits([]); setSearched(false); } }}
                onKeyDown={onKey}
                style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "var(--lux-ink)", fontSize: 17 }}
              />
            </div>
            <div id="search-results" role="listbox" aria-label="Suggestions" aria-live="polite" style={{ marginTop: 10 }}>
              {showResults && searched && hits.length === 0 && <p style={{ margin: "10px 2px", fontSize: 14, color: "var(--lux-ink-muted)" }}>No matches for &ldquo;{q.trim()}&rdquo;. Try another word, or browse the shop.</p>}
              {showResults && hits.map((h, i) => (
                <Link key={h.slug} id={`search-hit-${i}`} role="option" aria-selected={i === active} href={`/product/${h.slug}`} onClick={close} className="flex items-center gap-3 lux-focus" style={{ padding: "8px 6px", borderRadius: 12, textDecoration: "none", color: "var(--lux-ink)", background: i === active ? "var(--lux-gold-soft)" : "transparent" }}>
                  <span style={{ position: "relative", width: 44, height: 44, flex: "none", borderRadius: 10, overflow: "hidden" }}><Image src={h.image} alt="" fill sizes="44px" style={{ objectFit: "cover" }} /></span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: "block", fontSize: 14.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{h.title}</span>
                    <span style={{ fontSize: 12.5, color: "var(--lux-ink-muted)" }}>{h.category}</span>
                  </span>
                  <span style={{ fontSize: 14, color: h.soldOut ? "var(--lux-danger)" : "var(--lux-gold)", fontWeight: 600 }}>{h.soldOut ? "Sold out" : `from ${money(h.price)}`}</span>
                </Link>
              ))}
              {showResults && <button type="button" onClick={() => go(q.trim())} className="lux-link lux-focus" style={{ background: "none", border: 0, padding: "10px 6px 0", cursor: "pointer", fontSize: 13.5 }}>See all results for &ldquo;{q.trim()}&rdquo;</button>}
              {!showResults && <p style={{ margin: "10px 2px 0", fontSize: 13, color: "var(--lux-ink-muted)" }}>Type at least two letters.</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
