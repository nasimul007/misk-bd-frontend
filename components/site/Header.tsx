"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, Phone, MessageCircle, Plane, Search, User, X } from "lucide-react";
import { ModeToggle } from "@/components/ui/ModeToggle";
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
export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 24);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  return (
    <header style={{ position: "sticky", top: 0, zIndex: 40, width: "100%" }}>
      <div style={{ background: "var(--lux-ink)", color: "var(--lux-bg)", fontSize: 12, letterSpacing: "0.06em" }}>
        <div className="alignment flex flex-wrap items-center justify-center gap-4 py-[7px] md:justify-between" style={{ paddingInline: 24 }}>
          <span className="inline-flex items-center gap-2 opacity-90"><Plane size={14} /> Worldwide delivery through DHL</span>
          <span className="hidden items-center gap-4 opacity-90 md:inline-flex">
            <span className="inline-flex items-center gap-1.5"><Phone size={13} /> +880 1344 460 349</span>
            <a href="https://wa.me/8801344460349" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5" style={{ color: "inherit", textDecoration: "none" }}><MessageCircle size={13} /> WhatsApp</a>
          </span>
        </div>
      </div>
      <div className={`lux-navbar${scrolled ? " is-scrolled" : ""}`}>
        <div className="alignment" style={{ paddingInline: 16 }}>
          <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 lg:grid-cols-[1fr_auto_1fr]" style={{ height: scrolled ? 60 : 76, transition: "height var(--dur-slow) var(--ease-lux)" }}>
            <button className={`${btn} inline-flex lg:hidden`} style={iconBtn} onClick={() => setOpen((o) => !o)} aria-label="Menu" aria-expanded={open}>{open ? <X size={22} /> : <Menu size={22} />}</button>
            <nav className="hidden items-center gap-5 lg:flex" style={{ justifySelf: "start", whiteSpace: "nowrap" }}>
              {links.map((l) => <Link key={l.label} href={l.href} className="lux-navlink">{l.label}</Link>)}
            </nav>
            <Link href="/" className="flex items-center gap-2.5" style={{ justifySelf: "center", textDecoration: "none" }}>
              <Logo size={32} />
              <span className="font-display" style={{ whiteSpace: "nowrap", letterSpacing: "0.3em", color: "var(--lux-ink)", fontSize: "1.2rem" }}>MISK&nbsp;BD</span>
            </Link>
            <div className="flex items-center gap-1" style={{ justifySelf: "end" }}>
              <span className="hidden lg:inline-flex"><ModeToggle /></span>
              <Link href="/shop" className={`${btn} inline-flex`} style={iconBtn} aria-label="Search"><Search size={19} /></Link>
              <Link href="/login" style={iconBtn} aria-label="Account" className={`${btn} hidden lg:inline-flex`}><User size={19} /></Link>
              <CartButton />
            </div>
          </div>
        </div>
        {open && (
          <div className="lg:hidden" style={{ borderTop: "1px solid var(--lux-line)" }}>
            <div className="alignment flex flex-col" style={{ padding: "10px 16px 18px" }}>
              {links.map((l) => (
                <Link key={l.label} href={l.href} onClick={() => setOpen(false)} className="lux-navlink" style={{ padding: "12px 4px", fontSize: 16, borderBottom: "1px solid var(--lux-line)" }}>{l.label}</Link>
              ))}
              <div className="flex items-center justify-between" style={{ paddingTop: 14 }}>
                <Link href="/login" className={`${btn} inline-flex`} style={iconBtn} aria-label="Account" onClick={() => setOpen(false)}><User size={20} /></Link>
                <ModeToggle />
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
