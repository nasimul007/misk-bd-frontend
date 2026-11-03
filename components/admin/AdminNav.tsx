"use client";

import { Boxes, ClipboardList, MessageSquareText, LayoutDashboard, LayoutGrid, LayoutTemplate, Package, Percent, Shield, UserRound, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { adminLogoutAction } from "@/app/actions/admin";
import { Badge } from "@/components/ui/Badge";

const ICONS: Record<string, LucideIcon> = {
  overview: LayoutDashboard, products: Package, sections: LayoutGrid, discounts: Percent, orders: ClipboardList,
  inventory: Boxes, reviews: MessageSquareText, content: LayoutTemplate, staff: Shield, account: UserRound,
};

type Item = { href: string; label: string; icon: string };

/** Page header and tab bar, laid out like the prototype's admin dashboard. */
export function AdminNav({ items, name, role }: { items: Item[]; name: string; role: string }) {
  const path = usePathname();
  const router = useRouter();
  const owner = role === "owner";
  const active = (href: string) => (href === "/admin" ? path === "/admin" : path.startsWith(href));
  const ghost = { padding: "0.45rem 0.9rem", fontSize: "0.8rem" };
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3" style={{ marginBottom: 24 }}>
        <div>
          <span className="lux-eyebrow">Store Administration</span>
          <h1 className="font-display" style={{ fontSize: 30, fontWeight: 500, margin: "8px 0 0" }}>Admin Dashboard</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Badge tone={owner ? "gold" : "glass"}>{name} · {owner ? "Owner" : "Admin"}</Badge>
          <Link href="/admin/account" className="lux-focus" style={{ ...ghost, color: "var(--lux-ink-muted)" }}>Change password</Link>
          <Link href="/" className="lux-focus" style={{ ...ghost, color: "var(--lux-ink-muted)" }}>Exit to storefront</Link>
          <button type="button" className="lux-btn lux-focus" style={ghost}
            onClick={async () => { await adminLogoutAction(); router.replace("/admin/login"); }}>Sign out</button>
        </div>
      </div>
      <nav aria-label="Admin" className="flex flex-wrap gap-1.5" style={{ marginBottom: 24, borderBottom: "1px solid var(--lux-line)" }}>
        {items.map((i) => {
          const on = active(i.href);
          const Icon = ICONS[i.icon] ?? LayoutDashboard;
          return (
            <Link key={i.href} href={i.href} aria-current={on ? "page" : undefined} className="lux-focus inline-flex items-center gap-2"
              style={{ padding: "10px 16px", fontSize: 14, marginBottom: -1, borderBottom: `2px solid ${on ? "var(--lux-gold)" : "transparent"}`, color: on ? "var(--lux-gold)" : "var(--lux-ink-muted)" }}>
              <Icon size={16} aria-hidden /> {i.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
