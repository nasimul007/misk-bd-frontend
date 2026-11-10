"use server";

import { currentUser } from "@/lib/server/session";
import { callerIp } from "@/lib/server/limits";
import { orderGate } from "@/lib/server/order-gate";
import { authorizeOrder, cancelOrder, findOrders, parseInput, parseOrderNo, phoneFor, placeOrder, requestReturn, submitReview, trackOrder, type PlaceOrderResult, type Proof, type TrackResult } from "@/lib/server/orders";
import { expireUnpaid, sslEnabled, startSslcommerz } from "@/lib/server/payments";
import { updateTag } from "next/cache";
import { getProduct } from "@/lib/data";
import type { PricedProduct } from "@/lib/types";
import type { Order } from "@/lib/orders";

export async function placeOrderAction(raw: unknown): Promise<PlaceOrderResult> {
  const input = parseInput(raw);
  if (!input) return { ok: false, code: "invalid", message: "That order could not be read. Please refresh and try again." };
  try {
    if ((input.form.pay === "sslcommerz" || input.form.pay === "cod") && !sslEnabled()) {
      return { ok: false, code: "invalid", message: "Online payment isn't available right now, so we can't take orders at the moment. Please try again later." };
    }
    const refused = await orderGate(phoneFor(input.form), input.form.pay, await callerIp());
    if (refused) return { ok: false, code: "invalid", message: refused };

    const user = await currentUser();
    // Free the stock held by abandoned online orders before this buyer is told something is sold out.
    await expireUnpaid().catch((e) => console.error("expireUnpaid failed", e));
    const res = await placeOrder(input, user?.id);
    if (!res.ok || (input.form.pay !== "sslcommerz" && input.form.pay !== "cod")) return res;

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

const callerId = () => callerIp();

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

/** A star rating and short comment for one delivered item. */
export async function submitReviewAction(orderId: unknown, proof: unknown, productSlug: unknown, rating: unknown, comment: unknown): Promise<TrackResult> {
  if (typeof orderId !== "string" || orderId.length > 20 || typeof productSlug !== "string" || typeof rating !== "number") return { ok: false, message: "That review could not be read." };
  try {
    const user = await currentUser();
    const r = await submitReview(orderId, proofOf(proof), user?.id, await callerId(), productSlug.slice(0, 120), rating, typeof comment === "string" ? comment : "");
    if (r.ok) updateTag("catalogue");
    return r;
  } catch (e) {
    console.error("submitReview failed", e);
    return { ok: false, message: "Something went wrong. Please try again." };
  }
}

/** The items of a past order as they can be bought today: current prices and stock, minus anything unavailable. */
export async function reorderAction(orderId: unknown, proof: unknown): Promise<{ ok: true; lines: { product: PricedProduct; size: string; qty: number }[]; skipped: number } | { ok: false; message: string }> {
  if (typeof orderId !== "string" || orderId.length > 20) return { ok: false, message: "That order could not be found." };
  try {
    const user = await currentUser();
    const found = await authorizeOrder(orderId, proofOf(proof), user?.id, await callerId());
    if (!found.ok) return found;
    const lines: { product: PricedProduct; size: string; qty: number }[] = [];
    let skipped = 0;
    for (const i of found.row.items) {
      const product = await getProduct(i.slug);
      const v = product?.variants.find((x) => x.size === i.size);
      if (!product || !v || v.stock <= 0) { skipped++; continue; }
      lines.push({ product, size: i.size, qty: Math.min(i.qty, v.stock) });
    }
    return { ok: true, lines, skipped };
  } catch (e) {
    console.error("reorder failed", e);
    return { ok: false, message: "Something went wrong. Please try again." };
  }
}
