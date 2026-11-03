"use client";

import { useState } from "react";
import { Check, Link2, MessageCircle, Share2 } from "lucide-react";

/** Share a product: the phone's own share sheet when there is one, otherwise copy the link or send it on WhatsApp. */
export function ShareButton({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);
  const url = () => window.location.href.split("#")[0];

  const share = async () => {
    try {
      if (navigator.share) { await navigator.share({ title, text: `${title} · MISK BD`, url: url() }); return; }
    } catch { return; /* the shopper closed the share sheet */ }
    copy();
  };
  const copy = () => {
    try { void navigator.clipboard?.writeText(url()); } catch {}
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  const chip = { display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 999, border: "1px solid var(--lux-line)", background: "transparent", color: "var(--lux-ink)", fontSize: 13, cursor: "pointer", textDecoration: "none" } as const;

  return (
    <div className="flex flex-wrap items-center gap-2" aria-label="Share this product" role="group">
      <button type="button" onClick={share} className="lux-focus" style={chip}><Share2 size={14} aria-hidden /> Share</button>
      <button type="button" onClick={copy} className="lux-focus" style={chip}>{copied ? <Check size={14} aria-hidden /> : <Link2 size={14} aria-hidden />} {copied ? "Link copied" : "Copy link"}</button>
      <a href="#" onClick={(e) => { e.preventDefault(); window.open(`https://wa.me/?text=${encodeURIComponent(`${title} ${url()}`)}`, "_blank", "noopener,noreferrer"); }} className="lux-focus" style={chip}><MessageCircle size={14} aria-hidden /> WhatsApp</a>
    </div>
  );
}
