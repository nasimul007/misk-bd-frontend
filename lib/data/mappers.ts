// Database rows to the app's Product and Discount types. Shared by the cached storefront reads and
// by server-side order creation, so a price is computed the same way in both places.
import type { Prisma } from "@/generated/prisma/client";
import type { Discount, Product } from "@/lib/types";

// Options show in the order the admin set; price only breaks ties.
const variantOrder: Prisma.ProductVariantOrderByWithRelationInput[] = [{ position: "asc" }, { priceBdt: "asc" }];

export const productArgs = {
  include: {
    variants: { orderBy: variantOrder },
    images: { orderBy: { position: "asc" } },
    section: { select: { slug: true } },
    subsection: { select: { slug: true } },
  },
} as const;

export const discountArgs = { include: { targetProduct: { select: { slug: true } } } } as const;

type ProductRow = Prisma.ProductGetPayload<typeof productArgs>;
type DiscountRow = Prisma.DiscountGetPayload<typeof discountArgs>;

const day = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "");

export const toDiscount = (d: DiscountRow): Discount => ({
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

/** Shown for a product that has no photo yet, so a card never renders an empty image address. */
export const PLACEHOLDER_IMAGE = "/images/placeholder.svg";

export const toProduct = (p: ProductRow): Product => {
  const gallery = p.images.length ? p.images.map((i) => i.url) : [PLACEHOLDER_IMAGE];
  const prices = p.variants.map((v) => v.priceBdt);
  return {
    id: p.slug,
    unit: p.unit,
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
    stock: p.variants.reduce((n, v) => n + v.stock, 0),
    description: p.description,
    lasting: p.lastingHours ?? 0,
    projection: p.projection ?? "",
    concentration: p.concentration ?? "",
    origin: p.origin ?? "",
    rating: Number(p.ratingAvg),
    reviews: p.reviewCount,
    sold: p.soldCount,
    variants: p.variants.map((v) => ({ size: v.size, price: v.priceBdt, stock: v.stock })),
    active: p.active,
    section: p.section?.slug ?? "",
    sub: p.subsection?.slug ?? "",
    added: p.createdAt.getTime(),
    gallery,
  };
};
