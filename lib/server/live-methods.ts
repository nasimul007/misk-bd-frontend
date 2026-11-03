import "server-only";
import { sslConfig } from "@/lib/server/sslcommerz";
import type { PaymentId } from "@/lib/config";

/**
 * The payment methods a shopper can really use right now. Cash on Delivery always; card and mobile banking
 * once SSLCommerz is configured. bKash, Stripe and PayPal are not connected yet: until each has a real
 * integration it stays out of this list, so nobody can place an order that is never paid for.
 */
export const liveMethods = (): PaymentId[] => ["cod", ...(sslConfig() ? (["sslcommerz"] as const) : [])];
