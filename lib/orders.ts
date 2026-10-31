import type { CartItem } from "@/lib/cart";
import type { PaymentId } from "@/lib/config";
import type { Totals } from "@/lib/checkout";

export type Order = {
  id: string;
  placedAt: string; // ISO
  items: CartItem[];
  totals: Totals;
  pay: PaymentId;
  intl: boolean;
  name: string;
  phone: string;
  email: string;
  country: string;
  division: string; // Bangladesh division, or the country for international orders
  address: string;
};

const KEY = "misk_last_order_v1";

/** Until there is a backend, the last order lives in this browser only. */
export const orderStore = {
  key: KEY,
  save(order: Order) {
    try { localStorage.setItem(KEY, JSON.stringify(order)); window.dispatchEvent(new Event("misk-order")); } catch {}
  },
  subscribe(cb: () => void) {
    window.addEventListener("misk-order", cb);
    window.addEventListener("storage", cb);
    return () => { window.removeEventListener("misk-order", cb); window.removeEventListener("storage", cb); };
  },
  read(): string | null {
    try { return localStorage.getItem(KEY); } catch { return null; }
  },
};

/** Order number like MB-48213. Not secure or unique across customers; the server will issue real ones. */
export const newOrderId = () => {
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 90000;
  return `MB-${10000 + n}`;
};
