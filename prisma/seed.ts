// Loads the prototype's catalogue into Postgres. Safe to re-run: sections and products are upserted by slug,
// and the discount list is replaced wholesale (it is seed-managed until the admin panel owns it).
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { discounts, products, siteContent } from "../lib/data/seed";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

async function main() {
  const sectionIds = new Map<string, string>();

  for (const [i, s] of siteContent.sections.entries()) {
    const row = await db.section.upsert({
      where: { slug: s.id },
      update: { name: s.name, blurb: s.blurb, image: s.image, sortOrder: i },
      create: { slug: s.id, name: s.name, blurb: s.blurb, image: s.image, sortOrder: i },
    });
    sectionIds.set(s.id, row.id);
    for (const [j, c] of s.children.entries()) {
      await db.subsection.upsert({
        where: { sectionId_slug: { sectionId: row.id, slug: c.id } },
        update: { name: c.name, sortOrder: j },
        create: { sectionId: row.id, slug: c.id, name: c.name, sortOrder: j },
      });
    }
  }

  const productIds = new Map<string, string>();
  const now = Date.now();
  for (const p of products) {
    const data = {
      title: p.title,
      titleAr: p.arabic,
      description: p.description,
      category: p.category,
      scentFamily: p.family,
      sectionId: sectionIds.get(p.section) ?? null,
      bestseller: !!p.bestseller,
      active: p.active,
      tags: p.tags,
      // Ratings come from real reviews now, so a fresh catalogue starts at none.
      ratingAvg: 0,
      reviewCount: 0,
      lastingHours: p.lasting,
      projection: p.projection,
      concentration: p.concentration,
      origin: p.origin,
      // `added` is "higher = newer"; keep that order by spacing created dates a day apart.
      createdAt: new Date(now - (products.length - p.added) * 86_400_000),
    };
    const row = await db.product.upsert({ where: { slug: p.id }, update: data, create: { slug: p.id, ...data } });
    productIds.set(p.id, row.id);

    await db.productVariant.deleteMany({ where: { productId: row.id } });
    await db.productVariant.createMany({ data: p.variants.map((v, position) => ({ productId: row.id, size: v.size, position, priceBdt: v.price, stock: v.stock })) });

    await db.productImage.deleteMany({ where: { productId: row.id } });
    // The prototype's gallery repeats an image; positions must be unique, so keep the first of each.
    const gallery = [...new Set(p.gallery)];
    await db.productImage.createMany({ data: gallery.map((url, position) => ({ productId: row.id, url, position })) });
  }

  await db.discount.deleteMany();
  for (const d of discounts) {
    await db.discount.create({
      data: {
        name: d.name,
        scope: d.scope,
        targetProductId: d.scope === "product" ? productIds.get(d.target) : null,
        targetCategory: d.scope === "category" ? d.target : null,
        type: d.type,
        value: d.value,
        sizes: d.sizes,
        startsOn: d.starts ? new Date(d.starts) : null,
        endsOn: d.ends ? new Date(d.ends) : null,
        active: d.active,
      },
    });
  }

  const [s, p, v, dc] = await Promise.all([db.section.count(), db.product.count(), db.productVariant.count(), db.discount.count()]);
  console.log(`Seeded: ${s} sections, ${p} products, ${v} variants, ${dc} discounts`);
}

main().finally(() => db.$disconnect());
