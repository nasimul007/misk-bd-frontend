"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, ariaFor } from "@/components/checkout/Field";
import { changePasswordAction } from "@/app/actions/admin";

export function ChangePasswordForm({ forced = false }: { forced?: boolean }) {
  const router = useRouter();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (next !== confirm) return setError("The two new passwords don't match.");
    setBusy(true);
    setError("");
    try {
      const r = await changePasswordAction(current, next);
      if (r.ok) { setDone(true); setCurrent(""); setNext(""); setConfirm(""); router.refresh(); }
      else setError(r.error);
    } catch {
      setError("We couldn't reach the server. Please try again.");
    }
    setBusy(false);
  };

  return (
    <form onSubmit={submit} noValidate className="lux-surface flex flex-col gap-4" style={{ borderRadius: 18, padding: 24, maxWidth: 440 }}>
      {forced && <p style={{ margin: 0, color: "var(--lux-warning)", fontSize: 14 }}>You&apos;re using a one-time password. Choose your own to continue.</p>}
      <Field id="cp-cur" label="Current password"><input id="cp-cur" type="password" autoComplete="current-password" className="lux-input" value={current} onChange={(e) => setCurrent(e.target.value)} /></Field>
      <Field id="cp-new" label="New password"><input id="cp-new" type="password" autoComplete="new-password" className="lux-input" value={next} onChange={(e) => setNext(e.target.value)} /></Field>
      <Field id="cp-conf" label="Confirm new password" error={error}><input id="cp-conf" type="password" autoComplete="new-password" className="lux-input" value={confirm} onChange={(e) => setConfirm(e.target.value)} {...ariaFor("cp-conf", error)} /></Field>
      <p style={{ margin: 0, fontSize: 12.5, color: "var(--lux-ink-muted)" }}>At least 10 characters, with letters and numbers, not containing your username.</p>
      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" disabled={busy}>{busy ? "Saving…" : "Change password"}</Button>
        {done && <span role="status" style={{ fontSize: 13, color: "var(--lux-success)" }}>Password changed</span>}
      </div>
    </form>
  );
}
