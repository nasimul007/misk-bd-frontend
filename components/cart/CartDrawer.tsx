"use client";

import Link from "next/link";
import { useEffect } from "react";
import { X } from "lucide-react";
import { cartSubtotal, useCart } from "@/lib/cart";
import { useMoney } from "@/lib/currency";
import { CartLines } from "./CartLines";
import { FreeShippingBar } from "./FreeShippingBar";

/** Slide-in cart. Closes on Esc, backdrop click, or when a link inside is followed. */
export function CartDrawer() {
  const money = useMoney();
  const open = useCart((s) => s.drawerOpen);
  const close = useCart((s) => s.closeDrawer);
  const items = useCart((s) => s.items);

  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [open, close]);

  return (
    <div inert={!open} style={{ position: "fixed", inset: 0, zIndex: 70, pointerEvents: open ? "auto" : "none" }}>
      <div onClick={close} style={{ position: "absolute", inset: 0, background: "var(--lux-scrim)", opacity: open ? 1 : 0, transition: "opacity var(--dur-slow) var(--ease-lux)" }} />
      <aside role="dialog" aria-modal="true" aria-label="Your cart" className="glass-panel flex flex-col" style={{ position: "absolute", top: 0, right: 0, height: "100%", width: "min(420px, 92vw)", transform: open ? "translateX(0)" : "translateX(100%)", transition: "transform var(--dur-slow) var(--ease-lux)", borderLeft: "1px solid var(--lux-line)" }}>
        <div className="flex items-center justify-between" style={{ padding: "22px 24px", borderBottom: "1px solid var(--lux-line)" }}>
          <h2 className="font-display" style={{ margin: 0, color: "var(--lux-ink)", fontSize: 20, fontWeight: 500, letterSpacing: "0.06em" }}>Your Cart</h2>
          <button type="button" onClick={close} aria-label="Close cart" style={{ background: "none", border: "none", color: "var(--lux-ink)", cursor: "pointer" }}><X size={20} /></button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: 24 }}><CartLines onNavigate={close} /></div>
        <div style={{ borderTop: "1px solid var(--lux-line)", padding: 24 }}>
          {items.length > 0 && <div style={{ marginBottom: 16 }}><FreeShippingBar subtotal={cartSubtotal(items)} /></div>}
          <div className="flex justify-between" style={{ marginBottom: 16 }}>
            <span style={{ color: "var(--lux-ink-muted)" }}>Subtotal</span>
            <span className="font-display" style={{ fontSize: 20, color: "var(--lux-gold)" }}>{money(cartSubtotal(items))}</span>
          </div>
          <div className="flex flex-col gap-2.5">
            <Link href="/checkout" onClick={close} aria-disabled={!items.length} tabIndex={items.length ? 0 : -1} className="lux-btn-fill lux-focus" style={{ width: "100%", padding: "0.9rem", pointerEvents: items.length ? "auto" : "none", opacity: items.length ? 1 : 0.55 }}>Proceed to Checkout</Link>
            <Link href="/cart" onClick={close} className="lux-link" style={{ textAlign: "center", fontSize: 13 }}>View full cart</Link>
          </div>
        </div>
      </aside>
    </div>
  );
}
