"use client";

import type { PricedProduct } from "@/lib/types";
import { useCart } from "@/lib/cart";

/** Quick add from a product card: adds the smallest size. Pick a different size on the product page. */
export function AddToCartButton({ product }: { product: PricedProduct }) {
  const add = useCart((s) => s.add);
  const soldOut = product.stock <= 0;
  return (
    <button type="button" disabled={soldOut} onClick={() => add(product)} aria-label={`Add ${product.title} to cart`} className="lux-btn-fill lux-focus" style={{ width: "100%", padding: "0.7rem 1rem", fontSize: "0.85rem" }}>
      {soldOut ? "Sold out" : "Add to Cart"}
    </button>
  );
}
