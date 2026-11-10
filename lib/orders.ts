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
  timeline: { status: string; at: string }[]; // when each status was reached (staff notes are never included)
  payStatus: string; // unpaid | pending | paid | failed | refunded | cod_pending | cod_collected
  paidAmount: number; // already paid online: all of it, or just the delivery charge on a Cash on Delivery order
  payDueAt: string | null; // ISO; an online order not paid by then is cancelled
  status: string;
  intl: boolean;
  name: string;
  phone: string;
  email: string;
  country: string;
  division: string; // Bangladesh division, or the country for international orders
  address: string;
  note: string; // delivery instructions the customer gave
  contactless: boolean;
  // What this order allows the customer to do right now (decided on the server from the order and the owner's policy).
  canCancel: boolean;
  canReturn: boolean;
  returnRequested: boolean;
  toReview: { slug: string; title: string; image: string }[]; // delivered items the customer has not reviewed yet
  canPayOnline: boolean; // a Cash on Delivery order that can still be paid by card or mobile banking
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
  /** Every order this browser holds a guest token for. */
  refs(): OrderRef[] {
    return orderTokens.parse(orderTokens.read());
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

/** Still waiting for money online: a card order not yet paid, or a Cash on Delivery order whose delivery charge isn't paid. */
export const awaitingPayment = (o: Pick<Order, "status" | "payStatus">) => o.status === "pending" && (o.payStatus === "pending" || o.payStatus === "failed");

/** What the customer pays online right now: the whole total, or only the delivery charge on a Cash on Delivery order. */
export const payNowAmount = (o: Pick<Order, "pay" | "totals">) => (o.pay === "cod" ? o.totals.shipping : o.totals.total);

/** Cash still to hand over on delivery (Cash on Delivery orders only). */
export const cashOnDelivery = (o: Pick<Order, "pay" | "totals" | "paidAmount" | "payStatus" | "status">) =>
  o.pay === "cod" ? o.totals.total - (awaitingPayment(o) ? o.totals.shipping : o.paidAmount) : 0;
