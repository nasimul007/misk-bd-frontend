import { PageHead } from "@/components/admin/ui";
import { ProductForm } from "@/components/admin/ProductForm";
import { db } from "@/lib/db";
import { requireStaffPage } from "@/lib/server/staff-session";

export default async function NewProduct() {
  await requireStaffPage("owner");
  const sections = await db.section.findMany({ orderBy: { sortOrder: "asc" }, select: { slug: true, name: true, subsections: { orderBy: { sortOrder: "asc" }, select: { slug: true, name: true } } } });
  return (
    <>
      <PageHead title="Add product" />
      <ProductForm
        sections={sections.map((x) => ({ slug: x.slug, name: x.name, children: x.subsections }))}
        initial={{ slug: null, unit: "ml", title: "", titleAr: "", description: "", category: "", scentFamily: "", sectionSlug: "", subsectionSlug: "", stock: "0", bestseller: false, active: true, tags: "", lastingHours: "", projection: "", concentration: "", origin: "", variants: [], images: [] }}
      />
    </>
  );
}

// Signed-in staff only, so never an instant navigation (see the panel layout).
export const instant = false;
