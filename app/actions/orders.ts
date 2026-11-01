"use server";

import { currentUser } from "@/lib/server/session";
import { findOrderFor, findOrders, parseInput, parseOrderNo, placeOrder, type PlaceOrderResult } from "@/lib/server/orders";
import { expireUnpaid, sslEnabled, startSslcommerz } from "@/lib/server/payments";
import type { Order } from "@/lib/orders";

export async function placeOrderAction(raw: unknown): Promise<PlaceOrderResult> {
  const input = parseInput(raw);
  if (!input) return { ok: false, code: "invalid", message: "That order could not be read. Please refresh and try again." };
  try {
    if (input.form.pay === "sslcommerz" && !sslEnabled()) {
      return { ok: false, code: "invalid", message: "Card and mobile banking payment isn't available right now. Please choose another method." };
    }
    const user = await currentUser();
    // Free the stock held by abandoned online orders before this buyer is told something is sold out.
    await expireUnpaid().catch((e) => console.error("expireUnpaid failed", e));
    const res = await placeOrder(input, user?.id);
    if (!res.ok || input.form.pay !== "sslcommerz") return res;

    // The order exists and its stock is held. If the gateway can't open a page, the shopper can retry
    // from the order page instead of losing the order.
    const n = parseOrderNo(res.orderNo);
    const start = n === null ? null : await startSslcommerz(n);
    return start?.ok ? { ...res, redirectUrl: start.url } : { ...res, payError: start?.reason ?? "We couldn't start the payment." };
  } catch (e) {
    console.error("placeOrder failed", e);
    return { ok: false, code: "invalid", message: "Something went wrong placing your order. Nothing was charged — please try again." };
  }
}

export async function lookupOrdersAction(refs: unknown): Promise<Order[]> {
  if (!Array.isArray(refs)) return [];
  try {
    const user = await currentUser();
    return await findOrders(refs, user?.id);
  } catch (e) {
    console.error("lookupOrders failed", e);
    return [];
  }
}

/** "Pay now" / "Try again" on the order page. Only the order's owner (or guest-token holder) may start it. */
export async function retryPaymentAction(orderId: unknown, token: unknown): Promise<{ ok: true; url: string } | { ok: false; reason: string }> {
  if (typeof orderId !== "string") return { ok: false, reason: "That order could not be found." };
  try {
    const user = await currentUser();
    const order = await findOrderFor(orderId, typeof token === "string" ? token.slice(0, 100) : "", user?.id);
    if (!order) return { ok: false, reason: "That order could not be found." };
    return await startSslcommerz(order.number);
  } catch (e) {
    console.error("retryPayment failed", e);
    return { ok: false, reason: "Something went wrong. Please try again." };
  }
}
