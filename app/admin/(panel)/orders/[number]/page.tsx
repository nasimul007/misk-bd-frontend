import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { OrderStatusPanel } from "@/components/admin/OrderStatusPanel";
import { ReturnRequestPanel } from "@/components/admin/ReturnRequestPanel";
import { PageHead, Panel, StatusBadge, dateTime } from "@/components/admin/ui";
import { db } from "@/lib/db";
import { money } from "@/lib/format";
import { nextStatuses } from "@/lib/order-flow";
import { orderNo, parseOrderNo } from "@/lib/server/orders";
import { requireStaffPage } from "@/lib/server/staff-session";


export default async function OrderPage({ params }: PageProps<"/admin/orders/[number]">) {
  await requireStaffPage();
  const n = parseOrderNo((await params).number);
  if (n === null) notFound();
  const o = await db.order.findUnique({
    where: { number: n },
    include: { items: true, returnRequests: { orderBy: { createdAt: "desc" } }, payments: { orderBy: { createdAt: "desc" } }, history: { orderBy: { createdAt: "desc" } }, customer: { select: { name: true, phone: true, email: true } } },
  });
  if (!o) notFound();

  const staffIds = [...new Set(o.history.map((h) => h.actorId).filter((x): x is string => !!x))];
  const staff = staffIds.length ? await db.staffAccount.findMany({ where: { id: { in: staffIds } }, select: { id: true, username: true } }) : [];
  const who = (id: string | null) => (id ? (staff.find((s) => s.id === id)?.username ?? "staff") : "system");

  const awaitingFee = o.paymentStatus === "pending" || o.paymentStatus === "failed"; // a Cash on Delivery order whose delivery charge isn't in yet
  const intl = o.shipKind === "intl";
  const address = intl
    ? [o.shipStreet, o.shipCity, o.shipRegion, o.shipPostal, o.shipCountry].filter(Boolean).join(", ")
    : [o.shipStreet, o.shipUpazila, o.shipDistrict, o.shipDivision].filter(Boolean).join(", ");
  const row = (k: string, v: string) => (<div key={k} className="flex justify-between gap-4" style={{ padding: "4px 0", fontSize: 14 }}><span style={{ color: "var(--lux-ink-muted)" }}>{k}</span><span style={{ textAlign: "right" }}>{v}</span></div>);

  return (
    <>
      <PageHead title={`Order ${orderNo(o.number)}`}>
        <StatusBadge status={o.status} />
        <Link href="/admin/orders" className="lux-btn lux-focus" style={{ padding: "0.45rem 1.1rem", fontSize: "0.82rem" }}>All orders</Link>
      </PageHead>
      <div className="grid items-start gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="flex flex-col gap-6">
          <Panel title="Items">
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 14 }}>
              {o.items.map((i) => (
                <li key={i.id} className="flex items-center gap-3">
                  {i.image && <Image src={i.image} alt="" width={52} height={52} style={{ width: 52, height: 52, borderRadius: 10, objectFit: "cover" }} />}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500 }}>{i.title}</div>
                    <div style={{ fontSize: 13, color: "var(--lux-ink-muted)" }}>{i.size} × {i.qty}{i.discount ? ` · ${i.discount}` : ""}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div>{money(i.unitPrice * i.qty)}</div>
                    {i.unitList > i.unitPrice && <s style={{ fontSize: 12, color: "var(--lux-ink-muted)" }}>{money(i.unitList * i.qty)}</s>}
                  </div>
                </li>
              ))}
            </ul>
            <div style={{ borderTop: "1px solid var(--lux-line)", marginTop: 14, paddingTop: 10 }}>
              {row("Subtotal", money(o.subtotalList))}
              {o.discountTotal > 0 && row("Discounts", `−${money(o.discountTotal)}`)}
              {row("Shipping", o.shippingFee ? money(o.shippingFee) : "Free")}
              {row("VAT (included)", money(o.vatAmount))}
              <div className="flex justify-between" style={{ paddingTop: 8, fontSize: 17, fontWeight: 600 }}><span>Total</span><span style={{ color: "var(--lux-gold)" }}>{money(o.total)}</span></div>
            </div>
          </Panel>
          <Panel title="History">
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 12 }}>
              {o.history.map((h) => (
                <li key={h.id} style={{ fontSize: 14 }}>
                  <StatusBadge status={h.status} /> <span style={{ color: "var(--lux-ink-muted)", marginLeft: 8 }}>{dateTime(h.createdAt)} · {who(h.actorId)}</span>
                  {h.note && <div style={{ marginTop: 4 }}>{h.note}</div>}
                </li>
              ))}
            </ul>
          </Panel>
        </div>
        <div className="flex flex-col gap-6">
          {o.returnRequests[0]?.status === "open" && (
            <Panel title="Return requested"><ReturnRequestPanel orderNo={orderNo(o.number)} reason={o.returnRequests[0].reason} when={dateTime(o.returnRequests[0].createdAt)} /></Panel>
          )}
          <Panel title="Update status"><OrderStatusPanel orderNo={orderNo(o.number)} next={nextStatuses(o.status)} /></Panel>
          <Panel title="Customer">
            {row("Name", o.contactName)}
            {row("Phone", o.contactPhone)}
            {o.contactEmail && row("Email", o.contactEmail)}
            {row("Account", o.customer ? "Signed-in customer" : "Guest")}
          </Panel>
          <Panel title="Delivery">
            <p style={{ margin: "0 0 8px", fontSize: 14, lineHeight: 1.6 }}>{address}</p>
            {row("Estimated", o.etaText || "—")}
            {o.contactless && row("Hand-over", "Contactless: leave at the door")}
            {o.deliveryNote && (
              <div style={{ marginTop: 8, padding: "10px 12px", borderRadius: 10, border: "1px solid var(--lux-line)", background: "var(--lux-gold-soft)", fontSize: 14, lineHeight: 1.5 }}>
                <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--lux-gold)", marginBottom: 2 }}>Customer note</div>
                {o.deliveryNote}
              </div>
            )}
          </Panel>
          <Panel title="Payment">
            {row("Method", o.paymentMethod)}
            {row("Status", o.paymentStatus.replace("_", " "))}
            {o.paidAmount > 0 && row("Paid online", money(o.paidAmount))}
            {o.paymentMethod === "cod" && o.paymentStatus !== "cod_collected" && row("Cash on delivery", money(o.total - (o.paidAmount > 0 ? o.paidAmount : awaitingFee ? o.shippingFee : 0)))}
            {(o.status === "cancelled" || o.status === "returned") && o.paidAmount > 0 && (
              <div style={{ margin: "6px 0", padding: "10px 12px", borderRadius: 10, border: "1px solid color-mix(in oklch, var(--lux-warning) 40%, transparent)", background: "color-mix(in oklch, var(--lux-warning) 10%, transparent)", fontSize: 13.5, lineHeight: 1.5 }}>
                <strong>Refund due.</strong> {money(o.paidAmount)} was paid online and the order is {o.status}. Refund it from the SSLCommerz merchant panel.
              </div>
            )}
            {row("Placed", dateTime(o.createdAt))}
            {o.paymentDueAt && o.paymentStatus !== "paid" && row("Pay by", dateTime(o.paymentDueAt))}
            {o.payments.filter((p) => p.providerRef).map((p) => row(`Attempt ${p.providerRef}`, p.status + (p.raw && typeof p.raw === "object" && "bank_tran_id" in p.raw ? ` · ${String((p.raw as Record<string, unknown>).bank_tran_id)}` : "")))}
          </Panel>
        </div>
      </div>
    </>
  );
}

// Signed-in staff only, so never an instant navigation (see the panel layout).
export const instant = false;
