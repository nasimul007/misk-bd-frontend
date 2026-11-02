import { notFound } from "next/navigation";
import { PageHead } from "@/components/admin/ui";
import { ProductForm } from "@/components/admin/ProductForm";
import { db } from "@/lib/db";
import { requireStaffPage } from "@/lib/server/staff-session";

export default async function EditProduct({ params }: PageProps<"/admin/products/[slug]">) {
  await requireStaffPage("owner");
  const { slug } = await params;
  const [p, sections] = await Promise.all([
    db.product.findUnique({ where: { slug }, include: { variants: { orderBy: [{ position: "asc" }, { priceBdt: "asc" }] }, images: { orderBy: { position: "asc" } }, section: { select: { slug: true } }, subsection: { select: { slug: true } } } }),
    db.section.findMany({ orderBy: { sortOrder: "asc" }, select: { slug: true, name: true, subsections: { orderBy: { sortOrder: "asc" }, select: { slug: true, name: true } } } }),
  ]);
  if (!p) notFound();
  return (
    <>
      <PageHead title={p.title} />
      <ProductForm
        sections={sections.map((x) => ({ slug: x.slug, name: x.name, children: x.subsections }))}
        initial={{
          slug: p.slug, unit: p.unit, title: p.title, titleAr: p.titleAr ?? "", description: p.description, category: p.category, scentFamily: p.scentFamily ?? "",
          sectionSlug: p.section?.slug ?? "", subsectionSlug: p.subsection?.slug ?? "", bestseller: p.bestseller, active: p.active, tags: p.tags.join(", "),
          lastingHours: p.lastingHours === null ? "" : String(p.lastingHours), projection: p.projection ?? "", concentration: p.concentration ?? "", origin: p.origin ?? "",
          variants: p.variants.map((v) => ({ size: v.size, price: String(v.priceBdt), stock: String(v.stock) })), images: p.images.map((i) => i.url),
        }}
      />
    </>
  );
}

// Signed-in staff only, so never an instant navigation (see the panel layout).
export const instant = false;
