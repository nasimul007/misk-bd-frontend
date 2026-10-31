import Link from "next/link";
import { Lock, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import type { SiteContent } from "@/lib/types";
import { Logo } from "./Logo";
import { Year } from "./Year";

const cats = ["Men's Perfume", "Women's Perfume", "Unisex", "Cologne", "Premium"];
const help = [["Authenticity Guarantee", "/authenticity"], ["Shipping & Delivery", "/shipping"], ["Returns & Refunds", "/returns"], ["About Us", "/about"]];
const legal = [["Terms & Conditions", "/terms"], ["Privacy Policy", "/privacy"], ["Refund Policy", "/returns"], ["Warranty Policy", "/warranty"]];

const link = { color: "var(--lux-ink-muted)", fontSize: 14, textDecoration: "none" } as const;
const head = { color: "var(--lux-ink)", fontWeight: 500, fontSize: 13, textTransform: "uppercase", letterSpacing: "0.16em", marginBottom: 6 } as const;
const col = { display: "flex", flexDirection: "column", gap: 10 } as const;

const FbIcon = () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" /></svg>);
const IgIcon = () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden><rect x="2" y="2" width="20" height="20" rx="5" /><circle cx="12" cy="12" r="4" /><path d="M17.5 6.5h.01" /></svg>);

export function Footer({ content }: { content: SiteContent["footer"] }) {
  const f = content;
  const wa = f.whatsapp.replace(/\D/g, "");
  return (
    <footer style={{ marginTop: 80, borderTop: "1px solid var(--lux-line)", background: "var(--lux-bg-3)" }}>
      <div className="alignment" style={{ padding: "56px 24px 48px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 32, marginBottom: 32 }}>
          <div style={col}>
            <div className="flex items-center gap-2" style={{ marginBottom: 4 }}>
              <Logo size={40} />
              <span className="font-display" style={{ color: "var(--lux-ink)", fontSize: 20, letterSpacing: "0.14em" }}>MISK BD</span>
            </div>
            <p style={{ color: "var(--lux-ink-muted)", fontSize: 14, lineHeight: 1.7, maxWidth: 280 }}>{f.description}</p>
            <div className="flex gap-3" style={{ marginTop: 8 }}>
              <a href={f.facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="lux-glass" style={{ padding: 10, borderRadius: "50%", display: "inline-flex", color: "var(--lux-gold)" }}><FbIcon /></a>
              <a href={f.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="lux-glass" style={{ padding: 10, borderRadius: "50%", display: "inline-flex", color: "var(--lux-gold)" }}><IgIcon /></a>
            </div>
          </div>
          <div style={col}><h3 style={head}>Categories</h3>{cats.map((c) => <Link key={c} href={`/shop?category=${encodeURIComponent(c)}`} style={link}>{c}</Link>)}</div>
          <div style={col}><h3 style={head}>Help</h3>{help.map(([t, h]) => <Link key={t} href={h} style={link}>{t}</Link>)}</div>
          <div style={col}>
            <h3 style={head}>Contact Us</h3>
            <span style={{ ...link, display: "flex", gap: 10, alignItems: "flex-start" }}><MapPin size={17} /> {f.address}</span>
            <a href={`tel:${f.phone.replace(/\s/g, "")}`} style={{ ...link, display: "flex", gap: 10, alignItems: "center" }}><Phone size={17} /> {f.phone}</a>
            {wa && <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer" style={{ ...link, display: "flex", gap: 10, alignItems: "center" }}><MessageCircle size={17} /> WhatsApp chat</a>}
            <a href={`mailto:${f.email}`} style={{ ...link, display: "flex", gap: 10, alignItems: "center" }}><Mail size={17} /> {f.email}</a>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4" style={{ borderTop: "1px solid var(--lux-line)", paddingTop: 22 }}>
          <div className="flex flex-wrap gap-[18px]">{legal.map(([t, h]) => <Link key={t} href={h} style={{ ...link, fontSize: 13 }}>{t}</Link>)}</div>
          <div className="flex items-center gap-2" style={{ color: "var(--lux-ink-muted)", fontSize: 12 }}><Lock size={13} /> Secure checkout &middot; bKash &middot; SSLCommerz &middot; COD</div>
        </div>
        <div style={{ paddingTop: 22, color: "var(--lux-ink-muted)", fontSize: 13 }}>&copy; <Year /> Misk BD. All rights reserved.</div>
      </div>
    </footer>
  );
}
