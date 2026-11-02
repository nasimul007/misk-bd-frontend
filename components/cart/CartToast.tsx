"use client";

import { useEffect } from "react";
import { Check } from "lucide-react";
import { useCart } from "@/lib/cart";

/** Short confirmation after adding to the cart. Fades after a few seconds. */
export function CartToast() {
  const toast = useCart((s) => s.toast);
  const dismiss = useCart((s) => s.dismissToast);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(dismiss, 2600);
    return () => clearTimeout(t);
  }, [toast, dismiss]);

  if (!toast) return null;
  return (
    <div role="status" style={{ position: "fixed", top: 110, left: "50%", transform: "translateX(-50%)", zIndex: 60, maxWidth: "92vw" }}>
      <div className="flex items-center gap-2.5" style={{ borderRadius: 14, padding: "12px 20px", color: "var(--lux-ink)", fontSize: 14, fontWeight: 500, background: "var(--lux-bg-2)", border: "1px solid var(--lux-gold)", boxShadow: "0 14px 40px -12px rgba(0,0,0,0.55)" }}>
        <Check size={16} color="var(--lux-gold)" /> {toast}
      </div>
    </div>
  );
}
