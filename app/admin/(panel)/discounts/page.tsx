import { PageHead } from "@/components/admin/ui";
import { DiscountsManager } from "@/components/admin/DiscountsManager";
import { db } from "@/lib/db";
import { requireStaffPage } from "@/lib/server/staff-session";

const day = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "");

export default async function DiscountsPage() {
  await requireStaffPage();
  const [rows, products] = await Promise.all([
    db.discount.findMany({ include: { targetProduct: { select: { slug: true, title: true } } }, orderBy: { createdAt: "desc" } }),
    db.product.findMany({ orderBy: { title: "asc" }, select: { slug: true, title: true } }),
  ]);
  return (
    <>
      <PageHead title="Discounts" />
      <p style={{ margin: "-10px 0 20px", fontSize: 14, color: "var(--lux-ink-muted)", maxWidth: 640 }}>
        One discount applies per item and they never stack: a product rule beats a category rule, which beats a storewide rule; at the same level the bigger saving wins.
      </p>
      <DiscountsManager
        products={products}
        rows={rows.map((d) => ({
          id: d.id, name: d.name, scope: d.scope, type: d.type, value: Number(d.value), sizes: d.sizes, active: d.active,
          target: d.scope === "product" ? (d.targetProduct?.slug ?? "") : (d.targetCategory ?? ""),
          targetLabel: d.targetProduct?.title ?? "",
          startsOn: day(d.startsOn), endsOn: day(d.endsOn),
        }))}
      />
    </>
  );
}

// Signed-in staff only, so never an instant navigation (see the panel layout).
export const instant = false;
