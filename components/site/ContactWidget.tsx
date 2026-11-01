"use client";

import { Mail, MessageCircle, X } from "lucide-react";
import { useState } from "react";

/** Floating corner messaging button: a WhatsApp link and an email link in a small card. */
export function ContactWidget({ phone, whatsapp, email, brand = "Misk BD" }: { phone: string; whatsapp: string; email: string; brand?: string }) {
  const [open, setOpen] = useState(false);
  const wa = whatsapp.replace(/\D/g, "");
  const row = { display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 14, border: "1px solid var(--lux-line)", textDecoration: "none" } as const;
  const dot = { width: 38, height: 38, borderRadius: "50%", flex: "none", display: "inline-flex", alignItems: "center", justifyContent: "center" } as const;
  const title = { display: "block", color: "var(--lux-ink)", fontWeight: 600, fontSize: 14 } as const;
  const sub = { display: "block", color: "var(--lux-ink-muted)", fontSize: 12 } as const;
  return (
    <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 80, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 14, pointerEvents: "none" }}>
      <div role="dialog" aria-label={`Contact ${brand}`} aria-hidden={!open}
        style={{ width: 288, transformOrigin: "bottom right", transform: open ? "scale(1) translateY(0)" : "scale(0.92) translateY(10px)", opacity: open ? 1 : 0, pointerEvents: open ? "auto" : "none", transition: "opacity var(--dur-mid) var(--ease-lux), transform var(--dur-mid) var(--ease-lux)" }}>
        <div className="lux-surface lux-glass--gold" style={{ borderRadius: 20, padding: 18, background: "var(--lux-bg-2)" }}>
          <div className="flex items-start justify-between gap-2.5" style={{ marginBottom: 4 }}>
            <div>
              <div className="lux-eyebrow">We&apos;re here to help</div>
              <div className="font-display" style={{ color: "var(--lux-ink)", fontSize: 19, marginTop: 4 }}>Message {brand}</div>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close" tabIndex={open ? 0 : -1} style={{ border: "none", background: "transparent", color: "var(--lux-ink-muted)", cursor: "pointer", display: "inline-flex", padding: 4 }}><X size={18} /></button>
          </div>
          <p style={{ margin: "6px 0 14px", fontSize: 13, lineHeight: 1.6, color: "var(--lux-ink-muted)" }}>Reach us on WhatsApp for the quickest reply, or send an email — we usually respond within a few hours.</p>
          <div className="flex flex-col gap-2.5">
            {wa && (
              <a href={`https://wa.me/${wa}?text=${encodeURIComponent("Hello Misk BD, I'd like to ask about a fragrance.")}`} target="_blank" rel="noopener noreferrer" className="lux-focus" style={row} tabIndex={open ? 0 : -1}>
                <span style={{ ...dot, background: "#25D366", color: "#0b2e17" }}><MessageCircle size={20} /></span>
                <span><span style={title}>Chat on WhatsApp</span><span style={sub}>{phone}</span></span>
              </a>
            )}
            <a href={`mailto:${email}`} className="lux-focus" style={row} tabIndex={open ? 0 : -1}>
              <span style={{ ...dot, background: "var(--lux-gold-soft)", color: "var(--lux-gold)" }}><Mail size={18} /></span>
              <span><span style={title}>Email us</span><span style={sub}>{email}</span></span>
            </a>
          </div>
        </div>
      </div>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-label={open ? "Close contact menu" : "Message us"} aria-expanded={open} className="lux-focus lux-glass"
        style={{ alignSelf: "flex-end", display: "inline-flex", alignItems: "center", justifyContent: "center", width: 52, height: 52, borderRadius: "50%", cursor: "pointer", pointerEvents: "auto", border: "1px solid var(--lux-line)", background: "var(--lux-bg-2)", color: "var(--lux-gold)", boxShadow: "0 10px 30px -14px rgba(0,0,0,.55)" }}>
        <span style={{ display: "inline-flex", transition: "transform var(--dur-mid) var(--ease-lux)", transform: open ? "rotate(90deg)" : "none" }}>{open ? <X size={21} /> : <MessageCircle size={21} />}</span>
      </button>
    </div>
  );
}
