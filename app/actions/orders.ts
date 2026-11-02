"use server";

import { currentUser } from "@/lib/server/session";
import { headers } from "next/headers";
import { authorizeOrder, cancelOrder, findOrders, parseInput, parseOrderNo, placeOrder, requestReturn, trackOrder, type PlaceOrderResult, type Proof, type TrackResult } from "@/lib/server/orders";
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

const callerId = async () => ((await headers()).get("x-forwarded-for") ?? "").split(",")[0].trim().slice(0, 45) || "unknown";

/** Whatever the page can prove about the order: the guest token (a bare string) and/or the phone it was placed with. */
function proofOf(v: unknown): Proof {
  if (typeof v === "string") return { token: v.slice(0, 100) };
  const o = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
  return { token: typeof o.token === "string" ? o.token.slice(0, 100) : undefined, phone: typeof o.phone === "string" ? o.phone.slice(0, 30) : undefined };
}

/** "Pay now" / "Try again" on an unpaid online order, and "Pay online now" on a Cash on Delivery one. */
export async function retryPaymentAction(orderId: unknown, proof: unknown): Promise<{ ok: true; url: string } | { ok: false; reason: string }> {
  if (typeof orderId !== "string" || orderId.length > 20) return { ok: false, reason: "That order could not be found." };
  try {
    const user = await currentUser();
    const found = await authorizeOrder(orderId, proofOf(proof), user?.id, await callerId());
    if (!found.ok) return { ok: false, reason: found.message };
    return await startSslcommerz(found.row.number);
  } catch (e) {
    console.error("retryPayment failed", e);
    return { ok: false, reason: "Something went wrong. Please try again." };
  }
}

/** The customer cancels their own order, if the owner's policy still allows it. */
export async function cancelOrderAction(orderId: unknown, proof: unknown, reason: unknown): Promise<TrackResult> {
  if (typeof orderId !== "string" || orderId.length > 20) return { ok: false, message: "That order could not be found." };
  try {
    const user = await currentUser();
    return await cancelOrder(orderId, proofOf(proof), user?.id, await callerId(), typeof reason === "string" ? reason : "");
  } catch (e) {
    console.error("cancelOrder failed", e);
    return { ok: false, message: "Something went wrong. Please try again." };
  }
}

/** The customer asks to return a delivered order, inside the return window. */
export async function requestReturnAction(orderId: unknown, proof: unknown, reason: unknown): Promise<TrackResult> {
  if (typeof orderId !== "string" || orderId.length > 20) return { ok: false, message: "That order could not be found." };
  try {
    const user = await currentUser();
    return await requestReturn(orderId, proofOf(proof), user?.id, await callerId(), typeof reason === "string" ? reason : "");
  } catch (e) {
    console.error("requestReturn failed", e);
    return { ok: false, message: "Something went wrong. Please try again." };
  }
}

/** "Track my order": order number plus phone for guests, or just the number for the signed-in owner. */
export async function trackOrderAction(orderId: unknown, phone: unknown): Promise<TrackResult> {
  if (typeof orderId !== "string" || orderId.length > 20 || (phone !== undefined && typeof phone !== "string")) return { ok: false, message: "Enter your order number and phone number." };
  try {
    const user = await currentUser();
    return await trackOrder(orderId, typeof phone === "string" ? phone.slice(0, 30) : "", user?.id, await callerId());
  } catch (e) {
    console.error("trackOrder failed", e);
    return { ok: false, message: "Something went wrong. Please try again." };
  }
}
