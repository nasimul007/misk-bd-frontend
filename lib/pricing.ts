import type { CardPrice, Discount, PriceInfo, Product } from "@/lib/types";

const RANK = { product: 3, category: 2, all: 1 } as const;

const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

// Only reads the clock when a rule is actually date-bound, so undated rules stay prerenderable.
const isLive = (d: Discount) => {
  if (!d.active) return false;
  if (!d.starts && !d.ends) return true;
  const t = todayISO();
  return !(d.starts && d.starts > t) && !(d.ends && d.ends < t);
};

const matches = (d: Discount, p: Product) =>
  d.scope === "all" ||
  (d.scope === "product" && d.target === p.id) ||
  (d.scope === "category" && (p.category === d.target || p.tags.includes(d.target.toLowerCase())));

const cutFor = (d: Discount, base: number) =>
  d.type === "percent"
    ? Math.round((base * Math.min(Math.max(d.value || 0, 0), 95)) / 100)
    : Math.min(Math.max(d.value || 0, 0), base);

/** Price of one size after the best live discount. */
export function priceInfo(p: Product, size: string | null | undefined, discounts: Discount[]): PriceInfo {
  const variant = p.variants.find((v) => v.size === size) ?? p.variants[0];
  const original = variant.price;
  let best: Discount | null = null;
  let bestCut = 0;
  for (const d of discounts) {
    if (!isLive(d) || !matches(d, p) || (d.sizes.length && !d.sizes.includes(variant.size))) continue;
    const c = cutFor(d, original);
    if (c <= 0) continue;
    if (!best || RANK[d.scope] > RANK[best.scope] || (RANK[d.scope] === RANK[best.scope] && c > bestCut)) {
      best = d;
      bestCut = c;
    }
  }
  return { size: variant.size, original, price: original - bestCut, saving: bestCut, pct: original ? Math.round((bestCut / original) * 100) : 0, rule: best };
}

/** Lowest price, price range and sale label shown on a product card. */
export function cardPrice(p: Product, discounts: Discount[]): CardPrice {
  const infos = p.variants.map((v) => priceInfo(p, v.size, discounts));
  const lo = infos.reduce((a, b) => (b.price < a.price ? b : a));
  const maxPct = Math.max(...infos.map((i) => i.pct));
  const same = infos.every((i) => i.pct === maxPct);
  return {
    price: lo.price,
    maxPrice: Math.max(...infos.map((i) => i.price)),
    compareAt: lo.saving ? lo.original : undefined,
    discountLabel: maxPct ? (same ? `−${maxPct}%` : `Up to −${maxPct}%`) : undefined,
  };
}
