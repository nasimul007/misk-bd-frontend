"use client";

import { ShoppingBag } from "lucide-react";
import { cartCount, useCart } from "@/lib/cart";

/** Header bag icon with a live item-count badge. Opens the drawer. */
export function CartButton() {
  const open = useCart((s) => s.openDrawer);
  const hydrated = useCart((s) => s.hydrated);
  const count = useCart((s) => cartCount(s.items));
  return (
    <button type="button" onClick={open} aria-label={hydrated && count ? `Cart, ${count} item${count === 1 ? "" : "s"}` : "Cart"} className="inline-flex items-center justify-center" style={{ position: "relative", width: 42, height: 42, borderRadius: "50%", background: "transparent", border: "none", color: "var(--lux-ink)", cursor: "pointer" }}>
      <ShoppingBag size={19} />
      {hydrated && count > 0 && (
        <span style={{ position: "absolute", right: 4, top: 4, minWidth: 16, height: 16, padding: "0 4px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 999, fontSize: 10, fontWeight: 700, background: "var(--lux-gold)", color: "var(--lux-bg)" }}>{count}</span>
      )}
    </button>
  );
}
