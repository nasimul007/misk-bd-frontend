"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";
import { Check } from "lucide-react";
import { payments } from "@/lib/config";
import { estimateFor } from "@/lib/checkout";
import { money } from "@/lib/format";
import { orderStore, type Order } from "@/lib/orders";

function useOrder(id: string): Order | null | undefined {
  const raw = useSyncExternalStore(orderStore.subscribe, orderStore.read, () => undefined);
  return useMemo(() => {
    if (raw === undefined) return undefined; // not read yet (server / first paint)
    try {
      const o = raw ? (JSON.parse(raw) as Order) : null;
      return o && o.id === id ? o : null;
    } catch {
      return null;
    }
  }, [raw, id]);
}

/** Confirmation and receipt. Until there is a backend, only the browser that placed the order can show it. */
export function OrderReceipt({ id }: { id: string }) {
  const order = useOrder(id);

  if (order === undefined) return <div style={{ minHeight: "50vh" }} aria-busy="true" />;
  if (order === null) {
    return (
      <div style={{ padding: "60px 0", textAlign: "center" }}>
        <h1 className="font-display" style={{ fontSize: 28, fontWeight: 500 }}>We can&apos;t find that order</h1>
        <p style={{ color: "var(--lux-ink-muted)", margin: "10px 0 20px" }}>Order {id} isn&apos;t saved in this browser.</p>
        <Link href="/shop" className="lux-btn lux-focus">Continue shopping</Link>
      </div>
    );
  }

  const payLabel = payments.find((p) => p.id === order.pay)?.label ?? order.pay;
  const t = order.totals;
  const facts: [string, string][] = [["Order", order.id], ["Payment", payLabel], ["Ship to", order.division], ["Est. delivery", estimateFor(order.intl, order.division)]];

  return (
    <div style={{ maxWidth: 720, margin: "0 auto" }}>
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <div className="lux-glass lux-glass--gold inline-flex items-center justify-center" style={{ width: 72, height: 72, borderRadius: "50%", color: "var(--lux-gold)", margin: "0 auto 20px" }}><Check size={34} /></div>
        <h1 className="font-display" style={{ fontSize: 32, fontWeight: 500, margin: "0 0 8px" }}>Thank you &mdash; order received</h1>
        <p style={{ color: "var(--lux-ink-muted)" }}>Order <strong style={{ color: "var(--lux-gold)" }}>{order.id}</strong>. We&apos;ll confirm it by phone{order.email ? " and email" : ""} shortly.</p>
      </div>

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
          <span style={{ fontWeight: 500 }}>{order.pay === "cod" ? "Total due on delivery" : "Total"}</span>
          <span className="font-display" style={{ fontSize: 24, color: "var(--lux-gold)" }}>{money(t.total)}</span>
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-3.5" style={{ marginTop: 28 }}>
        <Link href="/shop" className="lux-btn-fill lux-focus">Continue shopping</Link>
      </div>
    </div>
  );
}
