"use client";

import { useState } from "react";
import { cancelOrderAction, requestReturnAction, retryPaymentAction } from "@/app/actions/orders";
import type { Order } from "@/lib/orders";
import type { Proof } from "@/lib/server/orders";

const note = { margin: "10px 0 0", fontSize: 13.5, color: "var(--lux-ink-muted)", lineHeight: 1.6 } as const;

/**
 * What a customer can do with an order from its page: pay online (Cash on Delivery orders), cancel it while
 * the shop's policy allows, or ask to return it once delivered. The server decides what is allowed
 * (the `can…` flags on the order) and checks again when the button is pressed.
 */
export function OrderActions({ order, proof, onUpdate }: { order: Order; proof: () => Proof; onUpdate: (o: Order) => void }) {
  const [open, setOpen] = useState<"cancel" | "return" | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const run = async (fn: () => Promise<{ ok: boolean }>) => {
    if (busy) return;
    setBusy(true);
    setError("");
    try { await fn(); } catch { setError("We couldn't reach the server. Please try again."); }
    setBusy(false);
  };

  const payOnline = () => run(async () => {
    const r = await retryPaymentAction(order.id, proof());
    if (r.ok) window.location.assign(r.url); else setError(r.reason);
    return r;
  });
  const settle = (act: typeof cancelOrderAction) => run(async () => {
    const r = await act(order.id, proof(), reason);
    if (r.ok) { onUpdate(r.order); setOpen(null); setReason(""); } else setError(r.message);
    return r;
  });

  const paid = order.payStatus === "paid";
  const any = order.canPayOnline || order.canCancel || order.canReturn || order.returnRequested || (order.status === "cancelled" && paid);
  if (!any) return null;

  return (
    <section aria-label="Order options" className="lux-surface" style={{ borderRadius: 18, padding: 22, marginTop: 22 }}>
      <div className="flex flex-wrap items-center gap-3">
        {order.canPayOnline && <button type="button" onClick={payOnline} disabled={busy} className="lux-btn-fill lux-focus">{busy && !open ? "Opening payment…" : "Pay online now"}</button>}
        {order.canCancel && open !== "cancel" && <button type="button" onClick={() => { setOpen("cancel"); setError(""); }} className="lux-btn lux-focus">Cancel order</button>}
        {order.canReturn && open !== "return" && <button type="button" onClick={() => { setOpen("return"); setError(""); }} className="lux-btn lux-focus">Request a return</button>}
      </div>
      {order.canPayOnline && !open && <p style={note}>Prefer to pay before delivery? Pay by card or mobile banking now. If you change your mind, you can still pay cash when it arrives.</p>}

      {open === "cancel" && (
        <div style={{ marginTop: 14 }}>
          <p style={{ margin: "0 0 8px", fontSize: 14 }}>Cancel order {order.id}? {paid ? "You paid online, so we'll refund you once we've processed the cancellation." : "Nothing will be charged."}</p>
          <textarea aria-label="Reason (optional)" rows={2} maxLength={200} className="lux-input" placeholder="Reason (optional)" value={reason} onChange={(e) => setReason(e.target.value)} />
          <div className="flex gap-3" style={{ marginTop: 10 }}>
            <button type="button" disabled={busy} onClick={() => settle(cancelOrderAction)} className="lux-btn-fill lux-focus">{busy ? "Cancelling…" : "Yes, cancel my order"}</button>
            <button type="button" disabled={busy} onClick={() => { setOpen(null); setError(""); }} className="lux-btn lux-focus">Keep my order</button>
          </div>
        </div>
      )}

      {open === "return" && (
        <div style={{ marginTop: 14 }}>
          <p style={{ margin: "0 0 8px", fontSize: 14 }}>Tell us why you&apos;d like to return {order.id}. We&apos;ll contact you to arrange the pick-up and your refund.</p>
          <textarea aria-label="Reason for the return" rows={3} maxLength={300} className="lux-input" placeholder="e.g. the bottle arrived damaged" value={reason} onChange={(e) => setReason(e.target.value)} />
          <div className="flex gap-3" style={{ marginTop: 10 }}>
            <button type="button" disabled={busy} onClick={() => settle(requestReturnAction)} className="lux-btn-fill lux-focus">{busy ? "Sending…" : "Send return request"}</button>
            <button type="button" disabled={busy} onClick={() => { setOpen(null); setError(""); }} className="lux-btn lux-focus">Never mind</button>
          </div>
        </div>
      )}

      {order.returnRequested && <p style={{ ...note, marginTop: 0 }}>Return requested. We&apos;ll contact you shortly to arrange it.</p>}
      {order.status === "cancelled" && paid && <p style={{ ...note, marginTop: 0 }}>This order was cancelled. Your online payment will be refunded.</p>}
      {error && <p role="alert" style={{ margin: "10px 0 0", fontSize: 13.5, color: "var(--lux-warning)" }}>{error}</p>}
    </section>
  );
}
