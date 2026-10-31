// Data-access layer. Pages import ONLY from here. Today it returns seed data;
// when the backend (Postgres/Prisma/Supabase/API) is chosen, swap these
// function bodies — the pages and components stay untouched.
import type { PricedProduct, Product, SiteContent } from "@/lib/types";
import { cardPrice, priceInfo } from "@/lib/pricing";
import { discounts, products, siteContent } from "./seed";

const priced = (p: Product): PricedProduct => ({
  ...p,
  card: cardPrice(p, discounts),
  onSale: p.variants.some((v) => priceInfo(p, v.size, discounts).saving > 0),
  sizes: p.variants.map((v) => priceInfo(p, v.size, discounts)),
});

export async function getSiteContent(): Promise<SiteContent> {
  return siteContent;
}

export async function getProducts(): Promise<PricedProduct[]> {
  return products.filter((p) => p.active).map(priced);
}

export async function getProduct(slug: string): Promise<PricedProduct | undefined> {
  const p = products.find((x) => x.id === slug && x.active);
  return p && priced(p);
}

export async function getProductSlugs(): Promise<string[]> {
  return products.filter((p) => p.active).map((p) => p.id);
}

export async function getBestSellers(limit = 4): Promise<PricedProduct[]> {
  return (await getProducts()).slice(0, limit);
}

/** Same section first, then anything else; never the product itself. */
export async function getRelated(slug: string, limit = 4): Promise<PricedProduct[]> {
  const all = await getProducts();
  const me = all.find((p) => p.id === slug);
  const others = all.filter((p) => p.id !== slug);
  const same = me ? others.filter((p) => p.section === me.section) : [];
  const rest = others.filter((p) => !same.includes(p));
  return [...same, ...rest].slice(0, limit);
}
