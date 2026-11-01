"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { setOrderStatusAction } from "@/app/actions/admin";
import { StatusBadge } from "@/components/admin/ui";

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Status badge plus a dropdown of the moves allowed from here, like the prototype's orders table. */
export function OrderStatusSelect({ orderNo, status, next }: { orderNo: string; status: string; next: string[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const change = async (to: string) => {
    if (!to || busy) return;
    if ((to === "cancelled" || to === "returned") && !window.confirm(`Mark ${orderNo} as ${to}? The items go back into stock.`)) return;
    setBusy(true);
    setError("");
    try {
      const r = await setOrderStatusAction(orderNo, to, "");
      if (r.ok) router.refresh(); else setError(r.error);
    } catch {
      setError("Couldn't reach the server.");
    }
    setBusy(false);
  };

  return (
    <div>
      <div className="flex items-center gap-2">
        <StatusBadge status={status} />
        {next.length > 0 && (
          <select aria-label={`Change status of ${orderNo}`} value="" disabled={busy} onChange={(e) => change(e.target.value)}
            style={{ padding: "6px 8px", borderRadius: 8, border: "1px solid var(--lux-line)", background: "var(--lux-bg-2)", color: "var(--lux-ink)", fontSize: 12, opacity: busy ? 0.6 : 1 }}>
            <option value="">{busy ? "Saving…" : "Change status"}</option>
            {next.map((s) => <option key={s} value={s}>{cap(s)}</option>)}
          </select>
        )}
      </div>
      {error && <p role="alert" style={{ margin: "4px 0 0", fontSize: 12, color: "var(--lux-warning)" }}>{error}</p>}
    </div>
  );
}
