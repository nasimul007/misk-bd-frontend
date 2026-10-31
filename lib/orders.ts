import type { CartItem } from "@/lib/cart";
import type { PaymentId } from "@/lib/config";
import type { Totals } from "@/lib/checkout";

// Orders live in Postgres. This module holds the shape the UI renders, and the guest tokens the browser
// keeps: a token is issued once at checkout and, together with the order number, proves the order is yours.

export type Order = {
  id: string; // MB-NNNNN
  placedAt: string; // ISO
  items: CartItem[];
  totals: Totals;
  pay: PaymentId;
  status: string;
  intl: boolean;
  name: string;
  phone: string;
  email: string;
  country: string;
  division: string; // Bangladesh division, or the country for international orders
  address: string;
};

/** Current server-side price and stock for a bag line, returned when the bag is out of date. */
export type FreshLine = { slug: string; size: string; price: number; original: number; stock: number };

const KEY = "misk_order_tokens_v1";
const EVENT = "misk-order";

export type OrderRef = { no: string; token: string };

export const orderTokens = {
  remember(no: string, token: string) {
    try {
      const all = JSON.parse(localStorage.getItem(KEY) ?? "{}");
      localStorage.setItem(KEY, JSON.stringify({ ...(all && typeof all === "object" ? all : {}), [no]: token }));
      window.dispatchEvent(new Event(EVENT));
    } catch {}
  },
  subscribe(cb: () => void) {
    window.addEventListener(EVENT, cb);
    window.addEventListener("storage", cb);
    return () => { window.removeEventListener(EVENT, cb); window.removeEventListener("storage", cb); };
  },
  /** Raw JSON, so it can feed useSyncExternalStore (a stable string, not a fresh object). */
  read(): string | null {
    try { return localStorage.getItem(KEY); } catch { return null; }
  },
  parse(raw: string | null): OrderRef[] {
    try {
      const all = raw ? JSON.parse(raw) : {};
      return Object.entries(all as Record<string, unknown>)
        .filter(([, t]) => typeof t === "string")
        .map(([no, token]) => ({ no, token: token as string }));
    } catch {
      return [];
    }
  },
};
