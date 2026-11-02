import Image from "next/image";
import Link from "next/link";
import { OrderStatusSelect } from "@/components/admin/OrderStatusSelect";
import { Panel, TableWrap, dateTime, td, th } from "@/components/admin/ui";
import { StockPill } from "@/components/ui/StockPill";
import { db } from "@/lib/db";
import { money } from "@/lib/format";
import { nextStatuses } from "@/lib/order-flow";
import { orderNo } from "@/lib/server/orders";
import { requireStaffPage } from "@/lib/server/staff-session";

const LOW_STOCK = 5;

export default async function Dashboard() {
  const staff = await requireStaffPage();
  const owner = staff.role === "owner";
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const weekAgo = new Date(startOfDay);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const [byStatus, today, week, cod, top, low, recent, lowCount, returnCount] = await Promise.all([
    db.order.groupBy({ by: ["status"], _count: true }),
    db.order.aggregate({ where: { createdAt: { gte: startOfDay }, status: { not: "cancelled" } }, _count: true, _sum: { total: true } }),
    db.order.aggregate({ where: { createdAt: { gte: weekAgo }, status: { notIn: ["cancelled", "returned"] } }, _count: true, _sum: { total: true } }),
    db.order.groupBy({ by: ["paymentMethod"], where: { createdAt: { gte: weekAgo }, status: { notIn: ["cancelled", "returned"] } }, _count: true }),
    db.product.findMany({ where: { soldCount: { gt: 0 } }, orderBy: { soldCount: "desc" }, take: 5, select: { slug: true, title: true, soldCount: true, images: { orderBy: { position: "asc" }, take: 1, select: { url: true } } } }),
    db.productVariant.findMany({ where: { stock: { lte: LOW_STOCK }, product: { active: true } }, orderBy: [{ stock: "asc" }, { product: { title: "asc" } }], select: { size: true, stock: true, product: { select: { slug: true, title: true, _count: { select: { variants: true } } } } }, take: 10 }),
    db.order.findMany({ orderBy: { createdAt: "desc" }, take: 8 }),
    db.productVariant.count({ where: { stock: { lte: LOW_STOCK }, product: { active: true } } }),
    db.returnRequest.count({ where: { status: "open" } }),
  ]);
  const count = (s: string) => byStatus.find((b) => b.status === s)?._count ?? 0;
  const stats: [string, string, string][] = [
    ["Needs confirming", String(count("pending")), "/admin/orders?status=pending"],
    ["To pack and ship", String(count("confirmed") + count("packed")), "/admin/orders?status=confirmed"],
    ["Out for delivery", String(count("shipped")), "/admin/orders?status=shipped"],
    ["Today's orders", owner ? `${today._count} · ${money(today._sum.total ?? 0)}` : String(today._count), "/admin/orders"],
    ["Return requests", String(returnCount), "/admin/orders?returns=1"],
  ];
  const codCount = cod.find((c) => c.paymentMethod === "cod")?._count ?? 0;
  const prepaid = cod.filter((c) => c.paymentMethod !== "cod").reduce((n, c) => n + c._count, 0);
  const weekly: [string, string][] = [
    ["Orders (7 days)", String(week._count)],
    ...(owner ? ([["Revenue (7 days)", money(week._sum.total ?? 0)]] as [string, string][]) : []),
    ["COD vs prepaid", `${codCount} / ${prepaid}`],
    ["Low stock", String(lowCount)],
  ];

  return (
    <>
      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", marginBottom: 28 }}>
        {weekly.map(([label, value]) => (
          <div key={label} className="lux-surface" style={{ borderRadius: 16, padding: 20, display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--lux-ink-muted)" }}>{label}</span>
            <span className="font-display" style={{ fontSize: 28, color: label.startsWith("Revenue") ? "var(--lux-gold)" : label === "Low stock" && lowCount ? "var(--lux-danger)" : undefined }}>{value}</span>
          </div>
        ))}
      </div>
      {!owner && <p style={{ margin: "-16px 0 24px", fontSize: 12.5, color: "var(--lux-ink-muted)" }}>Revenue and pricing are visible to the Owner account only.</p>}
      <div className="grid items-start gap-5 lg:grid-cols-[1.3fr_1fr]" style={{ marginBottom: 28 }}>
        <section className="lux-surface" style={{ borderRadius: 16, padding: 18 }}>
          <h3 className="font-display" style={{ margin: "0 0 12px", fontSize: 17, fontWeight: 500 }}>Top products</h3>
          {top.length === 0 ? <p style={{ margin: 0, fontSize: 14, color: "var(--lux-ink-muted)" }}>No sales yet.</p> : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
              {top.map((p) => (
                <li key={p.slug} className="flex items-center gap-3">
                  {p.images[0] ? <Image src={p.images[0].url} alt="" width={38} height={38} style={{ width: 38, height: 38, borderRadius: 8, objectFit: "cover" }} /> : <span style={{ width: 38, height: 38 }} />}
                  <span style={{ flex: 1, fontSize: 14 }}>{p.title}</span>
                  <span style={{ fontSize: 13, color: "var(--lux-ink-muted)" }}>{p.soldCount} sold</span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="lux-surface" style={{ borderRadius: 16, padding: 18 }}>
          <h3 className="font-display" style={{ margin: "0 0 12px", fontSize: 17, fontWeight: 500 }}>Low stock alerts</h3>
          {low.length === 0 ? <p style={{ margin: 0, fontSize: 14, color: "var(--lux-ink-muted)" }}>All products are well stocked.</p> : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
              {low.map((o) => (
                <li key={`${o.product.slug}-${o.size}`} className="flex items-center gap-2.5">
                  <Link href={owner ? `/admin/products/${o.product.slug}` : "/admin/inventory"} className="lux-focus" style={{ flex: 1, fontSize: 14 }}>{o.product.title}{o.product._count.variants > 1 && <span style={{ color: "var(--lux-ink-muted)" }}> · {o.size}</span>}</Link>
                  <StockPill stock={o.stock} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", marginBottom: 28 }}>
        {stats.map(([label, value, href]) => (
          <Link key={label} href={href} className="lux-surface lux-focus" style={{ borderRadius: 16, padding: 20, display: "block" }}>
            <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--lux-ink-muted)" }}>{label}</div>
            <div className="font-display" style={{ fontSize: 24, color: "var(--lux-gold)", marginTop: 6 }}>{value}</div>
          </Link>
        ))}
      </div>
      <Panel title="Recent orders">
          {recent.length === 0 ? <p style={{ margin: 0, color: "var(--lux-ink-muted)" }}>No orders yet.</p> : (
            <TableWrap>
              <thead><tr><th style={th}>Order</th><th style={th}>Placed</th><th style={th}>Customer</th><th style={th}>Total</th><th style={th}>Status</th></tr></thead>
              <tbody>
                {recent.map((o) => (
                  <tr key={o.id}>
                    <td style={td}><Link href={`/admin/orders/${orderNo(o.number)}`} className="lux-link">{orderNo(o.number)}</Link></td>
                    <td style={td}>{dateTime(o.createdAt)}</td>
                    <td style={td}>{o.contactName}</td>
                    <td style={td}>{money(o.total)}</td>
                    <td style={td}><OrderStatusSelect orderNo={orderNo(o.number)} status={o.status} next={nextStatuses(o.status)} /></td>
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
