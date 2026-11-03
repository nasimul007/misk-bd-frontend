"use client";

import Link from "next/link";
import { cartCount, cartSubtotal, useCart } from "@/lib/cart";
import { FreeShippingBar } from "./FreeShippingBar";
import { useMoney } from "@/lib/currency";
import { CartLines } from "./CartLines";

/** Full-page cart: the lines on one side, an order summary on the other. */
export function CartPage() {
  const money = useMoney();
  const items = useCart((s) => s.items);
  const hydrated = useCart((s) => s.hydrated);
  const clear = useCart((s) => s.clear);
  const count = cartCount(items);

  return (
    <div className="alignment" style={{ padding: "24px 24px 60px", color: "var(--lux-ink)" }}>
      <div style={{ padding: "4px 0 24px" }}>
        <span className="lux-eyebrow">Your Selection</span>
        <h1 className="font-display" style={{ fontSize: "clamp(1.8rem,4vw,2.6rem)", margin: "8px 0 0", fontWeight: 500 }}>Your Cart</h1>
      </div>
      {!hydrated ? (
        <div style={{ minHeight: "40vh" }} aria-busy="true" />
      ) : (
        <div className="grid items-start gap-8 lg:grid-cols-[1fr_360px]">
          <div><CartLines /></div>
          {items.length > 0 && (
            <aside className="lux-surface flex flex-col gap-4 lg:sticky lg:top-24" style={{ borderRadius: 18, padding: 24 }} aria-label="Order summary">
              <h2 className="font-display" style={{ margin: 0, fontSize: 20, fontWeight: 500 }}>Order summary</h2>
              <div className="flex justify-between" style={{ fontSize: 14, color: "var(--lux-ink-muted)" }}><span>Items ({count})</span><span>{money(cartSubtotal(items))}</span></div>
              <FreeShippingBar subtotal={cartSubtotal(items)} />
              <p style={{ margin: 0, fontSize: 12.5, color: "var(--lux-ink-muted)", lineHeight: 1.6 }}>Shipping and VAT are calculated at checkout.</p>
              <div className="flex justify-between" style={{ borderTop: "1px solid var(--lux-line)", paddingTop: 16 }}>
                <span>Subtotal</span>
                <span className="font-display" style={{ fontSize: 22, color: "var(--lux-gold)" }}>{money(cartSubtotal(items))}</span>
              </div>
              <Link href="/checkout" className="lux-btn-fill lux-focus" style={{ width: "100%", padding: "0.9rem" }}>Proceed to Checkout</Link>
              <button type="button" onClick={clear} style={{ border: "none", background: "transparent", color: "var(--lux-ink-muted)", fontSize: 13, cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3 }}>Clear cart</button>
            </aside>
          )}
        </div>
      )}
    </div>
  );
}
