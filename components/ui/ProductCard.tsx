import Image from "next/image";
import Link from "next/link";
import type { PricedProduct } from "@/lib/types";
import { money } from "@/lib/format";
import { Badge } from "./Badge";

/** Storefront product card: frosted surface, square image, serif title, gold price. */
export function ProductCard({ product }: { product: PricedProduct }) {
  const { id, title, image, bestseller, stock, variants, card } = product;
  const { price, maxPrice, compareAt, discountLabel } = card;
  return (
    <div className="group lux-surface" style={{ display: "flex", flexDirection: "column", overflow: "hidden", borderRadius: "var(--radius-card)" }}>
      <Link href={`/product/${id}`} style={{ display: "flex", flexDirection: "column", textDecoration: "none", color: "inherit" }}>
        <div style={{ position: "relative", aspectRatio: "1 / 1", width: "100%", overflow: "hidden" }}>
          <div style={{ position: "absolute", left: 10, top: 10, zIndex: 2, display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 6 }}>
            {discountLabel && <Badge tone="danger" style={{ background: "var(--lux-danger)", color: "#fff", border: "none" }}>{discountLabel}</Badge>}
            {bestseller && <Badge tone="gold">Bestseller</Badge>}
            {stock <= 5 && <Badge tone="glass">Few left</Badge>}
          </div>
          <Image src={image} alt={title} fill sizes="(max-width: 640px) 100vw, 25vw" style={{ objectFit: "cover", transition: "transform var(--dur-mid) var(--ease-lux)" }} className="group-hover:scale-105" />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: 14 }}>
          <h3 className="font-display" style={{ fontSize: 15, fontWeight: 500, lineHeight: 1.35, color: "var(--lux-ink)", minHeight: "2.5rem", margin: 0 }}>{title}</h3>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6, flexWrap: "wrap" }}>
            {compareAt && compareAt > price && <s style={{ fontSize: 13, color: "var(--lux-ink-muted)" }}>{money(compareAt)}</s>}
            <span style={{ fontSize: 18, fontWeight: 600, color: "var(--lux-gold)" }}>{money(price)}</span>
            {maxPrice > price && <span style={{ fontSize: 14, color: "var(--lux-ink-muted)" }}>&ndash; {money(maxPrice)}</span>}
          </div>
          {variants.length > 1 && <span style={{ fontSize: 12, color: "var(--lux-ink-muted)" }}>{variants.length} options</span>}
        </div>
      </Link>
      <div style={{ padding: "0 14px 14px" }}>
        {/* Cart wiring lands with the cart feature. */}
        <button type="button" className="lux-btn-fill lux-focus" style={{ width: "100%", padding: "0.7rem 1rem", fontSize: "0.85rem" }}>Add to Cart</button>
      </div>
    </div>
  );
}
