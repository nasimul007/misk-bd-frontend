"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Lock, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Field, ariaFor } from "@/components/checkout/Field";
import { Logo } from "@/components/site/Logo";
import { forgotPasswordAction, requestOtpAction, signInAction, signUpAction, verifyOtpAction } from "@/app/actions/auth";
import { setSession, useSession } from "@/lib/auth";
import { bdLocal } from "@/lib/checkout";
import { orderTokens } from "@/lib/orders";

type Method = "phone" | "email";
type View = "signin" | "otp" | "forgot" | "sent";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Phone OTP or email + password. Everything is verified on the server. */
export function LoginForm() {
  const router = useRouter();
  const session = useSession();
  const [method, setMethod] = useState<Method>("phone");
  const [view, setView] = useState<View>("signin");
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [resetTo, setResetTo] = useState("");
  const [error, setError] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (session) router.replace("/account");
  }, [session, router]);

  const fail = (field: string, message: string) => { setError({ [field]: message }); return false; };

  /** Runs a server call with a busy flag, and shows its error under `field`. */
  const run = async <T extends { ok: boolean }>(field: string, call: () => Promise<T | { ok: false; error: string }>): Promise<T | null> => {
    if (busy) return null;
    setBusy(true);
    setError({});
    try {
      const r = await call();
      if (!r.ok) { fail(field, (r as { error: string }).error); return null; }
      return r as T;
    } catch {
      fail(field, "We couldn't reach the server. Please check your connection and try again.");
      return null;
    } finally {
      setBusy(false);
    }
  };

  const sendOtp = async () => {
    if (!/^01[3-9]\d{8}$/.test(bdLocal(phone))) return fail("phone", "Enter a valid 11-digit Bangladeshi number, e.g. 01712 345678.");
    if (await run("phone", () => requestOtpAction(phone))) { setCode(""); setView("otp"); }
  };
  const verifyOtp = async () => {
    if (!/^\d{6}$/.test(code)) return fail("code", "Enter the 6-digit code.");
    const r = await run("code", () => verifyOtpAction(phone, code, orderTokens.refs()));
    if (r && "user" in r) setSession(r.user);
  };
  const emailSubmit = async () => {
    if (!EMAIL.test(email.trim())) return fail("email", "Enter a valid email address.");
    if (!password) return fail("password", "Enter your password.");
    const r = await run("password", () => (creating ? signUpAction(name, email.trim(), password, orderTokens.refs()) : signInAction(email.trim(), password, orderTokens.refs())));
    if (r && "user" in r) setSession(r.user);
  };
  const sendReset = async () => {
    if (!EMAIL.test(resetTo.trim())) return fail("reset", "Enter the email address on your account.");
    if (await run("reset", () => forgotPasswordAction(resetTo.trim()))) setView("sent");
  };

  const tab = (id: Method, label: string) => (
    <button type="button" role="tab" aria-selected={method === id} onClick={() => { setMethod(id); setError({}); }} className="lux-focus"
      style={{ flex: 1, padding: "10px 0", borderRadius: 999, border: "none", cursor: "pointer", fontSize: 13, fontWeight: method === id ? 600 : 400, letterSpacing: "0.04em", background: method === id ? "var(--lux-gold)" : "transparent", color: method === id ? "var(--lux-bg)" : "var(--lux-ink-muted)" }}>
      {label}
    </button>
  );
  const linkBtn = { border: "none", background: "transparent", color: "var(--lux-gold)", cursor: "pointer", fontSize: 13 } as const;
  const stack = { display: "flex", flexDirection: "column", gap: 18 } as const;
  const sub = { margin: "8px 0 0", fontSize: 13.5, color: "var(--lux-ink-muted)", lineHeight: 1.6 } as const;
  const h2 = { margin: 0, color: "var(--lux-ink)", fontSize: 20, fontWeight: 500 } as const;

  return (
    <section className="flex items-center justify-center" style={{ minHeight: "80vh", padding: "48px 24px" }}>
      <div style={{ width: "100%", maxWidth: 480 }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ display: "inline-flex", marginBottom: 12 }}><Logo size={52} /></div>
          <div><Eyebrow>Maison de Parfum</Eyebrow></div>
          <h1 className="font-display" style={{ marginTop: 8, color: "var(--lux-ink)", fontSize: "clamp(1.6rem,4vw,2.2rem)", letterSpacing: "0.12em", fontWeight: 500 }}>MISK BD</h1>
        </div>

        <div className="lux-surface lux-glass--gold" style={{ borderRadius: 24, padding: 32 }}>
          {view === "forgot" && (
            <form style={stack} onSubmit={(e) => { e.preventDefault(); sendReset(); }} noValidate>
              <div>
                <h2 className="font-display" style={h2}>Reset your password</h2>
                <p style={sub}>Enter the email on your account and we&apos;ll send a secure reset link. If you sign in with your phone, just use the phone tab — there&apos;s no password to reset.</p>
              </div>
              <Field id="lg-reset" label="Email" error={error.reset}>
                <input id="lg-reset" type="email" className="lux-input" placeholder="you@example.com" value={resetTo} onChange={(e) => setResetTo(e.target.value)} {...ariaFor("lg-reset", error.reset)} />
              </Field>
              <Button type="submit" disabled={busy} style={{ width: "100%" }}>{busy ? "Sending…" : "Send reset link"}</Button>
              <button type="button" onClick={() => { setView("signin"); setError({}); }} className="lux-focus" style={linkBtn}>&larr; Back to sign in</button>
            </form>
          )}

          {view === "sent" && (
            <div style={{ ...stack, textAlign: "center", alignItems: "center", gap: 14, padding: "8px 0" }}>
              <div className="lux-glass lux-glass--gold inline-flex items-center justify-center" style={{ width: 60, height: 60, borderRadius: "50%", color: "var(--lux-gold)" }}><MailCheck size={28} aria-hidden /></div>
              <h2 className="font-display" style={h2}>Check your inbox</h2>
              <p style={{ ...sub, margin: 0 }}>If an account exists for that email, a reset link is on its way. It expires in 30 minutes.</p>
              <Button variant="outline" onClick={() => setView("signin")}>Back to sign in</Button>
            </div>
          )}

          {view === "otp" && (
            <form style={stack} onSubmit={(e) => { e.preventDefault(); verifyOtp(); }} noValidate>
              <div>
                <h2 className="font-display" style={h2}>Enter your code</h2>
                <p style={sub}>We sent a 6-digit code to {bdLocal(phone)}. It expires in 5 minutes.</p>
              </div>
              <Field id="lg-code" label="One-time code" error={error.code}>
                <input id="lg-code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} className="lux-input" placeholder="123456" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} {...ariaFor("lg-code", error.code)} />
              </Field>
              <Button type="submit" disabled={busy} style={{ width: "100%" }}>{busy ? "Checking…" : "Verify and continue"}</Button>
              <button type="button" onClick={() => { setView("signin"); setError({}); }} className="lux-focus" style={linkBtn}>&larr; Use a different number</button>
            </form>
          )}

          {view === "signin" && (
            <form style={stack} onSubmit={(e) => { e.preventDefault(); if (method === "phone") sendOtp(); else emailSubmit(); }} noValidate>
              <div role="tablist" aria-label="Sign-in method" className="flex" style={{ gap: 4, padding: 4, borderRadius: 999, border: "1px solid var(--lux-line)" }}>
                {tab("phone", "Phone OTP")}
                {tab("email", "Email")}
              </div>

              {method === "phone" ? (
                <>
                  <Field id="lg-phone" label="Phone number" error={error.phone}>
                    <input id="lg-phone" type="tel" autoComplete="tel" className="lux-input" placeholder="01XXX XXXXXX" value={phone} onChange={(e) => setPhone(e.target.value)} {...ariaFor("lg-phone", error.phone)} />
                  </Field>
                  <Button type="submit" disabled={busy} style={{ width: "100%" }}>{busy ? "Sending…" : "Send OTP"}</Button>
                  <p style={{ ...sub, margin: 0, textAlign: "center", fontSize: 12.5 }}>New here? An account is created the first time you verify your number.</p>
                </>
              ) : (
                <>
                  {creating && (
                    <Field id="lg-name" label="Full name" error={error.name}>
                      <input id="lg-name" autoComplete="name" className="lux-input" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
                    </Field>
                  )}
                  <Field id="lg-email" label="Email address" error={error.email}>
                    <input id="lg-email" type="email" autoComplete="email" className="lux-input" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} {...ariaFor("lg-email", error.email)} />
                  </Field>
                  <Field id="lg-pw" label="Password" error={error.password}>
                    <input id="lg-pw" type="password" autoComplete={creating ? "new-password" : "current-password"} className="lux-input" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} {...ariaFor("lg-pw", error.password)} />
                  </Field>
                  {creating && <p style={{ ...sub, margin: "-8px 0 0", fontSize: 12.5 }}>At least 8 characters, with letters and numbers.</p>}
                  {!creating && (
                    <div className="flex justify-end" style={{ marginTop: -8 }}>
                      <button type="button" onClick={() => { setView("forgot"); setError({}); }} className="lux-focus" style={{ ...linkBtn, fontSize: 12 }}>Forgot password?</button>
                    </div>
                  )}
                  <Button type="submit" disabled={busy} style={{ width: "100%" }}>{busy ? "Please wait…" : creating ? "Create account" : "Sign in"}</Button>
                  <p style={{ ...sub, margin: 0, textAlign: "center", fontSize: 13 }}>
                    {creating ? "Already have an account?" : "New here?"}{" "}
                    <button type="button" className="lux-link" style={{ ...linkBtn, textDecoration: "underline" }} onClick={() => { setCreating((c) => !c); setError({}); }}>{creating ? "Sign in" : "Create an account"}</button>
                  </p>
                </>
              )}
              <p style={{ textAlign: "center", fontSize: 13, color: "var(--lux-ink-muted)", margin: 0 }}><Link href="/" className="lux-link">Back to home</Link></p>
            </form>
          )}
        </div>
        <p className="flex items-center justify-center gap-1.5" style={{ textAlign: "center", fontSize: 12, color: "var(--lux-ink-muted)", marginTop: 16 }}>
          <Lock size={12} aria-hidden /> You can also check out as a guest — no account needed.
        </p>
      </div>
    </section>
  );
}
