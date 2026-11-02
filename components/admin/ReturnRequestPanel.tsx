"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { closeReturnRequestAction } from "@/app/actions/admin";

/** A customer's open return request. Accepting it means marking the order Returned; this just lets staff dismiss it. */
export function ReturnRequestPanel({ orderNo, reason, when }: { orderNo: string; reason: string; when: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const dismiss = async () => {
    if (busy || !window.confirm("Dismiss this return request? The order stays as it is.")) return;
    setBusy(true);
    setError("");
    try { const r = await closeReturnRequestAction(orderNo); if (r.ok) router.refresh(); else setError(r.error); } catch { setError("Couldn't reach the server."); }
    setBusy(false);
  };
  return (
    <div>
      <p style={{ margin: "0 0 4px", fontSize: 12, color: "var(--lux-ink-muted)" }}>Requested {when}</p>
      <p style={{ margin: "0 0 12px", fontSize: 14.5, lineHeight: 1.6 }}>&ldquo;{reason}&rdquo;</p>
      <p style={{ margin: "0 0 12px", fontSize: 13, color: "var(--lux-ink-muted)" }}>To accept it, contact the customer and mark the order Returned below. That puts the items back in stock.</p>
      <button type="button" onClick={dismiss} disabled={busy} className="lux-btn lux-focus" style={{ padding: "0.45rem 1.1rem", fontSize: "0.82rem" }}>Dismiss request</button>
      {error && <p role="alert" style={{ margin: "8px 0 0", fontSize: 13, color: "var(--lux-warning)" }}>{error}</p>}
    </div>
  );
}
