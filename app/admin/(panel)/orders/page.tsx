import Link from "next/link";
import { OrdersTable } from "@/components/admin/OrdersTable";
import { PageHead, Panel, dateTime } from "@/components/admin/ui";
import { db } from "@/lib/db";
import { money } from "@/lib/format";
import { nextStatuses, STATUSES } from "@/lib/order-flow";
import { orderWhere, parseOrderFilter as filter } from "@/lib/server/order-filter";
import { orderNo } from "@/lib/server/orders";
import { requireStaffPage } from "@/lib/server/staff-session";

export default async function OrdersPage({ searchParams }: PageProps<"/admin/orders">) {
  await requireStaffPage();
  const sp = await searchParams;
  const { status, q, returns } = filter(sp);
  const orders = await db.order.findMany({
    where: orderWhere({ status, q, returns }),
    include: { items: { select: { qty: true } }, returnRequests: { where: { status: "open" }, select: { id: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const chip = (label: string, href: string, on: boolean) => (
    <Link key={label} href={href} className="lux-focus" style={{ padding: "6px 14px", borderRadius: 999, fontSize: 13, border: "1px solid var(--lux-line)", background: on ? "var(--lux-gold-soft)" : "transparent", color: on ? "var(--lux-gold)" : "var(--lux-ink)" }}>{label}</Link>
  );
  return (
    <>
      <PageHead title="Orders" />
      <div className="flex flex-wrap items-center gap-2" style={{ marginBottom: 16 }}>
        {chip("All", "/admin/orders", !status && !returns)}
        {STATUSES.map((s) => chip(s, `/admin/orders?status=${s}`, s === status && !returns))}
        {chip("return requests", "/admin/orders?returns=1", returns)}
        <a href={`/admin/orders/export?${new URLSearchParams({ ...(status ? { status } : {}), ...(q ? { q } : {}), ...(returns ? { returns: "1" } : {}) })}`} className="lux-btn lux-focus" style={{ marginLeft: "auto", padding: "0.5rem 1.1rem", fontSize: "0.85rem" }} download>Export CSV</a>
        <form action="/admin/orders" className="flex gap-2">
          {status && <input type="hidden" name="status" value={status} />}
          <input name="q" defaultValue={q} placeholder="Order no., phone or name" aria-label="Search orders" className="lux-input" style={{ width: 220 }} />
          <button className="lux-btn lux-focus" style={{ padding: "0.5rem 1.2rem", fontSize: "0.85rem" }}>Search</button>
        </form>
      </div>
      <Panel>
        {orders.length === 0 ? <p style={{ margin: 0, color: "var(--lux-ink-muted)" }}>No orders match.</p> : (
          <OrdersTable
            rows={orders.map((o) => ({
              no: orderNo(o.number), placed: dateTime(o.createdAt), items: o.items.reduce((t, i) => t + i.qty, 0), name: o.contactName, phone: o.contactPhone,
              division: o.shipDivision ?? o.shipCountry ?? "—", payMethod: o.paymentMethod, payStatus: o.paymentStatus.replace("_", " "), total: money(o.total),
              status: o.status, next: nextStatuses(o.status), returnRequested: o.returnRequests.length > 0,
            }))}
          />
        )}
        {orders.length === 100 && <p style={{ margin: "12px 0 0", fontSize: 13, color: "var(--lux-ink-muted)" }}>Showing the latest 100. Narrow with a status or search.</p>}
      </Panel>
    </>
  );
}

// Signed-in staff only, so never an instant navigation (see the panel layout).
export const instant = false;
