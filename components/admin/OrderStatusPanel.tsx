"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { setOrderStatusAction } from "@/app/actions/admin";

const LABEL: Record<string, string> = { confirmed: "Confirm order", packed: "Mark packed", shipped: "Mark shipped", delivered: "Mark delivered", returned: "Mark returned", cancelled: "Cancel order" };

export function OrderStatusPanel({ orderNo, next }: { orderNo: string; next: string[] }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (next.length === 0) return <p style={{ margin: 0, color: "var(--lux-ink-muted)", fontSize: 14 }}>This order is closed. No further changes.</p>;

  const apply = async (to: string) => {
    if (busy) return;
    if ((to === "cancelled" || to === "returned") && !window.confirm(`${LABEL[to]}? The items go back into stock.`)) return;
    setBusy(true);
    setError("");
    try {
      const r = await setOrderStatusAction(orderNo, to, note);
      if (r.ok) { setNote(""); router.refresh(); } else setError(r.error);
    } catch {
      setError("We couldn't reach the server. Please try again.");
    }
    setBusy(false);
  };

  return (
    <div className="flex flex-col gap-3">
      <input aria-label="Note (optional)" className="lux-input" placeholder="Note (optional), e.g. courier and tracking no." maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} />
      <div className="flex flex-wrap gap-2">
        {next.map((to) => (
          <button key={to} type="button" disabled={busy} onClick={() => apply(to)} className={to === "cancelled" || to === "returned" ? "lux-btn lux-focus" : "lux-btn-fill lux-focus"} style={{ padding: "0.6rem 1.3rem", fontSize: "0.88rem", opacity: busy ? 0.6 : 1 }}>{LABEL[to] ?? to}</button>
        ))}
      </div>
      {error && <p role="alert" style={{ margin: 0, fontSize: 13, color: "var(--lux-warning)" }}>{error}</p>}
    </div>
  );
}
