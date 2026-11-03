"use client";

import { useEffect, useState } from "react";
import { productsBySlugAction } from "@/app/actions/search";
import { ProductCard } from "@/components/ui/ProductCard";
import type { PricedProduct } from "@/lib/types";

const KEY = "misk_recent_v1";
const MAX = 10;

/** Remembers the products this browser has looked at, and shows the last few (not the one on screen). */
export function RecentlyViewed({ slug }: { slug: string }) {
  const [items, setItems] = useState<PricedProduct[]>([]);

  useEffect(() => {
    let seen: string[] = [];
    try { const raw = JSON.parse(localStorage.getItem(KEY) ?? "[]"); if (Array.isArray(raw)) seen = raw.filter((s): s is string => typeof s === "string"); } catch {}
    const others = seen.filter((s) => s !== slug);
    try { localStorage.setItem(KEY, JSON.stringify([slug, ...others].slice(0, MAX))); } catch {}
    if (others.length === 0) return;
    let live = true;
    productsBySlugAction(others.slice(0, 4)).then((p) => live && setItems(p)).catch(() => {});
    return () => { live = false; };
  }, [slug]);

  if (items.length === 0) return null;
  return (
    <section aria-labelledby="recent-h" style={{ marginTop: 56 }}>
      <h2 id="recent-h" className="font-display" style={{ fontSize: 24, fontWeight: 500, color: "var(--lux-ink)", marginBottom: 20 }}>Recently viewed</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 20 }}>
        {items.map((p) => <ProductCard key={p.id} product={p} />)}
      </div>
    </section>
  );
}
