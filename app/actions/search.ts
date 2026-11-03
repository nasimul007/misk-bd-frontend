"use server";

import { getProducts } from "@/lib/data";
import type { PricedProduct } from "@/lib/types";

export type SearchHit = { slug: string; title: string; image: string; price: number; category: string; soldOut: boolean };

/** Quick product suggestions for the header search. Public catalogue data only. */
export async function searchProductsAction(query: unknown): Promise<SearchHit[]> {
  const q = typeof query === "string" ? query.trim().toLowerCase().slice(0, 60) : "";
  if (q.length < 2) return [];
  const score = (p: PricedProduct) => {
    const t = p.title.toLowerCase();
    if (t.startsWith(q)) return 0;
    if (t.includes(q)) return 1;
    if (p.family.toLowerCase().includes(q) || p.category.toLowerCase().includes(q) || p.tags.some((x) => x.includes(q))) return 2;
    return 3;
  };
  return (await getProducts())
    .map((p) => [score(p), p] as const)
    .filter(([s]) => s < 3)
    .sort((a, b) => a[0] - b[0])
    .slice(0, 6)
    .map(([, p]) => ({ slug: p.id, title: p.title, image: p.image, price: p.card.price, category: p.category, soldOut: p.stock <= 0 }));
}

/** Products by slug, in the order given. Used by "Recently viewed". */
export async function productsBySlugAction(slugs: unknown): Promise<PricedProduct[]> {
  if (!Array.isArray(slugs)) return [];
  const want = slugs.filter((s): s is string => typeof s === "string" && /^[a-z0-9-]{1,120}$/.test(s)).slice(0, 12);
  const byId = new Map((await getProducts()).map((p) => [p.id, p]));
  return want.map((s) => byId.get(s)).filter((p): p is PricedProduct => !!p);
}
