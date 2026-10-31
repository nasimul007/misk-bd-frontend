// Data-access layer. Pages import ONLY from here, and everything is read from Postgres via Prisma.
// Reads are cached (`use cache`) and tagged "catalogue"; the admin panel will call
// revalidateTag("catalogue") after a change so the storefront updates without a redeploy.
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/lib/db";
import { cardPrice, priceInfo } from "@/lib/pricing";
import type { Discount, PricedProduct, Product, Section, SiteContent } from "@/lib/types";
import { siteContent } from "./seed";

const productArgs = {
  include: {
    variants: { orderBy: { priceBdt: "asc" } },
    images: { orderBy: { position: "asc" } },
    section: { select: { slug: true } },
    subsection: { select: { slug: true } },
  },
} as const;

const discountArgs = { include: { targetProduct: { select: { slug: true } } } } as const;

type ProductRow = Awaited<ReturnType<typeof db.product.findFirstOrThrow<typeof productArgs>>>;
type DiscountRow = Awaited<ReturnType<typeof db.discount.findFirstOrThrow<typeof discountArgs>>>;

const day = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "");

const toDiscount = (d: DiscountRow): Discount => ({
  id: d.id,
  name: d.name,
  scope: d.scope,
  target: d.scope === "product" ? (d.targetProduct?.slug ?? "") : (d.targetCategory ?? ""),
  type: d.type,
  value: Number(d.value),
  sizes: d.sizes,
  starts: day(d.startsOn),
  ends: day(d.endsOn),
  active: d.active,
});

const toProduct = (p: ProductRow): Product => {
  const gallery = p.images.map((i) => i.url);
  const prices = p.variants.map((v) => v.priceBdt);
  return {
    id: p.slug,
    title: p.title,
    arabic: p.titleAr ?? "",
    image: gallery[0] ?? "",
    hover: gallery[1] ?? gallery[0] ?? "",
    price: prices.length ? Math.min(...prices) : 0,
    maxPrice: prices.length ? Math.max(...prices) : 0,
    category: p.category,
    family: p.scentFamily ?? "",
    tags: p.tags,
    bestseller: p.bestseller,
    stock: p.stock,
    description: p.description,
    lasting: p.lastingHours ?? 0,
    projection: p.projection ?? "",
    concentration: p.concentration ?? "",
    origin: p.origin ?? "",
    rating: Number(p.ratingAvg),
    reviews: p.reviewCount,
    variants: p.variants.map((v) => ({ size: v.size, price: v.priceBdt })),
    active: p.active,
    section: p.section?.slug ?? "",
    sub: p.subsection?.slug ?? "",
    added: p.createdAt.getTime(),
    gallery,
  };
};

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
