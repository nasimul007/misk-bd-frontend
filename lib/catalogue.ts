import type { PricedProduct, Section } from "@/lib/types";
import { UNITS } from "@/lib/units";

export const CATEGORIES = ["Men's Perfume", "Women's Perfume", "Unisex", "Cologne", "Premium"] as const;
export const FAMILIES = ["Oud & Amber", "Rose & Musk", "Woods & Incense", "Citrus & Leather", "White Florals"] as const;
export const SORTS = [
  { v: "popular", label: "Popularity", hint: "Best selling first" },
  { v: "newest", label: "Newest", hint: "Latest arrivals" },
  { v: "price-asc", label: "Price: low to high", hint: "Gentlest first" },
  { v: "price-desc", label: "Price: high to low", hint: "Rarest first" },
] as const;

export type SortKey = (typeof SORTS)[number]["v"];

/** Everything the shop page can be filtered by; all of it lives in the URL. */
export type ShopQuery = {
  category: string;
  section: string;
  sub: string;
  q: string;
  sort: SortKey;
  unit: string; // "" = any unit
  size: string; // "" = any option label
  max: number | null; // max price at the chosen size
  families: string[];
  inStock: boolean;
  best: boolean; // best sellers only
};

type Raw = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

/** What the shop can currently be filtered by size/unit with, taken from the products themselves. */
export type Facets = { units: { id: string; tab: string }[]; options: Record<string, string[]> };

const amountOf = (l: string) => Number(/[\d.]+/.exec(l)?.[0] ?? NaN);

export function facetsOf(all: PricedProduct[]): Facets {
  const units = UNITS.filter((u) => all.some((p) => p.unit === u.id)).map((u) => ({ id: u.id, tab: u.tab }));
  const options: Record<string, string[]> = {};
  for (const u of units) {
    const labels = new Set<string>();
    for (const p of all) if (p.unit === u.id) for (const v of p.variants) labels.add(v.size);
    options[u.id] = [...labels].sort((a, b) => (amountOf(a) - amountOf(b)) || a.localeCompare(b));
  }
  return { units, options };
}

export function parseQuery(raw: Raw, sections: Section[], facets: Facets): ShopQuery {
  const section = sections.find((s) => s.id === one(raw.section));
  const sub = section?.children.find((c) => c.id === one(raw.sub));
  const category = one(raw.category);
  const sort = one(raw.sort);
  const unit = one(raw.unit);
  const size = one(raw.size);
  const max = Number(one(raw.max));
  const fam = one(raw.fam);
  return {
    category: category === "On Sale" || (CATEGORIES as readonly string[]).includes(category) ? category : "",
    section: section?.id ?? "",
    sub: sub?.id ?? "",
    q: one(raw.q).slice(0, 80),
    sort: SORTS.some((s) => s.v === sort) ? (sort as SortKey) : "popular",
    unit: facets.units.some((u) => u.id === unit) ? unit : "",
    size: Object.values(facets.options).some((o) => o.includes(size)) ? size : "",
    max: Number.isFinite(max) && max > 0 ? max : null,
    families: fam ? fam.split(",").filter((f) => (FAMILIES as readonly string[]).includes(f)) : [],
    inStock: one(raw.stock) === "1",
    best: one(raw.best) === "1",
  };
}

/** Serialise a query back to a URL search string, omitting defaults. */
export function toSearch(q: Partial<ShopQuery>): string {
  const p = new URLSearchParams();
  if (q.section) p.set("section", q.section);
  if (q.sub) p.set("sub", q.sub);
  if (q.category) p.set("category", q.category);
  if (q.q) p.set("q", q.q);
  if (q.sort && q.sort !== "popular") p.set("sort", q.sort);
  if (q.unit) p.set("unit", q.unit);
  if (q.size) p.set("size", q.size);
  if (q.max) p.set("max", String(q.max));
  if (q.families?.length) p.set("fam", q.families.join(","));
  if (q.inStock) p.set("stock", "1");
  if (q.best) p.set("best", "1");
  const s = p.toString();
  return s ? `?${s}` : "";
}

/** Price used for filtering and sorting: the chosen size, or each product's lowest price. */
export const priceAt = (p: PricedProduct, size: string) =>
  size ? (p.variants.find((v) => v.size === size)?.price ?? Infinity) : p.card.price;

export function filterProducts(all: PricedProduct[], q: ShopQuery): PricedProduct[] {
  const needle = q.q.toLowerCase();
  const list = all.filter((p) => {
    const inCat =
      !q.category ||
      (q.category === "On Sale" ? p.onSale : q.category === "Premium" ? p.tags.includes("premium") : q.category === "Cologne" ? p.tags.includes("cologne") : p.category === q.category);
    const inQ = !needle || p.title.toLowerCase().includes(needle) || p.family.toLowerCase().includes(needle);
    const inUnit = !q.unit || p.unit === q.unit;
    const inSize = !q.size || p.variants.some((v) => v.size === q.size);
    const inPrice = q.max === null || priceAt(p, q.size) <= q.max;
    return (
      inCat && inQ && inUnit && inSize && inPrice &&
      (!q.inStock || p.stock > 0) &&
      (q.families.length === 0 || q.families.includes(p.family)) &&
      (!q.best || p.bestseller) &&
      (!q.section || (p.section === q.section && (!q.sub || p.sub === q.sub)))
    );
  });
  const by: Record<SortKey, (a: PricedProduct, b: PricedProduct) => number> = {
    popular: (a, b) => (b.sold - a.sold) || (b.reviews - a.reviews) || (b.added - a.added),
    newest: (a, b) => b.added - a.added,
    "price-asc": (a, b) => priceAt(a, q.size) - priceAt(b, q.size),
    "price-desc": (a, b) => priceAt(b, q.size) - priceAt(a, q.size),
  };
  return [...list].sort(by[q.sort]);
}

/** Slider bounds (rounded to ৳50) for the products that can show at the chosen size. */
export function priceBounds(all: PricedProduct[], size: string, unit = "") {
  all = unit ? all.filter((p) => p.unit === unit) : all;
  const pool = all.filter((p) => !size || p.variants.some((v) => v.size === size));
  const prices = (pool.length ? pool : all).map((p) => priceAt(p, size));
  return { lo: Math.floor(Math.min(...prices) / 50) * 50, hi: Math.ceil(Math.max(...prices) / 50) * 50 };
}
