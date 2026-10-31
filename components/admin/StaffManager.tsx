"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/checkout/Field";
import { createStaffAction, resetStaffPasswordAction, setStaffActiveAction } from "@/app/actions/admin";

export type StaffRow = { id: string; username: string; name: string; role: string; active: boolean; lastLogin: string };

export function StaffManager({ rows, meId }: { rows: StaffRow[]; meId: string }) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<{ ok: boolean; error?: string }>, ok?: string, done?: () => void) => {
    if (busy) return;
    setBusy(true);
    setError("");
    setNote("");
    try {
      const r = await fn();
      if (r.ok) { done?.(); setNote(ok ?? ""); router.refresh(); } else setError(r.error ?? "That didn't work.");
    } catch {
      setError("We couldn't reach the server. Please try again.");
    }
    setBusy(false);
  };
  const reset = (s: StaffRow) => {
    const pw = window.prompt(`New one-time password for ${s.username} (10+ characters, letters and numbers). They must change it at next sign-in.`);
    if (pw) run(() => resetStaffPasswordAction(s.id, pw), `Password reset for ${s.username}. Share it with them privately.`);
  };

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={(e) => { e.preventDefault(); run(() => createStaffAction(username, name, password), `Created ${username}. Share the one-time password privately.`, () => { setUsername(""); setName(""); setPassword(""); }); }} noValidate className="lux-surface flex flex-col gap-4" style={{ borderRadius: 16, padding: 20, maxWidth: 720 }}>
        <h2 style={{ margin: 0, fontSize: 13, textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--lux-ink-muted)", fontWeight: 500 }}>Add an admin</h2>
        <div className="grid gap-3.5 sm:grid-cols-3">
          <Field id="st-name" label="Full name"><input id="st-name" className="lux-input" maxLength={80} value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <Field id="st-user" label="Username"><input id="st-user" autoCapitalize="none" className="lux-input" maxLength={32} value={username} onChange={(e) => setUsername(e.target.value)} /></Field>
          <Field id="st-pw" label="One-time password"><input id="st-pw" type="text" autoComplete="off" className="lux-input" value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
        </div>
        <div className="flex items-center gap-3"><Button type="submit" size="sm" disabled={busy}>Create admin</Button></div>
      </form>
      {error && <p role="alert" style={{ margin: 0, fontSize: 14, color: "var(--lux-warning)" }}>{error}</p>}
      {note && <p role="status" style={{ margin: 0, fontSize: 14, color: "var(--lux-success)" }}>{note}</p>}

      <div className="flex flex-col gap-3">
        {rows.map((s) => (
          <div key={s.id} className="lux-surface flex flex-wrap items-center gap-3" style={{ borderRadius: 14, padding: "14px 18px" }}>
            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ fontWeight: 600 }}>{s.name} <span style={{ color: "var(--lux-ink-muted)", fontWeight: 400 }}>@{s.username}</span> {s.role === "owner" ? <Badge tone="gold">Owner</Badge> : s.active ? <Badge tone="success">Active</Badge> : <Badge tone="glass">Disabled</Badge>}</div>
              <div style={{ fontSize: 13, color: "var(--lux-ink-muted)", marginTop: 3 }}>Last sign-in: {s.lastLogin}</div>
            </div>
            {s.role !== "owner" && <Button variant="ghost" size="sm" disabled={busy} onClick={() => reset(s)}>Reset password</Button>}
            {s.role !== "owner" && s.id !== meId && <Button variant="ghost" size="sm" disabled={busy} onClick={() => run(() => setStaffActiveAction(s.id, !s.active), `${s.username} ${s.active ? "disabled and signed out" : "enabled"}.`)}>{s.active ? "Disable" : "Enable"}</Button>}
          </div>
        ))}
      </div>
    </div>
  );
}
