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
  { id: "sslcommerz", label: "Card / Mobile Banking", note: "Visa, Mastercard, Nagad, Rocket via SSLCommerz" },
  { id: "cod", label: "Cash on Delivery", note: "Pay when your parcel arrives" },
  { id: "stripe", label: "International Card", note: "Visa / Mastercard · 3-D Secure", intl: true },
  { id: "paypal", label: "PayPal", note: "For overseas buyers", intl: true },
];

/** International buyers pay by international methods only; Bangladeshi buyers by the local ones. */
export const paymentsFor = (intl: boolean) => payments.filter((p) => !!p.intl === intl);
