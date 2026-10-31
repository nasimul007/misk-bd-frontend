import Link from "next/link";
import { PageHead, Panel, TableWrap, td, th } from "@/components/admin/ui";
import { Badge } from "@/components/ui/Badge";
import { db } from "@/lib/db";
import { money } from "@/lib/format";
import { requireStaffPage } from "@/lib/server/staff-session";

export default async function ProductsPage() {
  await requireStaffPage();
  const products = await db.product.findMany({ include: { variants: { select: { priceBdt: true } } }, orderBy: [{ active: "desc" }, { createdAt: "desc" }] });
  return (
    <>
      <PageHead title="Products">
        <Link href="/admin/products/new" className="lux-btn-fill lux-focus" style={{ padding: "0.6rem 1.4rem", fontSize: "0.88rem" }}>Add product</Link>
      </PageHead>
      <Panel>
        <TableWrap>
          <thead><tr><th style={th}>Product</th><th style={th}>Category</th><th style={th}>Price</th><th style={th}>Stock</th><th style={th}>Status</th></tr></thead>
          <tbody>
            {products.map((p) => {
              const prices = p.variants.map((v) => v.priceBdt);
              return (
                <tr key={p.id}>
                  <td style={td}><Link href={`/admin/products/${p.slug}`} className="lux-link">{p.title}</Link><div style={{ fontSize: 12, color: "var(--lux-ink-muted)" }}>MB-{String(p.skuNo).padStart(4, "0")}</div></td>
                  <td style={td}>{p.category}</td>
                  <td style={td}>{prices.length ? `${money(Math.min(...prices))}${prices.length > 1 ? ` – ${money(Math.max(...prices))}` : ""}` : "—"}</td>
                  <td style={{ ...td, color: p.stock === 0 ? "var(--lux-danger)" : p.stock <= 5 ? "var(--lux-warning)" : undefined, fontWeight: p.stock <= 5 ? 600 : 400 }}>{p.stock}</td>
                  <td style={td}>{p.active ? <Badge tone="success">Visible</Badge> : <Badge tone="glass">Hidden</Badge>}{p.bestseller && <> <Badge tone="gold">Best seller</Badge></>}</td>
                </tr>
              );
            })}
          </tbody>
        </TableWrap>
      </Panel>
    </>
  );
}

// Signed-in staff only, so never an instant navigation (see the panel layout).
export const instant = false;
