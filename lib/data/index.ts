// Data-access layer. Pages import ONLY from here, and everything is read from Postgres via Prisma.
// Reads are cached (`use cache`) and tagged "catalogue"; the admin panel will call
// revalidateTag("catalogue") after a change so the storefront updates without a redeploy.
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/lib/db";
import { discountArgs, productArgs, toDiscount, toProduct } from "./mappers";
import { cardPrice, priceInfo } from "@/lib/pricing";
import type { Discount, PricedProduct, Product, Section, SiteContent } from "@/lib/types";
import { siteContent } from "./seed";

const priced = (p: Product, discounts: Discount[]): PricedProduct => ({
  ...p,
  card: cardPrice(p, discounts),
  onSale: p.variants.some((v) => priceInfo(p, v.size, discounts).saving > 0),
  sizes: p.variants.map((v) => priceInfo(p, v.size, discounts)),
});

async function loadDiscounts(): Promise<Discount[]> {
  return (await db.discount.findMany({ ...discountArgs, orderBy: { createdAt: "asc" } })).map(toDiscount);
}

export async function getSiteContent(): Promise<SiteContent> {
  "use cache";
  cacheLife("minutes");
  cacheTag("catalogue");

  const rows = await db.section.findMany({
    where: { visible: true },
    include: { subsections: { orderBy: { sortOrder: "asc" } } },
    orderBy: { sortOrder: "asc" },
  });
  const sections: Section[] = rows.map((s) => ({
    id: s.slug,
    name: s.name,
    blurb: s.blurb,
    image: s.image,
    children: s.subsections.map((c) => ({ id: c.slug, name: c.name })),
  }));
  // Hero, testimonials, footer etc. are still code-defined until the admin panel manages them.
  return { ...siteContent, sections };
}

export async function getProducts(): Promise<PricedProduct[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("catalogue");

  const [rows, discounts] = await Promise.all([
    db.product.findMany({ where: { active: true }, ...productArgs, orderBy: { createdAt: "desc" } }),
    loadDiscounts(),
  ]);
  return rows.map((r) => priced(toProduct(r), discounts));
}

export async function getProduct(slug: string): Promise<PricedProduct | undefined> {
  "use cache";
  cacheLife("minutes");
  cacheTag("catalogue");

  const [row, discounts] = await Promise.all([
    db.product.findFirst({ where: { slug, active: true }, ...productArgs }),
    loadDiscounts(),
  ]);
  return row ? priced(toProduct(row), discounts) : undefined;
}

export async function getProductSlugs(): Promise<string[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("catalogue");

  const rows = await db.product.findMany({ where: { active: true }, select: { slug: true }, orderBy: { createdAt: "desc" } });
  return rows.map((r) => r.slug);
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
