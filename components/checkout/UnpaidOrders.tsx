"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { lookupOrdersAction, retryPaymentAction } from "@/app/actions/orders";
import { useMoney } from "@/lib/currency";
import { orderTokens, type Order } from "@/lib/orders";

const dueAt = (iso: string | null) => (iso ? new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Dhaka" }) : "");

/**
 * Orders from this browser that were placed but not paid yet (for example the shopper pressed Back on the
 * payment page, so the bag is empty and nothing says an order exists). Offers to finish paying.
 */
export function UnpaidOrders() {
  const money = useMoney();
  const raw = useSyncExternalStore(orderTokens.subscribe, orderTokens.read, () => undefined);
  const [orders, setOrders] = useState<Order[]>([]);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (raw === undefined) return;
    const refs = orderTokens.parse(raw);
    if (refs.length === 0) return;
    let live = true;
    lookupOrdersAction(refs).then((all) => live && setOrders(all.filter((o) => o.pay === "sslcommerz" && o.status === "pending" && o.payStatus !== "paid"))).catch(() => {});
    return () => { live = false; };
  }, [raw]);

  if (orders.length === 0) return null;

  const pay = async (o: Order) => {
    if (busy) return;
    setBusy(o.id);
    setError("");
    try {
      const r = await retryPaymentAction(o.id, orderTokens.refs().find((x) => x.no === o.id)?.token ?? "");
      if (r.ok) { window.location.assign(r.url); return; }
      setError(r.reason);
    } catch {
      setError("We couldn't reach the server. Please try again.");
    }
    setBusy("");
  };

  return (
    <div className="flex flex-col gap-3" style={{ margin: "26px auto 0", maxWidth: 520, textAlign: "left" }}>
      {orders.map((o) => (
        <div key={o.id} className="lux-surface lux-glass--gold" style={{ borderRadius: 16, padding: 18 }}>
          <div style={{ fontWeight: 600 }}>You have an unpaid order: {o.id}</div>
          <p style={{ margin: "4px 0 12px", fontSize: 13.5, color: "var(--lux-ink-muted)" }}>{money(o.totals.total)}. It&apos;s saved{o.payDueAt ? ` and held until ${dueAt(o.payDueAt)} (Dhaka time)` : ""}; after that it&apos;s cancelled.</p>
          <div className="flex flex-wrap gap-2.5">
            <button type="button" onClick={() => pay(o)} disabled={busy === o.id} className="lux-btn-fill lux-focus" style={{ padding: "0.55rem 1.3rem", fontSize: "0.88rem" }}>{busy === o.id ? "Opening payment…" : "Pay now"}</button>
            <Link href={`/order/${o.id}`} className="lux-btn lux-focus" style={{ padding: "0.55rem 1.3rem", fontSize: "0.88rem" }}>View order</Link>
          </div>
        </div>
      ))}
      {error && <p role="alert" style={{ margin: 0, fontSize: 13.5, color: "var(--lux-warning)" }}>{error}</p>}
    </div>
  );
}
