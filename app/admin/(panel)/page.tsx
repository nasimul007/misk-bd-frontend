import Link from "next/link";
import { PageHead, Panel, StatusBadge, TableWrap, dateTime, td, th } from "@/components/admin/ui";
import { db } from "@/lib/db";
import { money } from "@/lib/format";
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

  const [byStatus, today, week, cod, top, low, recent] = await Promise.all([
    db.order.groupBy({ by: ["status"], _count: true }),
    db.order.aggregate({ where: { createdAt: { gte: startOfDay }, status: { not: "cancelled" } }, _count: true, _sum: { total: true } }),
    db.order.aggregate({ where: { createdAt: { gte: weekAgo }, status: { notIn: ["cancelled", "returned"] } }, _count: true, _sum: { total: true } }),
    db.order.groupBy({ by: ["paymentMethod"], where: { createdAt: { gte: weekAgo }, status: { notIn: ["cancelled", "returned"] } }, _count: true }),
    db.product.findMany({ where: { soldCount: { gt: 0 } }, orderBy: { soldCount: "desc" }, take: 5, select: { slug: true, title: true, soldCount: true } }),
    db.product.findMany({ where: { active: true, stock: { lte: LOW_STOCK } }, orderBy: { stock: "asc" }, select: { slug: true, title: true, stock: true }, take: 10 }),
    db.order.findMany({ orderBy: { createdAt: "desc" }, take: 8 }),
  ]);
  const count = (s: string) => byStatus.find((b) => b.status === s)?._count ?? 0;
  const stats: [string, string, string][] = [
    ["Needs confirming", String(count("pending")), "/admin/orders?status=pending"],
    ["To pack and ship", String(count("confirmed") + count("packed")), "/admin/orders?status=confirmed"],
    ["Out for delivery", String(count("shipped")), "/admin/orders?status=shipped"],
    ["Today's orders", owner ? `${today._count} · ${money(today._sum.total ?? 0)}` : String(today._count), "/admin/orders"],
  ];
  const codCount = cod.find((c) => c.paymentMethod === "cod")?._count ?? 0;
  const prepaid = cod.filter((c) => c.paymentMethod !== "cod").reduce((n, c) => n + c._count, 0);
  const weekly: [string, string][] = [
    ["Orders (7 days)", String(week._count)],
    ...(owner ? ([["Revenue (7 days)", money(week._sum.total ?? 0)]] as [string, string][]) : []),
    ["COD vs prepaid", `${codCount} / ${prepaid}`],
    ["Low stock", String(low.length)],
  ];

  return (
    <>
      <PageHead title="Dashboard" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" style={{ marginBottom: 24 }}>
        {stats.map(([label, value, href]) => (
          <Link key={label} href={href} className="lux-surface lux-focus" style={{ borderRadius: 16, padding: 20, display: "block" }}>
            <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--lux-ink-muted)" }}>{label}</div>
            <div className="font-display" style={{ fontSize: 26, color: "var(--lux-gold)", marginTop: 6 }}>{value}</div>
          </Link>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" style={{ marginBottom: 24 }}>
        {weekly.map(([label, value]) => (
          <div key={label} className="lux-surface" style={{ borderRadius: 16, padding: 20 }}>
            <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--lux-ink-muted)" }}>{label}</div>
            <div className="font-display" style={{ fontSize: 26, color: label.startsWith("Revenue") ? "var(--lux-gold)" : undefined, marginTop: 6 }}>{value}</div>
          </div>
        ))}
      </div>
      {!owner && <p style={{ margin: "-12px 0 24px", fontSize: 12.5, color: "var(--lux-ink-muted)" }}>Revenue and pricing are visible to the Owner account only.</p>}
      <div className="grid items-start gap-6 lg:grid-cols-[1.6fr_1fr]">
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
                    <td style={td}><StatusBadge status={o.status} /></td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          )}
        </Panel>
        <div className="flex flex-col gap-6">
        <Panel title="Top products">
          {top.length === 0 ? <p style={{ margin: 0, color: "var(--lux-ink-muted)" }}>No sales yet.</p> : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
              {top.map((p) => (<li key={p.slug} className="flex justify-between gap-3" style={{ fontSize: 14 }}><span>{p.title}</span><span style={{ color: "var(--lux-ink-muted)" }}>{p.soldCount} sold</span></li>))}
            </ul>
          )}
        </Panel>
        <Panel title={`Low stock (${LOW_STOCK} or fewer)`}>
          {low.length === 0 ? <p style={{ margin: 0, color: "var(--lux-ink-muted)" }}>Everything is well stocked.</p> : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
              {low.map((p) => (
                <li key={p.slug} className="flex justify-between gap-3" style={{ fontSize: 14 }}>
                  <Link href={owner ? `/admin/products/${p.slug}` : "/admin/inventory"} className="lux-link">{p.title}</Link>
                  <span style={{ color: p.stock === 0 ? "var(--lux-danger)" : "var(--lux-warning)", fontWeight: 600 }}>{p.stock === 0 ? "Out" : p.stock}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        </div>
      </div>
    </>
  );
}

// Signed-in staff only, so never an instant navigation (see the panel layout).
export const instant = false;
