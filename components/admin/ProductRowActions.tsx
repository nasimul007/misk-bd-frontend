"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { adjustStockAction, setProductActiveAction } from "@/app/actions/admin";

const iconBtn = { width: 30, height: 30, borderRadius: 8, border: "1px solid var(--lux-line)", background: "transparent", color: "var(--lux-ink)", cursor: "pointer", fontSize: 16 } as const;

/** The prototype's stock stepper. Each click is a logged adjustment. */
export function StockStepper({ slug, stock }: { slug: string; stock: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const step = async (d: number) => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const r = await adjustStockAction(slug, d, "Manual adjustment");
      if (r.ok) router.refresh(); else setError(r.error);
    } catch {
      setError("Couldn't reach the server.");
    }
    setBusy(false);
  };
  return (
    <div>
      <div className="flex items-center gap-2">
        <button type="button" style={iconBtn} disabled={busy || stock === 0} onClick={() => step(-1)} aria-label="Decrease stock">−</button>
        <span style={{ minWidth: 26, textAlign: "center" }}>{stock}</span>
        <button type="button" style={iconBtn} disabled={busy} onClick={() => step(1)} aria-label="Increase stock">+</button>
      </div>
      {error && <p role="alert" style={{ margin: "4px 0 0", fontSize: 12, color: "var(--lux-warning)" }}>{error}</p>}
    </div>
  );
}

export function ProductActions({ slug, active }: { slug: string; active: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const toggle = async () => {
    if (busy) return;
    setBusy(true);
    try { const r = await setProductActiveAction(slug, !active); if (r.ok) router.refresh(); } catch {}
    setBusy(false);
  };
  const ghost = { padding: "0.4rem 0.9rem", fontSize: "0.8rem" };
  return (
    <div className="flex gap-2">
      <Link href={`/admin/products/${slug}`} className="lux-btn lux-focus" style={ghost}>Edit</Link>
      <button type="button" className="lux-btn lux-focus" style={{ ...ghost, opacity: busy ? 0.6 : 1 }} disabled={busy} onClick={toggle}>{active ? "Archive" : "Restore"}</button>
    </div>
  );
}
