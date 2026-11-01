"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { Check } from "lucide-react";
import { payments } from "@/lib/config";
import { estimateFor } from "@/lib/checkout";
import { useCurrency, useMoney } from "@/lib/currency";
import { money as bdt } from "@/lib/format";
import { lookupOrdersAction, retryPaymentAction } from "@/app/actions/orders";
import { useSession } from "@/lib/auth";
import { OrderProgress } from "@/components/track/OrderProgress";
import { orderTokens, type Order } from "@/lib/orders";

/** `undefined` while loading, `null` when this browser can't prove the order is its own. */
function useOrder(id: string): Order | null | undefined {
  const raw = useSyncExternalStore(orderTokens.subscribe, orderTokens.read, () => undefined);
  const session = useSession();
  const token = useMemo(() => (raw === undefined ? undefined : (orderTokens.parse(raw).find((r) => r.no === id)?.token ?? "")), [raw, id]);
  const [loaded, setLoaded] = useState<{ id: string; order: Order | null } | null>(null);
  const ready = token !== undefined && session !== undefined; // a signed-in customer may own the order without a token

  useEffect(() => {
    if (!ready) return;
    let live = true;
    lookupOrdersAction([{ no: id, token }]).then((found) => live && setLoaded({ id, order: found[0] ?? null }));
    return () => { live = false; };
  }, [ready, id, token, session?.id]);

  return ready && loaded?.id === id ? loaded.order : undefined;
}

/** An online order that hasn't been paid yet, or whose payment didn't go through. */
function PayPrompt({ order }: { order: Order }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const failed = order.payStatus === "failed";
  const pay = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const r = await retryPaymentAction(order.id, orderTokens.refs().find((x) => x.no === order.id)?.token ?? "");
      if (r.ok) { window.location.assign(r.url); return; }
      setError(r.reason);
    } catch {
      setError("We couldn't reach the server. Please try again.");
    }
    setBusy(false);
  };
  const due = order.payDueAt ? new Date(order.payDueAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Dhaka" }) : "";
  return (
    <div className="lux-surface lux-glass--gold" style={{ borderRadius: 18, padding: 22, marginBottom: 22, textAlign: "center" }}>
      <div style={{ fontWeight: 600, marginBottom: 6 }}>{failed ? "Your payment didn't go through" : "Your payment is not complete yet"}</div>
      <p style={{ margin: "0 0 14px", fontSize: 14, color: "var(--lux-ink-muted)" }}>
        {due ? `We're holding your order until ${due} (Dhaka time). ` : ""}After that it is cancelled and the items go back on the shelf.
      </p>
      <button type="button" onClick={pay} disabled={busy} className="lux-btn-fill lux-focus">{busy ? "Opening payment…" : failed ? "Try payment again" : "Pay now"}</button>
      {error && <p role="alert" style={{ margin: "10px 0 0", fontSize: 13, color: "var(--lux-warning)" }}>{error}</p>}
    </div>
  );
}

/** Confirmation and receipt. Shown only to a browser that holds the order's guest token. */
export function OrderReceipt({ id }: { id: string }) {
  const money = useMoney();
  const currency = useCurrency();
  const order = useOrder(id);

  if (order === undefined) return <div style={{ minHeight: "50vh" }} aria-busy="true" />;
  if (order === null) {
    return (
      <div style={{ padding: "60px 0", textAlign: "center" }}>
        <h1 className="font-display" style={{ fontSize: 28, fontWeight: 500 }}>We can&apos;t find that order</h1>
        <p style={{ color: "var(--lux-ink-muted)", margin: "10px 0 20px" }}>Order {id} can&apos;t be shown in this browser. Open it on the device you ordered from.</p>
        <Link href="/shop" className="lux-btn lux-focus">Continue shopping</Link>
      </div>
    );
  }

  const online = order.pay === "sslcommerz";
  const unpaid = online && order.status === "pending" && order.payStatus !== "paid";
  const lapsed = online && order.status === "cancelled" && order.payStatus !== "paid";
  const payLabel = (payments.find((p) => p.id === order.pay)?.label ?? order.pay) + (online ? (order.payStatus === "paid" ? " · Paid" : " · Awaiting payment") : "");
  const t = order.totals;
  const facts: [string, string][] = [["Order", order.id], ["Payment", payLabel], ["Ship to", order.division], ["Est. delivery", estimateFor(order.intl, order.division)]];

  return (
    <div style={{ maxWidth: 720, margin: "0 auto" }}>
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <div className="lux-glass lux-glass--gold inline-flex items-center justify-center" style={{ width: 72, height: 72, borderRadius: "50%", color: "var(--lux-gold)", margin: "0 auto 20px" }}><Check size={34} /></div>
        <h1 className="font-display" style={{ fontSize: 32, fontWeight: 500, margin: "0 0 8px" }}>{lapsed ? "Order cancelled" : unpaid ? "Almost there" : online ? "Thank you — payment received" : "Thank you — order received"}</h1>
        <p style={{ color: "var(--lux-ink-muted)" }}>
          {lapsed
            ? <>Order <strong style={{ color: "var(--lux-gold)" }}>{order.id}</strong> was cancelled because the payment wasn&apos;t received in time. You can place it again from the shop.</>
            : <>Order <strong style={{ color: "var(--lux-gold)" }}>{order.id}</strong>. {unpaid ? "It's saved, and waiting for your payment." : <>We&apos;ll confirm it by phone{order.email ? " and email" : ""} shortly.</>}</>}
        </p>
      </div>
      {unpaid && <PayPrompt order={order} />}
      <div className="lux-surface" style={{ borderRadius: 18, padding: 24, marginBottom: 22 }}><OrderProgress order={order} /></div>

      <div className="lux-surface" style={{ borderRadius: 18, padding: 26 }}>
        <div className="flex flex-wrap justify-between gap-5" style={{ paddingBottom: 18, borderBottom: "1px solid var(--lux-line)" }}>
          {facts.map(([k, v]) => (
            <div key={k}><div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--lux-ink-muted)" }}>{k}</div><div style={{ fontWeight: 500, marginTop: 4 }}>{v}</div></div>
          ))}
        </div>
        <div style={{ padding: "16px 0", borderBottom: "1px solid var(--lux-line)", fontSize: 14, color: "var(--lux-ink-muted)", lineHeight: 1.7 }}>
          <div style={{ color: "var(--lux-ink)", fontWeight: 500 }}>{order.name}</div>
          <div>{order.phone}</div>
          <div>{order.address}</div>
        </div>
        <ul className="flex flex-col gap-3" style={{ listStyle: "none", margin: 0, padding: "18px 0" }}>
          {order.items.map((i) => (
            <li key={i.key} className="flex items-center gap-3.5">
              <span style={{ position: "relative", width: 52, height: 52, flex: "none", borderRadius: 10, overflow: "hidden" }}><Image src={i.image} alt="" fill sizes="52px" style={{ objectFit: "cover" }} /></span>
              <div style={{ flex: 1 }}><div style={{ fontSize: 14 }}>{i.title}</div><div style={{ fontSize: 12, color: "var(--lux-ink-muted)" }}>{i.size} &middot; &times; {i.qty}</div></div>
              <div style={{ fontWeight: 600, color: "var(--lux-gold)" }}>{money(i.price * i.qty)}</div>
            </li>
          ))}
        </ul>
        <div style={{ borderTop: "1px solid var(--lux-line)", paddingTop: 14, fontSize: 14, color: "var(--lux-ink-muted)" }}>
          <div className="flex justify-between" style={{ padding: "3px 0" }}><span>Subtotal</span><span>{money(t.listTotal)}</span></div>
          {t.savings > 0 && <div className="flex justify-between" style={{ padding: "3px 0", color: "var(--lux-success)" }}><span>Discounts</span><span>&minus;{money(t.savings)}</span></div>}
          <div className="flex justify-between" style={{ padding: "3px 0" }}><span>Shipping</span><span>{t.shipping === 0 ? "Free" : money(t.shipping)}</span></div>
          <div className="flex justify-between" style={{ padding: "3px 0" }}><span>VAT (incl.)</span><span>{money(t.vat)}</span></div>
        </div>
        <div className="flex items-baseline justify-between" style={{ borderTop: "1px solid var(--lux-line)", marginTop: 12, paddingTop: 16 }}>
          <span style={{ fontWeight: 500 }}>{order.pay === "cod" ? "Total due on delivery" : unpaid ? "Total to pay" : "Total"}</span>
          <span className="font-display" style={{ fontSize: 24, color: "var(--lux-gold)" }}>{money(t.total)}</span>
        </div>
        {currency === "USD" && <p style={{ margin: "8px 0 0", fontSize: 12.5, color: "var(--lux-ink-muted)", textAlign: "right" }}>Shown in USD for reference. You are charged {bdt(t.total)}.</p>}
      </div>

      <div className="flex flex-wrap justify-center gap-3.5" style={{ marginTop: 28 }}>
        <Link href="/shop" className="lux-btn-fill lux-focus">Continue shopping</Link>
        <Link href="/track" className="lux-btn lux-focus">Track another order</Link>
      </div>
    </div>
  );
}
