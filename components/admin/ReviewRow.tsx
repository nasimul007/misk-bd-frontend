"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Star } from "lucide-react";
import { deleteReviewAction, setReviewVisibleAction } from "@/app/actions/admin";
import { Badge } from "@/components/ui/Badge";

export function ReviewRow(p: { id: string; product: string; productSlug: string; author: string; rating: number; comment: string; visible: boolean; when: string; order: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const run = async (fn: () => Promise<{ ok: boolean; error?: string }>) => {
    if (busy) return;
    setBusy(true);
    setError("");
    try { const r = await fn(); if (r.ok) router.refresh(); else setError(r.error ?? "That didn't work."); } catch { setError("Couldn't reach the server."); }
    setBusy(false);
  };
  const ghost = { padding: "0.4rem 0.9rem", fontSize: "0.8rem" };
  return (
    <li style={{ padding: "16px 0", borderBottom: "1px solid var(--lux-line)", opacity: p.visible ? 1 : 0.65 }}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <span className="inline-flex gap-0.5" style={{ color: "var(--lux-gold)" }} aria-label={`${p.rating} out of 5`}>{[1, 2, 3, 4, 5].map((n) => <Star key={n} size={14} fill={n <= p.rating ? "currentColor" : "none"} />)}</span>
        <Link href={`/product/${p.productSlug}`} className="lux-link" style={{ fontSize: 14.5 }}>{p.product}</Link>
        <span style={{ fontSize: 13, color: "var(--lux-ink-muted)" }}>{p.author} · {p.when}{p.order ? ` · ${p.order}` : ""}</span>
        {!p.visible && <Badge tone="glass">Hidden</Badge>}
      </div>
      {p.comment && <p style={{ margin: "8px 0 0", fontSize: 14.5, lineHeight: 1.6 }}>{p.comment}</p>}
      <div className="flex flex-wrap gap-2" style={{ marginTop: 10 }}>
        <button type="button" className="lux-btn lux-focus" style={ghost} disabled={busy} onClick={() => run(() => setReviewVisibleAction(p.id, !p.visible))}>{p.visible ? "Hide" : "Show"}</button>
        <button type="button" className="lux-btn lux-focus" style={{ ...ghost, color: "var(--lux-danger)" }} disabled={busy} onClick={() => { if (window.confirm("Delete this review permanently?")) run(() => deleteReviewAction(p.id)); }}>Delete</button>
      </div>
      {error && <p role="alert" style={{ margin: "8px 0 0", fontSize: 13, color: "var(--lux-warning)" }}>{error}</p>}
    </li>
  );
}
