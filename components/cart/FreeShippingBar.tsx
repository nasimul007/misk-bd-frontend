"use client";

import { Truck } from "lucide-react";
import { shipping } from "@/lib/config";
import { useMoney } from "@/lib/currency";

/** "Add ৳820 more for free delivery": a nudge towards the free-shipping threshold (Bangladesh orders). */
export function FreeShippingBar({ subtotal }: { subtotal: number }) {
  const money = useMoney();
  const goal = shipping.freeThreshold;
  const left = Math.max(0, goal - subtotal);
  const pct = Math.min(100, Math.round((subtotal / goal) * 100));
  return (
    <div role="group" aria-label="Free delivery progress">
      <p className="flex items-center gap-2" style={{ margin: "0 0 8px", fontSize: 13.5, color: left === 0 ? "var(--lux-success)" : "var(--lux-ink)" }}>
        <Truck size={16} aria-hidden />
        {left === 0 ? "You've unlocked free delivery inside Bangladesh." : <>Add <strong style={{ color: "var(--lux-gold)" }}>{money(left)}</strong> more for free delivery.</>}
      </p>
      <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={`${pct}% of the way to free delivery`} style={{ height: 6, borderRadius: 999, background: "var(--lux-line)", overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", borderRadius: 999, background: left === 0 ? "var(--lux-success)" : "var(--lux-gold)", transition: "width var(--dur-mid) var(--ease-lux)" }} />
      </div>
    </div>
  );
}
