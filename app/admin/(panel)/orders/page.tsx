import Link from "next/link";
import { PageHead, Panel, StatusBadge, TableWrap, dateTime, td, th } from "@/components/admin/ui";
import { db } from "@/lib/db";
import { money } from "@/lib/format";
import { orderNo, parseOrderNo } from "@/lib/server/orders";
import { requireStaffPage } from "@/lib/server/staff-session";

const STATUSES = ["pending", "confirmed", "packed", "shipped", "delivered", "returned", "cancelled"] as const;

export default async function OrdersPage({ searchParams }: PageProps<"/admin/orders">) {
  await requireStaffPage();
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
  const status = STATUSES.find((s) => s === one(sp.status));
  const q = one(sp.q).trim().slice(0, 40);

  const number = parseOrderNo(q.toUpperCase());
  const digits = q.replace(/\D/g, "");
  const orders = await db.order.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(q
        ? { OR: [...(number ? [{ number }] : []), ...(digits.length >= 4 ? [{ contactPhone: { contains: digits } }] : []), { contactName: { contains: q, mode: "insensitive" as const } }] }
        : {}),
    },
    include: { items: { select: { qty: true } } },
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
        {chip("All", "/admin/orders", !status)}
        {STATUSES.map((s) => chip(s, `/admin/orders?status=${s}`, s === status))}
        <form action="/admin/orders" className="flex gap-2" style={{ marginLeft: "auto" }}>
          {status && <input type="hidden" name="status" value={status} />}
          <input name="q" defaultValue={q} placeholder="Order no., phone or name" aria-label="Search orders" className="lux-input" style={{ width: 220 }} />
          <button className="lux-btn lux-focus" style={{ padding: "0.5rem 1.2rem", fontSize: "0.85rem" }}>Search</button>
        </form>
      </div>
      <Panel>
        {orders.length === 0 ? <p style={{ margin: 0, color: "var(--lux-ink-muted)" }}>No orders match.</p> : (
          <TableWrap>
            <thead><tr><th style={th}>Order</th><th style={th}>Placed</th><th style={th}>Customer</th><th style={th}>Items</th><th style={th}>Total</th><th style={th}>Payment</th><th style={th}>Status</th></tr></thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td style={td}><Link href={`/admin/orders/${orderNo(o.number)}`} className="lux-link">{orderNo(o.number)}</Link></td>
                  <td style={td}>{dateTime(o.createdAt)}</td>
                  <td style={td}>{o.contactName}<div style={{ fontSize: 12, color: "var(--lux-ink-muted)" }}>{o.contactPhone}</div></td>
                  <td style={td}>{o.items.reduce((n, i) => n + i.qty, 0)}</td>
                  <td style={td}>{money(o.total)}</td>
                  <td style={td}>{o.paymentMethod} · {o.paymentStatus.replace("_", " ")}</td>
                  <td style={td}><StatusBadge status={o.status} /></td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        )}
        {orders.length === 100 && <p style={{ margin: "12px 0 0", fontSize: 13, color: "var(--lux-ink-muted)" }}>Showing the latest 100. Narrow with a status or search.</p>}
      </Panel>
    </>
  );
}

// Signed-in staff only, so never an instant navigation (see the panel layout).
export const instant = false;
