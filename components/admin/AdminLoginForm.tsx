"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, ariaFor } from "@/components/checkout/Field";
import { adminLoginAction } from "@/app/actions/admin";

export function AdminLoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const r = await adminLoginAction(username, password);
      if (r.ok) { router.replace("/admin"); router.refresh(); return; }
      setError(r.error);
    } catch {
      setError("We couldn't reach the server. Please try again.");
    }
    setBusy(false);
  };

  return (
    <form onSubmit={submit} noValidate className="lux-surface lux-glass--gold flex flex-col gap-[18px]" style={{ borderRadius: 24, padding: 32, width: "100%", maxWidth: 420 }}>
      <h1 className="font-display" style={{ margin: 0, fontSize: 24, fontWeight: 500 }}>Staff sign in</h1>
      <Field id="ad-user" label="Username"><input id="ad-user" autoComplete="username" autoCapitalize="none" className="lux-input" value={username} onChange={(e) => setUsername(e.target.value)} /></Field>
      <Field id="ad-pass" label="Password" error={error}><input id="ad-pass" type="password" autoComplete="current-password" className="lux-input" value={password} onChange={(e) => setPassword(e.target.value)} {...ariaFor("ad-pass", error)} /></Field>
      <Button type="submit" disabled={busy} style={{ width: "100%" }}>{busy ? "Signing in…" : "Sign in"}</Button>
    </form>
  );
}
