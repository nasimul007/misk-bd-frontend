import Image from "next/image";
import Link from "next/link";
import { ProductActions, StockStepper } from "@/components/admin/ProductRowActions";
import { Panel, TableWrap, td, th } from "@/components/admin/ui";
import { Badge } from "@/components/ui/Badge";
import { db } from "@/lib/db";
import { money } from "@/lib/format";
import { requireStaffPage } from "@/lib/server/staff-session";

export default async function ProductsPage({ searchParams }: PageProps<"/admin/products">) {
  await requireStaffPage("owner");
  const sp = await searchParams;
  const q = ((Array.isArray(sp.q) ? sp.q[0] : sp.q) ?? "").trim().slice(0, 60);
  const skuNo = /^(mb-)?\d{1,6}$/i.test(q) ? Number(q.replace(/\D/g, "")) : null;
  const products = await db.product.findMany({
    where: q ? { OR: [{ title: { contains: q, mode: "insensitive" } }, ...(skuNo !== null ? [{ skuNo }] : [])] } : {},
    include: { variants: { select: { priceBdt: true, size: true, stock: true }, orderBy: { position: "asc" } }, images: { orderBy: { position: "asc" }, take: 1, select: { url: true } }, section: { select: { name: true } } },
    orderBy: [{ active: "desc" }, { createdAt: "desc" }],
  });
  return (
    <>
      <form action="/admin/products" className="flex flex-wrap gap-3" style={{ marginBottom: 16 }}>
        <input name="q" defaultValue={q} placeholder="Search by name or SKU…" aria-label="Search products" className="lux-input" style={{ flex: 1, minWidth: 200 }} />
        <Link href="/admin/products/new" className="lux-btn-fill lux-focus" style={{ padding: "0.6rem 1.4rem", fontSize: "0.88rem" }}>Add product</Link>
      </form>
      <Panel style={{ padding: 0 }}>
        {products.length === 0 ? <p style={{ margin: 0, padding: 20, color: "var(--lux-ink-muted)" }}>No products match.</p> : (
          <TableWrap>
            <thead><tr><th style={th}>Product</th><th style={th}>SKU</th><th style={th}>Price</th><th style={th}>Stock</th><th style={th}>Status</th><th style={th}>Actions</th></tr></thead>
            <tbody>
              {products.map((p) => {
                const prices = p.variants.map((v) => v.priceBdt);
                return (
                  <tr key={p.id}>
                    <td style={td}>
                      <div className="flex items-center gap-2.5">
                        {p.images[0] ? <Image src={p.images[0].url} alt="" width={34} height={34} style={{ width: 34, height: 34, borderRadius: 8, objectFit: "cover" }} /> : <span style={{ width: 34, height: 34 }} />}
                        <div>
                          <div>{p.title}{p.bestseller && <> <Badge tone="gold">Best seller</Badge></>}</div>
                          {p.section?.name && <div style={{ fontSize: 12, color: "var(--lux-ink-muted)" }}>{p.section.name}</div>}
                        </div>
                      </div>
                    </td>
                    <td style={{ ...td, color: "var(--lux-ink-muted)" }}>MB-{String(p.skuNo).padStart(4, "0")}</td>
                    <td style={td}>{prices.length ? `${money(Math.min(...prices))}${prices.length > 1 ? ` – ${money(Math.max(...prices))}` : ""}` : "—"}</td>
                    <td style={td}>
                      <div className="flex flex-col gap-2">
                        {p.variants.map((v) => (
                          <div key={v.size} className="flex items-center gap-2.5">
                            {p.variants.length > 1 && <span style={{ minWidth: 70, fontSize: 12.5, color: "var(--lux-ink-muted)" }}>{v.size}</span>}
                            <StockStepper slug={p.slug} size={v.size} stock={v.stock} />
                          </div>
                        ))}
                      </div>
                    </td>
                    <td style={td}><Badge tone={p.active ? "success" : "glass"}>{p.active ? "Active" : "Archived"}</Badge></td>
                    <td style={td}><ProductActions slug={p.slug} title={p.title} active={p.active} /></td>
                  </tr>
                );
              })}
            </tbody>
          </TableWrap>
        )}
      </Panel>
    </>
  );
}

// Signed-in staff only, so never an instant navigation (see the panel layout).
export const instant = false;
