"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, ariaFor } from "@/components/checkout/Field";
import { resetPasswordAction } from "@/app/actions/auth";
import { setSession } from "@/lib/auth";

export function ResetPasswordForm() {
  const router = useRouter();
  const token = useSearchParams().get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (password !== confirm) return setError("The two passwords don't match.");
    setBusy(true);
    setError("");
    try {
      const r = await resetPasswordAction(token, password);
      if (r.ok) { setSession(r.user); router.replace("/account"); return; }
      setError(r.error);
    } catch {
      setError("We couldn't reach the server. Please try again.");
    }
    setBusy(false);
  };

  if (!token) {
    return (
      <div style={{ textAlign: "center" }}>
        <h1 className="font-display" style={{ fontSize: 26, fontWeight: 500 }}>This reset link isn&apos;t valid</h1>
        <p style={{ color: "var(--lux-ink-muted)", margin: "10px 0 20px" }}>Ask for a new link from the sign-in page.</p>
        <Link href="/login" className="lux-btn lux-focus">Back to sign in</Link>
      </div>
    );
  }
  return (
    <form onSubmit={submit} noValidate className="lux-surface lux-glass--gold flex flex-col gap-[18px]" style={{ borderRadius: 24, padding: 32, maxWidth: 440, margin: "0 auto" }}>
      <h1 className="font-display" style={{ margin: 0, fontSize: 24, fontWeight: 500 }}>Choose a new password</h1>
      <Field id="rp-pw" label="New password"><input id="rp-pw" type="password" autoComplete="new-password" className="lux-input" value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
      <Field id="rp-confirm" label="Confirm password" error={error}><input id="rp-confirm" type="password" autoComplete="new-password" className="lux-input" value={confirm} onChange={(e) => setConfirm(e.target.value)} {...ariaFor("rp-confirm", error)} /></Field>
      <p style={{ margin: "-8px 0 0", fontSize: 12.5, color: "var(--lux-ink-muted)" }}>At least 8 characters, with letters and numbers.</p>
      <Button type="submit" disabled={busy} style={{ width: "100%" }}>{busy ? "Saving…" : "Save password"}</Button>
    </form>
  );
}
