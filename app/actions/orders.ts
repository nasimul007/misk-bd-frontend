"use server";

import { findOrders, parseInput, placeOrder, type PlaceOrderResult } from "@/lib/server/orders";
import type { Order } from "@/lib/orders";

export async function placeOrderAction(raw: unknown): Promise<PlaceOrderResult> {
  const input = parseInput(raw);
  if (!input) return { ok: false, code: "invalid", message: "That order could not be read. Please refresh and try again." };
  try {
    return await placeOrder(input);
  } catch (e) {
    console.error("placeOrder failed", e);
    return { ok: false, code: "invalid", message: "Something went wrong placing your order. Nothing was charged — please try again." };
  }
}

export async function lookupOrdersAction(refs: unknown): Promise<Order[]> {
  if (!Array.isArray(refs)) return [];
  try {
    return await findOrders(refs);
  } catch (e) {
    console.error("lookupOrders failed", e);
    return [];
  }
}
