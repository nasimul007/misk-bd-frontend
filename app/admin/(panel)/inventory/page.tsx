import { InventoryManager } from "@/components/admin/InventoryManager";
import { Panel, TableWrap, dateTime, td, th } from "@/components/admin/ui";
import { db } from "@/lib/db";
import { requireStaffPage } from "@/lib/server/staff-session";

export default async function InventoryPage() {
  await requireStaffPage();
  const [options, log] = await Promise.all([
    db.productVariant.findMany({
      orderBy: [{ product: { active: "desc" } }, { product: { title: "asc" } }, { position: "asc" }],
      select: { size: true, stock: true, product: { select: { slug: true, title: true, active: true, images: { orderBy: { position: "asc" }, take: 1, select: { url: true } }, _count: { select: { variants: true } } } } },
    }),
    db.inventoryAdjustment.findMany({ orderBy: { at: "desc" }, take: 100, include: { product: { select: { title: true } } } }),
  ]);
  return (
    <>
      <InventoryManager rows={options.map((o) => ({ slug: o.product.slug, title: o.product.title, size: o.size, single: o.product._count.variants === 1, stock: o.stock, active: o.product.active, image: o.product.images[0]?.url ?? "" }))} />
      <h3 className="font-display" style={{ fontSize: 17, fontWeight: 500, margin: "28px 0 12px" }}>Adjustment history</h3>
      <Panel>
        {log.length === 0 ? <p style={{ margin: 0, color: "var(--lux-ink-muted)" }}>No stock changes yet.</p> : (
          <TableWrap>
            <thead><tr><th style={th}>Date</th><th style={th}>Product</th><th style={th}>Change</th><th style={th}>Stock after</th><th style={th}>Reason</th><th style={th}>By</th></tr></thead>
            <tbody>
              {log.map((l) => (
                <tr key={l.id}>
                  <td style={{ ...td, color: "var(--lux-ink-muted)" }}>{dateTime(l.at)}</td>
                  <td style={td}>{l.product.title}{l.option && <span style={{ color: "var(--lux-ink-muted)" }}> · {l.option}</span>}</td>
                  <td style={{ ...td, fontWeight: 600, color: l.delta > 0 ? "var(--lux-gold)" : "var(--lux-ink)" }}>{l.delta > 0 ? `+${l.delta}` : l.delta}</td>
                  <td style={td}>{l.stockAfter}</td>
                  <td style={{ ...td, color: "var(--lux-ink-muted)" }}>{l.reason}</td>
                  <td style={td}>{l.username}</td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        )}
      </Panel>
    </>
  );
}

// Signed-in staff only, so never an instant navigation (see the panel layout).
export const instant = false;
