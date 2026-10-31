"use client";

import { useState } from "react";
import { Minus, Plus, ShoppingBag, Tag } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { StockPill } from "@/components/ui/StockPill";
import { useMoney } from "@/lib/currency";
import { useCart } from "@/lib/cart";
import type { PricedProduct } from "@/lib/types";

/** Price, size picker, quantity stepper and add-to-cart. */
export function ProductBuy({ product }: { product: PricedProduct }) {
  const money = useMoney();
  const { title, stock, card, sizes } = product;
  const add = useCart((s) => s.add);
  const [size, setSize] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const info = size ? sizes.find((s) => s.size === size) : undefined;

  const price = info ? info.price : card.price;
  const was = info ? (info.saving ? info.original : 0) : (card.compareAt ?? 0);
  const saleLabel = info ? (info.pct ? `−${info.pct}%` : "") : (card.discountLabel ?? "");
  const atMax = qty >= stock;
  const stepBtn = { width: 44, height: "100%", border: "none", background: "transparent", cursor: "pointer" } as const;

  return (
    <>
      <div className="flex items-end justify-between" style={{ borderBottom: "1px solid var(--lux-line)", paddingBottom: 20 }}>
        <div className="flex flex-wrap items-baseline gap-2.5">
          <span style={{ fontSize: 34, fontWeight: 600, color: "var(--lux-gold)" }}>{money(price * qty)}</span>
          {was > price && <s style={{ fontSize: 18, color: "var(--lux-ink-muted)" }}>{money(was * qty)}</s>}
          {qty > 1 && <span style={{ fontSize: 14, color: "var(--lux-ink-muted)" }}>({money(price)} each &times; {qty})</span>}
          {qty === 1 && !size && card.maxPrice > card.price && <span style={{ fontSize: 18, color: "var(--lux-ink-muted)" }}>&ndash; {money(card.maxPrice)}</span>}
          {size && qty === 1 && <span style={{ fontSize: 14, color: "var(--lux-ink-muted)" }}>for {size}</span>}
          {saleLabel && <Badge tone="danger" style={{ background: "var(--lux-danger)", color: "#fff", border: "none", alignSelf: "center" }}>{saleLabel}</Badge>}
        </div>
        <StockPill stock={stock} />
      </div>
      {info && info.saving > 0 && info.rule && (
        <p className="flex items-center gap-2" style={{ margin: 0, fontSize: 14, color: "var(--lux-success)" }}><Tag size={15} /> {info.rule.name} &mdash; you save {money(info.saving * qty)}</p>
      )}

      <div className="glass-card flex flex-col gap-5" style={{ borderRadius: 16, padding: 24 }}>
        <div className="flex flex-col gap-3">
          <span style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--lux-ink-muted)" }}>Size</span>
          <div className="flex flex-wrap gap-2.5">
            {sizes.map((s) => {
              const on = size === s.size;
              return (
                <button key={s.size} type="button" onClick={() => setSize(s.size)} aria-pressed={on} aria-label={`${s.size}, ${money(s.price)}`} className="flex flex-col items-center gap-0.5" style={{ minWidth: 78, borderRadius: 12, padding: "9px 14px", cursor: "pointer", transition: "all .2s", border: on ? "1px solid var(--lux-gold)" : "1px solid var(--lux-line)", background: on ? "var(--lux-gold-soft)" : "transparent", color: on ? "var(--lux-gold)" : "var(--lux-ink)" }}>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{s.size}</span>
                  <span style={{ fontSize: 12, color: on ? "var(--lux-gold)" : "var(--lux-ink-muted)" }}>{money(s.price)}</span>
                </button>
              );
            })}
          </div>
          {!size && <p style={{ fontSize: 12, color: "var(--lux-warning)", margin: 0 }}>Select a size to continue.</p>}
        </div>
        <div className="flex flex-wrap gap-3.5">
          <div className="flex items-center" style={{ height: 52, borderRadius: 12, border: "1px solid var(--lux-line)", background: "color-mix(in oklch, var(--lux-bg-3) 40%, transparent)", padding: 4 }}>
            <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} className="inline-flex items-center justify-center" style={{ ...stepBtn, color: "var(--lux-ink)" }} aria-label="Decrease quantity"><Minus size={15} /></button>
            <span style={{ width: 40, textAlign: "center", fontSize: 17, fontWeight: 600 }} aria-live="polite">{qty}</span>
            <button type="button" onClick={() => setQty((q) => Math.min(stock, q + 1))} disabled={atMax} className="inline-flex items-center justify-center" style={{ ...stepBtn, color: atMax ? "var(--lux-ink-muted)" : "var(--lux-ink)", cursor: atMax ? "not-allowed" : "pointer" }} aria-label="Increase quantity"><Plus size={15} /></button>
          </div>
          <Button variant="fill" style={{ flex: 1, minWidth: 160, height: 52 }} disabled={!size || stock <= 0} onClick={() => size && add(product, size, qty)} icon={<ShoppingBag size={17} />} aria-label={`Add ${title} to cart`}>Add to Cart</Button>
        </div>
        {atMax && stock > 0 && <p style={{ fontSize: 12, color: "var(--lux-warning)", margin: 0 }}>Only {stock} left in stock &mdash; that&apos;s the most you can add.</p>}
      </div>
    </>
  );
}
