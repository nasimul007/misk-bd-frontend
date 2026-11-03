// Store settings. Owner-editable in the future admin panel; the backend must read these from the
// database so a price change never needs a code release.
export const shipping = {
  insideDhaka: 60,
  outsideDhaka: 120,
  intl: 1800,
  freeThreshold: 5000, // Bangladesh only, compared with the discounted subtotal
  estimate: { dhaka: "1–2 days", other: "3–5 days", intl: "7–14 days" },
} as const;

export const vatRate = 0.075; // shown as "VAT (incl.)"; informational, not added to the total

export type PaymentId = "bkash" | "sslcommerz" | "cod" | "stripe" | "paypal";
export type PaymentMethod = { id: PaymentId; label: string; note: string; tag?: string; intl?: boolean };

export const payments: PaymentMethod[] = [
  { id: "bkash", label: "bKash", note: "Pay with your bKash wallet", tag: "Most popular" },
  { id: "sslcommerz", label: "Card / Mobile Banking", note: "Visa, Mastercard, bKash, Nagad, Rocket via SSLCommerz" },
  { id: "cod", label: "Cash on Delivery", note: "Pay when your parcel arrives" },
  { id: "stripe", label: "International Card", note: "Visa / Mastercard · 3-D Secure", intl: true },
  { id: "paypal", label: "PayPal", note: "For overseas buyers", intl: true },
];

/**
 * What a shopper can choose, given which methods are live. Bangladeshi buyers get the local methods;
 * international buyers get Stripe/PayPal when those are live, and otherwise card payment through SSLCommerz
 * (which accepts international cards).
 */
export function paymentsFor(intl: boolean, live: readonly PaymentId[] = payments.map((p) => p.id)): PaymentMethod[] {
  const ok = payments.filter((p) => live.includes(p.id));
  if (!intl) return ok.filter((p) => !p.intl);
  const world = ok.filter((p) => p.intl);
  if (world.length) return world;
  return ok.filter((p) => p.id === "sslcommerz").map((p) => ({ ...p, label: "Credit / Debit Card", note: "Visa, Mastercard and other international cards, via SSLCommerz", tag: undefined }));
}
