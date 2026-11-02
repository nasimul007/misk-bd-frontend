"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useSession } from "@/lib/auth";
import { ChevronDown, Menu, Phone, MessageCircle, Plane, Search, User, X } from "lucide-react";
import type { Section } from "@/lib/types";
import { ModeToggle } from "@/components/ui/ModeToggle";
import { CurrencyToggle } from "@/components/ui/CurrencyToggle";
import { CartButton } from "@/components/cart/CartButton";
import { Logo } from "./Logo";

const links = [
  { href: "/shop", label: "Shop" },
  { href: "/shop?best=1", label: "Best Sellers" },
  { href: "/authenticity", label: "Authenticity" },
];

const btn = "items-center justify-center";
const iconBtn = { width: 42, height: 42, borderRadius: "50%", background: "transparent", border: "none", color: "var(--lux-ink)", cursor: "pointer" } as const;

/** Maison top bar: announcement strip, glass navbar that frosts on scroll, mobile menu. */
export function Header({ sections = [] }: { sections?: Section[] }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [coll, setColl] = useState(false);
  const [mColl, setMColl] = useState(false);
  const ref = useRef<HTMLElement>(null);
  const session = useSession();
  const account = session ? "/account" : "/login";

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 24);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  // The Collections panel and the phone menu close on a click or tap outside the header, or on Escape,
  // the same as pressing their own close button.
  useEffect(() => {
    if (!coll && !open) return;
    const away = (e: PointerEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) { setColl(false); setOpen(false); } };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") { setColl(false); setOpen(false); } };
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("pointerdown", away); document.removeEventListener("keydown", esc); };
  }, [coll, open]);
  const closeAll = () => { setColl(false); setOpen(false); };

  return (
    <header ref={ref} style={{ position: "sticky", top: 0, zIndex: 40, width: "100%" }}>
      <div style={{ background: "var(--lux-ink)", color: "var(--lux-bg)", fontSize: 12, letterSpacing: "0.06em" }}>
        <div className="alignment flex flex-wrap items-center justify-center gap-4 py-[7px] md:justify-between" style={{ paddingInline: 24 }}>
          <span className="inline-flex items-center gap-2 opacity-90"><Plane size={14} /> Worldwide delivery through DHL</span>
          <span className="hidden items-center gap-4 opacity-90 md:inline-flex">
            <span className="inline-flex items-center gap-1.5"><Phone size={13} /> +880 1344 460 349</span>
            <a href="https://wa.me/8801344460349" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5" style={{ color: "inherit", textDecoration: "none" }}><MessageCircle size={13} /> WhatsApp</a>
          </span>
        </div>
      </div>
      <div className={`lux-navbar${scrolled || open || coll ? " is-scrolled" : ""}`}>
        <div className="alignment" style={{ paddingInline: 16 }}>
          <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 lg:grid-cols-[1fr_auto_1fr]" style={{ height: scrolled ? 60 : 76, transition: "height var(--dur-slow) var(--ease-lux)" }}>
            <button className={`${btn} inline-flex lg:hidden`} style={iconBtn} onClick={() => setOpen((o) => !o)} aria-label="Menu" aria-expanded={open}>{open ? <X size={22} /> : <Menu size={22} />}</button>
            <nav className="hidden items-center gap-5 lg:flex" style={{ justifySelf: "start", whiteSpace: "nowrap" }}>
              {links.slice(0, 1).map((l) => <Link key={l.label} href={l.href} className="lux-navlink" onClick={() => setColl(false)}>{l.label}</Link>)}
              {sections.length > 0 && (
                <button type="button" className="lux-navlink" aria-expanded={coll} aria-haspopup="true" onClick={() => setColl((o) => !o)} style={{ background: "none", border: "none", padding: 0, fontFamily: "inherit", whiteSpace: "nowrap", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}>
                  Collections <span style={{ display: "inline-flex", transform: coll ? "rotate(180deg)" : "none", transition: "transform var(--dur-mid) var(--ease-lux)" }}><ChevronDown size={13} /></span>
                </button>
              )}
              {links.slice(1).map((l) => <Link key={l.label} href={l.href} className="lux-navlink" onClick={() => setColl(false)}>{l.label}</Link>)}
            </nav>
            <Link href="/" className="flex items-center gap-2.5" style={{ justifySelf: "center", textDecoration: "none" }}>
              <Logo size={32} />
              <span className="font-display" style={{ whiteSpace: "nowrap", letterSpacing: "0.3em", color: "var(--lux-ink)", fontSize: "1.2rem" }}>MISK&nbsp;BD</span>
            </Link>
            <div className="flex items-center gap-1" style={{ justifySelf: "end" }}>
              <span className="hidden lg:inline-flex items-center gap-2"><CurrencyToggle /><ModeToggle /></span>
              <Link href="/shop" className={`${btn} inline-flex`} style={iconBtn} aria-label="Search"><Search size={19} /></Link>
              <Link href={account} style={iconBtn} aria-label={session ? "My account" : "Sign in"} className={`${btn} hidden lg:inline-flex`}><User size={19} /></Link>
              <CartButton />
            </div>
          </div>
        </div>
        {open && (
          <div className="lg:hidden" style={{ borderTop: "1px solid var(--lux-line)", background: "var(--lux-bg-2)", maxHeight: "calc(100vh - 110px)", overflowY: "auto" }}>
            <div className="alignment flex flex-col" style={{ padding: "10px 16px 18px" }}>
              {links.map((l) => (
                <Link key={l.label} href={l.href} onClick={() => setOpen(false)} className="lux-navlink" style={{ padding: "12px 4px", fontSize: 16, borderBottom: "1px solid var(--lux-line)" }}>{l.label}</Link>
              ))}
              {sections.length > 0 && (
                <div style={{ borderBottom: "1px solid var(--lux-line)" }}>
                  <button type="button" className="lux-navlink" aria-expanded={mColl} onClick={() => setMColl((o) => !o)} style={{ width: "100%", background: "none", border: "none", fontFamily: "inherit", fontSize: 16, padding: "12px 4px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
                    Collections <span style={{ display: "inline-flex", transform: mColl ? "rotate(180deg)" : "none" }}><ChevronDown size={16} /></span>
                  </button>
                  {mColl && (
                    <div className="flex flex-col" style={{ paddingBottom: 10 }}>
                      {sections.map((s) => (
                        <div key={s.id} className="flex flex-col">
                          <Link href={`/shop?section=${s.id}`} onClick={closeAll} style={{ padding: "8px 12px", minHeight: 44, display: "flex", alignItems: "center", color: "var(--lux-ink)", fontSize: 15, textDecoration: "none" }}>{s.name}</Link>
                          {s.children.map((c) => <Link key={c.id} href={`/shop?section=${s.id}&sub=${c.id}`} onClick={closeAll} style={{ padding: "8px 12px 8px 28px", minHeight: 44, display: "flex", alignItems: "center", color: "var(--lux-ink-muted)", fontSize: 14, textDecoration: "none" }}>{c.name}</Link>)}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <div className="flex items-center justify-between" style={{ paddingTop: 14 }}>
                <Link href={account} className={`${btn} inline-flex`} style={iconBtn} aria-label={session ? "My account" : "Sign in"} onClick={() => setOpen(false)}><User size={20} /></Link>
                <span className="inline-flex items-center gap-2"><CurrencyToggle /><ModeToggle /></span>
              </div>
            </div>
          </div>
        )}
      </div>
      {coll && sections.length > 0 && (
        <div className="glass-panel hidden lg:block" style={{ position: "absolute", left: 0, right: 0, top: "100%", borderTop: "1px solid var(--lux-line)", borderBottom: "1px solid var(--lux-line)", boxShadow: "0 24px 60px rgba(0,0,0,0.28)" }}>
          <div className="alignment" style={{ padding: "28px 24px 32px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "24px 32px" }}>
            {sections.map((s) => (
              <div key={s.id} className="flex flex-col gap-2">
                <Link href={`/shop?section=${s.id}`} onClick={() => setColl(false)} className="font-display" style={{ color: "var(--lux-ink)", fontSize: 16, letterSpacing: "0.04em", textDecoration: "none" }}>{s.name}</Link>
                {s.children.map((c) => <Link key={c.id} href={`/shop?section=${s.id}&sub=${c.id}`} onClick={() => setColl(false)} style={{ color: "var(--lux-ink-muted)", fontSize: 13.5, textDecoration: "none" }}>{c.name}</Link>)}
              </div>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
