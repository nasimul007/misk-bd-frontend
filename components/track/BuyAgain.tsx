"use client";

import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { reorderAction } from "@/app/actions/orders";
import { useCart } from "@/lib/cart";
import type { Proof } from "@/lib/server/orders";

/** Put the items of a past order back in the bag at today's prices, skipping anything no longer available. */
export function BuyAgain({ orderId, proof, size = "md" }: { orderId: string; proof: () => Proof; size?: "sm" | "md" }) {
  const addMany = useCart((s) => s.addMany);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const go = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const r = await reorderAction(orderId, proof());
      if (r.ok) addMany(r.lines, r.skipped); else setError(r.message);
    } catch {
      setError("We couldn't reach the server. Please try again.");
    }
    setBusy(false);
  };
  const pad = size === "sm" ? { padding: "0.4rem 0.9rem", fontSize: "0.8rem" } : undefined;
  return (
    <span className="inline-flex flex-col items-start">
      <button type="button" onClick={go} disabled={busy} className="lux-btn lux-focus inline-flex items-center gap-2" style={pad}><RotateCcw size={size === "sm" ? 13 : 15} aria-hidden /> {busy ? "Adding…" : "Buy again"}</button>
      {error && <span role="alert" style={{ fontSize: 12, color: "var(--lux-warning)", marginTop: 4 }}>{error}</span>}
    </span>
  );
}
