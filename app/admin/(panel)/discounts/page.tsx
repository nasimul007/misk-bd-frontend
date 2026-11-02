import { DiscountsManager } from "@/components/admin/DiscountsManager";
import { db } from "@/lib/db";
import { UNIT_IDS } from "@/lib/units";
import { requireStaffPage } from "@/lib/server/staff-session";

const day = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "");

export default async function DiscountsPage() {
  await requireStaffPage("owner");
  const [rows, products, variants] = await Promise.all([
    db.discount.findMany({ include: { targetProduct: { select: { slug: true, title: true } } }, orderBy: { createdAt: "desc" } }),
    db.product.findMany({ orderBy: { title: "asc" }, select: { slug: true, title: true } }),
    db.productVariant.findMany({ distinct: ["size"], select: { size: true, product: { select: { unit: true } } } }),
  ]);
  // Every option label in use, grouped by unit and smallest first: 1ml 3ml 6ml 12ml · 10g 50g · Pack of 10 …
  const amount = (l: string) => Number(/[\d.]+/.exec(l)?.[0] ?? NaN);
  const rank = (u: string) => UNIT_IDS.indexOf(u);
  const sizeOptions = [...variants]
    .sort((a, b) => (rank(a.product.unit) - rank(b.product.unit)) || (amount(a.size) - amount(b.size)) || a.size.localeCompare(b.size))
    .map((v) => v.size);
  return (
    <>
      <p style={{ margin: "0 0 20px", fontSize: 14, color: "var(--lux-ink-muted)", maxWidth: 640 }}>
        One discount applies per item and they never stack: a product rule beats a category rule, which beats a storewide rule; at the same level the bigger saving wins.
      </p>
      <DiscountsManager
        products={products}
        sizeOptions={sizeOptions}
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
