import { InventoryManager } from "@/components/admin/InventoryManager";
import { Panel, TableWrap, dateTime, td, th } from "@/components/admin/ui";
import { db } from "@/lib/db";
import { requireStaffPage } from "@/lib/server/staff-session";

export default async function InventoryPage() {
  await requireStaffPage();
  const [products, log] = await Promise.all([
    db.product.findMany({ orderBy: [{ active: "desc" }, { title: "asc" }], select: { slug: true, title: true, stock: true, active: true, images: { orderBy: { position: "asc" }, take: 1, select: { url: true } } } }),
    db.inventoryAdjustment.findMany({ orderBy: { at: "desc" }, take: 100, include: { product: { select: { title: true } } } }),
  ]);
  return (
    <>
      <InventoryManager rows={products.map((p) => ({ slug: p.slug, title: p.title, stock: p.stock, active: p.active, image: p.images[0]?.url ?? "" }))} />
      <h3 className="font-display" style={{ fontSize: 17, fontWeight: 500, margin: "28px 0 12px" }}>Adjustment history</h3>
      <Panel>
        {log.length === 0 ? <p style={{ margin: 0, color: "var(--lux-ink-muted)" }}>No stock changes yet.</p> : (
          <TableWrap>
            <thead><tr><th style={th}>Date</th><th style={th}>Product</th><th style={th}>Change</th><th style={th}>Stock after</th><th style={th}>Reason</th><th style={th}>By</th></tr></thead>
            <tbody>
              {log.map((l) => (
                <tr key={l.id}>
                  <td style={{ ...td, color: "var(--lux-ink-muted)" }}>{dateTime(l.at)}</td>
                  <td style={td}>{l.product.title}</td>
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
