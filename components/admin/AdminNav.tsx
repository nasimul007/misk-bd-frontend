"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { adminLogoutAction } from "@/app/actions/admin";

type Item = { href: string; label: string };

export function AdminNav({ items, name, role }: { items: Item[]; name: string; role: string }) {
  const path = usePathname();
  const router = useRouter();
  const active = (href: string) => (href === "/admin" ? path === "/admin" : path.startsWith(href));
  return (
    <nav aria-label="Admin" className="lux-surface flex flex-wrap items-center gap-1" style={{ borderRadius: 16, padding: 8, marginBottom: 24 }}>
      <span className="font-display" style={{ padding: "6px 12px", letterSpacing: "0.2em", fontSize: 15 }}>MISK BD</span>
      {items.map((i) => (
        <Link key={i.href} href={i.href} aria-current={active(i.href) ? "page" : undefined} className="lux-focus"
          style={{ padding: "8px 14px", borderRadius: 999, fontSize: 14, background: active(i.href) ? "var(--lux-gold-soft)" : "transparent", color: active(i.href) ? "var(--lux-gold)" : "var(--lux-ink)" }}>
          {i.label}
        </Link>
      ))}
      <span style={{ flex: 1 }} />
      <span style={{ fontSize: 13, color: "var(--lux-ink-muted)", padding: "0 8px" }}>{name} · {role}</span>
      <button type="button" className="lux-btn lux-focus" style={{ padding: "0.45rem 1rem", fontSize: "0.8rem" }}
        onClick={async () => { await adminLogoutAction(); router.replace("/admin/login"); }}>Sign out</button>
    </nav>
  );
}
