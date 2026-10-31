import { PageHead } from "@/components/admin/ui";
import { SectionsManager } from "@/components/admin/SectionsManager";
import { db } from "@/lib/db";
import { getSiteContent } from "@/lib/data";
import { requireStaffPage } from "@/lib/server/staff-session";

export default async function SectionsPage() {
  await requireStaffPage("owner");
  const [rows, counts, subCounts, content] = await Promise.all([
    db.section.findMany({ orderBy: { sortOrder: "asc" }, include: { subsections: { orderBy: { sortOrder: "asc" } } } }),
    db.product.groupBy({ by: ["sectionId"], _count: true }),
    db.product.groupBy({ by: ["subsectionId"], _count: true }),
    getSiteContent(),
  ]);
  return (
    <>
      <PageHead title="Sections" />
      <SectionsManager
        meta={content.sectionsMeta}
        sections={rows.map((s) => ({
          id: s.id, name: s.name, blurb: s.blurb, image: s.image, visible: s.visible, showSpecs: s.showSpecs,
          products: counts.find((c) => c.sectionId === s.id)?._count ?? 0,
          children: s.subsections.map((c) => ({ id: c.id, name: c.name, products: subCounts.find((x) => x.subsectionId === c.id)?._count ?? 0 })),
        }))}
      />
    </>
  );
}

// Signed-in staff only, so never an instant navigation (see the panel layout).
export const instant = false;
