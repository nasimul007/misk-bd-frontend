import { PageHead } from "@/components/admin/ui";
import { ProductForm } from "@/components/admin/ProductForm";
import { db } from "@/lib/db";
import { requireStaffPage } from "@/lib/server/staff-session";

export default async function NewProduct() {
  await requireStaffPage();
  const sections = await db.section.findMany({ orderBy: { sortOrder: "asc" }, select: { slug: true, name: true } });
  return (
    <>
      <PageHead title="Add product" />
      <ProductForm
        sections={sections}
        initial={{ slug: null, title: "", titleAr: "", description: "", category: "", scentFamily: "", sectionSlug: "", stock: "0", bestseller: false, active: true, tags: "", lastingHours: "", projection: "", concentration: "", origin: "", variants: [{ size: "6ml", price: "" }], images: [] }}
      />
    </>
  );
}

// Signed-in staff only, so never an instant navigation (see the panel layout).
export const instant = false;
