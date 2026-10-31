"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { FreshLine } from "@/lib/orders";
import type { PricedProduct } from "@/lib/types";

export type CartItem = {
  key: string; // `${productId}__${size}`
  id: string;
  title: string;
  image: string;
  size: string;
  price: number; // unit price after discounts (BDT)
  original: number; // unit price before discounts
  qty: number;
  stock: number;
};

type CartState = {
  items: CartItem[];
  hydrated: boolean;
  drawerOpen: boolean;
  toast: string | null;
  add: (product: PricedProduct, size?: string | null, qty?: number) => void;
  remove: (key: string) => void;
  changeQty: (key: string, delta: number) => void;
  clear: () => void;
  sync: (fresh: FreshLine[]) => void;
  openDrawer: () => void;
  closeDrawer: () => void;
  dismissToast: () => void;
};

// The browser can hold anything, so persisted data is re-validated before it is trusted.
const clean = (raw: unknown): CartItem[] => {
  if (!Array.isArray(raw)) return [];
  const out: CartItem[] = [];
  for (const i of raw) {
    if (!i || typeof i !== "object") continue;
    const { key, id, title, image, size, price, original, qty, stock } = i as Record<string, unknown>;
    if (typeof key !== "string" || typeof id !== "string" || typeof title !== "string" || typeof image !== "string" || typeof size !== "string") continue;
    if (![price, original, qty, stock].every((n) => typeof n === "number" && Number.isFinite(n))) continue;
    const s = Math.max(1, Math.floor(stock as number));
    out.push({ key, id, title, image, size, price: Math.max(0, price as number), original: Math.max(0, original as number), qty: Math.min(s, Math.max(1, Math.floor(qty as number))), stock: s });
  }
  return out;
};

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      hydrated: false,
      drawerOpen: false,
      toast: null,

      add: (product, size, qty = 1) => {
        const info = product.sizes.find((s) => s.size === size) ?? product.sizes[0];
        if (!info || product.stock <= 0) {
          set({ toast: `${product.title} is out of stock` });
          return;
        }
        const key = `${product.id}__${info.size}`;
        const found = get().items.find((i) => i.key === key);
        const next = Math.min(product.stock, (found?.qty ?? 0) + qty);
        const capped = found ? next === found.qty : next < qty;
        set((s) => ({
          items: found
            ? s.items.map((i) => (i.key === key ? { ...i, qty: next, price: info.price, original: info.original, stock: product.stock } : i))
            : [...s.items, { key, id: product.id, title: product.title, image: product.image, size: info.size, price: info.price, original: info.original, qty: next, stock: product.stock }],
          toast: capped ? `Only ${product.stock} of ${product.title} in stock` : `${product.title} · ${info.size} added to cart`,
        }));
      },
      remove: (key) => set((s) => ({ items: s.items.filter((i) => i.key !== key) })),
      changeQty: (key, delta) =>
        set((s) => ({ items: s.items.map((i) => (i.key === key ? { ...i, qty: Math.max(1, Math.min(i.stock, i.qty + delta)) } : i)) })),
      clear: () => set({ items: [] }),
      // Adopt the server's current price and stock; drop lines it no longer sells.
      sync: (fresh) =>
        set((s) => ({
          items: s.items.flatMap((i) => {
            const f = fresh.find((x) => x.slug === i.id && x.size === i.size);
            if (!f || f.stock <= 0) return [];
            return [{ ...i, price: f.price, original: f.original, stock: f.stock, qty: Math.min(i.qty, f.stock) }];
          }),
        })),
      openDrawer: () => set({ drawerOpen: true }),
      closeDrawer: () => set({ drawerOpen: false }),
      dismissToast: () => set({ toast: null }),
    }),
    {
      name: "misk_cart_v1",
      skipHydration: true, // rehydrated on the client by <CartProvider/> so SSR markup matches
      partialize: (s) => ({ items: s.items }),
      merge: (persisted, current) => ({ ...current, items: clean((persisted as { items?: unknown } | undefined)?.items) }),
      onRehydrateStorage: () => () => useCart.setState({ hydrated: true }),
    },
  ),
);

export const cartCount = (items: CartItem[]) => items.reduce((n, i) => n + i.qty, 0);
export const cartSubtotal = (items: CartItem[]) => items.reduce((n, i) => n + i.price * i.qty, 0);
