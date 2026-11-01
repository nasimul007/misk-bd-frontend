"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { lookupOrdersAction, trackOrderAction } from "@/app/actions/orders";
import { myOrdersAction } from "@/app/actions/auth";
import { Field } from "@/components/checkout/Field";
import { StatusBadge } from "@/components/admin/ui";
import { OrderProgress } from "@/components/track/OrderProgress";
import { payments } from "@/lib/config";
import { useSession } from "@/lib/auth";
import { useMoney } from "@/lib/currency";
import { orderTokens, type Order } from "@/lib/orders";

const PAY: Record<string, string> = { paid: "Paid", pending: "Payment pending", failed: "Payment failed", unpaid: "Unpaid", cod_pending: "Pay on delivery", cod_collected: "Paid (cash on delivery)", refunded: "Refunded" };

function Result({ order }: { order: Order }) {
  const money = useMoney();
  const t = order.totals;
  const payLabel = payments.find((p) => p.id === order.pay)?.label ?? order.pay;
  return (
    <section aria-label={`Order ${order.id}`} className="lux-surface" style={{ borderRadius: 18, padding: 24, marginTop: 24 }}>
      <div className="flex flex-wrap items-center justify-between gap-3" style={{ marginBottom: 22 }}>
        <div>
          <div className="lux-eyebrow">Order</div>
          <h2 className="font-display" style={{ margin: "4px 0 0", fontSize: 26, fontWeight: 500, color: "var(--lux-gold)" }}>{order.id}</h2>
          <div style={{ fontSize: 13, color: "var(--lux-ink-muted)", marginTop: 4 }}>Placed {new Date(order.placedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Dhaka" })}</div>
        </div>
        <StatusBadge status={order.status} />
      </div>
      <OrderProgress order={order} />
      <ul style={{ listStyle: "none", margin: "26px 0 0", padding: "18px 0 0", borderTop: "1px solid var(--lux-line)", display: "flex", flexDirection: "column", gap: 12 }}>
        {order.items.map((i) => (
          <li key={i.key} className="flex items-center gap-3.5">
            <span style={{ position: "relative", width: 48, height: 48, flex: "none", borderRadius: 10, overflow: "hidden" }}>{i.image && <Image src={i.image} alt="" fill sizes="48px" style={{ objectFit: "cover" }} />}</span>
            <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 14 }}>{i.title}</div><div style={{ fontSize: 12, color: "var(--lux-ink-muted)" }}>{i.size} &middot; &times; {i.qty}</div></div>
            <div style={{ fontWeight: 600, color: "var(--lux-gold)" }}>{money(i.price * i.qty)}</div>
          </li>
        ))}
      </ul>
      <div className="grid gap-x-8 gap-y-3 sm:grid-cols-3" style={{ borderTop: "1px solid var(--lux-line)", marginTop: 18, paddingTop: 18, fontSize: 14 }}>
        <div><div className="lux-eyebrow">Payment</div><div style={{ marginTop: 4 }}>{payLabel}</div><div style={{ color: "var(--lux-ink-muted)", fontSize: 13 }}>{PAY[order.payStatus] ?? order.payStatus}</div></div>
        <div><div className="lux-eyebrow">Delivering to</div><div style={{ marginTop: 4 }}>{order.division}</div></div>
        <div><div className="lux-eyebrow">Total</div><div className="font-display" style={{ marginTop: 4, fontSize: 22, color: "var(--lux-gold)" }}>{money(t.total)}</div></div>
      </div>
      {order.pay === "sslcommerz" && order.status === "pending" && order.payStatus !== "paid" && (
        <p style={{ margin: "16px 0 0", fontSize: 13.5 }}>Your payment isn&apos;t complete. <Link href={`/order/${order.id}`} className="lux-link">Finish paying</Link> (on the device you ordered from).</p>
      )}
    </section>
  );
}

/** Track an order with its number and phone (anyone), or pick from your own orders (signed in, or this device). */
export function TrackOrder() {
  const session = useSession();
  const refsRaw = useSyncExternalStore(orderTokens.subscribe, orderTokens.read, () => undefined);
  const [no, setNo] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [shown, setShown] = useState<Order | null>(null);
  const [mine, setMine] = useState<Order[]>([]);

  // Orders this person can open without typing anything: their account's, plus guest orders from this device.
  useEffect(() => {
    if (refsRaw === undefined || session === undefined) return;
    let live = true;
    const refs = orderTokens.parse(refsRaw);
    (session ? myOrdersAction(refs) : refs.length ? lookupOrdersAction(refs) : Promise.resolve([])).then((o) => live && setMine(o)).catch(() => {});
    return () => { live = false; };
  }, [refsRaw, session]);

  const lookup = async (orderNo: string, phoneNo: string) => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const r = await trackOrderAction(orderNo, phoneNo);
      if (r.ok) setShown(r.order); else { setShown(null); setError(r.message); }
    } catch {
      setError("We couldn't reach the server. Please try again.");
    }
    setBusy(false);
  };

  return (
    <div style={{ maxWidth: 760, margin: "0 auto" }}>
      <form onSubmit={(e) => { e.preventDefault(); if (!no.trim() || !phone.trim()) return setError("Enter your order number and the phone number you ordered with."); lookup(no, phone); }} noValidate className="lux-surface flex flex-col gap-4" style={{ borderRadius: 18, padding: 24 }}>
        <div className="grid gap-3.5 sm:grid-cols-2">
          <Field id="tr-no" label="Order number *"><input id="tr-no" className="lux-input" placeholder="MB-10005" autoCapitalize="characters" value={no} onChange={(e) => setNo(e.target.value)} /></Field>
          <Field id="tr-phone" label="Phone number *"><input id="tr-phone" type="tel" inputMode="tel" autoComplete="tel" className="lux-input" placeholder="The number you ordered with" value={phone} onChange={(e) => setPhone(e.target.value)} /></Field>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={busy} className="lux-btn-fill lux-focus" style={{ opacity: busy ? 0.7 : 1 }}>{busy ? "Looking…" : "Track order"}</button>
          {error && <span role="alert" style={{ fontSize: 13.5, color: "var(--lux-warning)" }}>{error}</span>}
        </div>
      </form>

      {mine.length > 0 && (
        <section aria-label="Your orders" style={{ marginTop: 28 }}>
          <h2 className="font-display" style={{ fontSize: 18, fontWeight: 500, margin: "0 0 12px" }}>{session ? "Your orders" : "Orders from this device"}</h2>
          <div className="flex flex-col gap-2.5">
            {mine.map((o) => (
              <button key={o.id} type="button" onClick={() => { setError(""); setShown(o); }} aria-pressed={shown?.id === o.id} className="lux-surface lux-focus flex flex-wrap items-center justify-between gap-3 text-left" style={{ borderRadius: 14, padding: "12px 16px", cursor: "pointer", border: shown?.id === o.id ? "1px solid var(--lux-gold)" : undefined, color: "inherit" }}>
                <span><strong>{o.id}</strong> <span style={{ color: "var(--lux-ink-muted)", fontSize: 13 }}>· {new Date(o.placedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "Asia/Dhaka" })}</span></span>
                <StatusBadge status={o.status} />
              </button>
            ))}
          </div>
        </section>
      )}

      {shown && <Result order={shown} />}
    </div>
  );
}
