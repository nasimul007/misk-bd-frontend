"use client";

import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, Trash2 } from "lucide-react";
import { useCart } from "@/lib/cart";
import { money } from "@/lib/format";

/** The list of cart items with quantity steppers. Shared by the drawer and the /cart page. */
export function CartLines({ onNavigate }: { onNavigate?: () => void }) {
  const items = useCart((s) => s.items);
  const changeQty = useCart((s) => s.changeQty);
  const remove = useCart((s) => s.remove);

  if (items.length === 0) {
    return (
      <div style={{ textAlign: "center", marginTop: 40 }}>
        <p style={{ color: "var(--lux-ink-muted)" }}>Your cart is empty.</p>
        <Link href="/shop" onClick={onNavigate} className="lux-link" style={{ fontSize: 14 }}>Browse the collection</Link>
      </div>
    );
  }

  const step = { width: 28, height: 28, border: "none", background: "transparent", color: "var(--lux-ink)", cursor: "pointer" } as const;
  return (
    <ul className="flex flex-col gap-3.5" style={{ listStyle: "none", margin: 0, padding: 0 }}>
      {items.map((i) => (
        <li key={i.key} className="lux-surface flex gap-3.5" style={{ borderRadius: 16, padding: 12 }}>
          <Link href={`/product/${i.id}`} onClick={onNavigate} style={{ position: "relative", width: 64, height: 64, flex: "none", borderRadius: 12, overflow: "hidden" }}>
            <Image src={i.image} alt="" fill sizes="64px" style={{ objectFit: "cover" }} />
          </Link>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p className="font-display" style={{ margin: 0, color: "var(--lux-ink)", fontSize: 15 }}>{i.title}</p>
            <p style={{ margin: "2px 0 6px", color: "var(--lux-ink-muted)", fontSize: 12 }}>{i.size}</p>
            <div className="flex items-center gap-2">
              <div className="flex items-center" style={{ border: "1px solid var(--lux-line)", borderRadius: 999 }}>
                <button type="button" onClick={() => changeQty(i.key, -1)} disabled={i.qty <= 1} aria-label={`Decrease quantity of ${i.title}`} className="inline-flex items-center justify-center" style={{ ...step, opacity: i.qty <= 1 ? 0.4 : 1 }}><Minus size={13} /></button>
                <span style={{ minWidth: 22, textAlign: "center", fontSize: 13, color: "var(--lux-ink)" }} aria-live="polite">{i.qty}</span>
                <button type="button" onClick={() => changeQty(i.key, 1)} disabled={i.qty >= i.stock} aria-label={`Increase quantity of ${i.title}`} className="inline-flex items-center justify-center" style={{ ...step, opacity: i.qty >= i.stock ? 0.4 : 1, cursor: i.qty >= i.stock ? "not-allowed" : "pointer" }}><Plus size={13} /></button>
              </div>
              <span className="ml-auto flex items-baseline gap-1.5">
                {i.original > i.price && <s style={{ fontSize: 12, color: "var(--lux-ink-muted)" }}>{money(i.original * i.qty)}</s>}
                <span style={{ color: "var(--lux-gold)", fontWeight: 600 }}>{money(i.price * i.qty)}</span>
              </span>
            </div>
            {i.qty >= i.stock && <p style={{ margin: "6px 0 0", fontSize: 11.5, color: "var(--lux-warning)" }}>Max available</p>}
          </div>
          <button type="button" onClick={() => remove(i.key)} aria-label={`Remove ${i.title} from cart`} style={{ background: "none", border: "none", color: "var(--lux-ink-muted)", cursor: "pointer", alignSelf: "start" }}><Trash2 size={16} /></button>
        </li>
      ))}
    </ul>
  );
}
