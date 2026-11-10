import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { orderNo, restockLines } from "@/lib/server/orders";
import { createSession, sslConfig, validatePayment } from "@/lib/server/sslcommerz";

/** How long an online order may wait for its payment before stock goes back on the shelf. */
export const HOLD_MINUTES = 30;
const holdUntil = () => new Date(Date.now() + HOLD_MINUTES * 60_000);

export const sslEnabled = () => sslConfig() !== null;

type Start = { ok: true; url: string } | { ok: false; reason: string };

/**
 * Opens a fresh SSLCommerz payment attempt for an order that still owes money online. What is owed depends on the order:
 * an online order owes its whole total; a Cash on Delivery order owes its delivery charge before it counts as placed
 * (both are held for a short while, then released); and a Cash on Delivery order that is already placed can still be paid
 * in full before it arrives, which settles whatever is left.
 */
export async function startSslcommerz(orderNumber: number): Promise<Start> {
  const cfg = sslConfig();
  if (!cfg) return { ok: false, reason: "Online payment isn't available right now." };

  const order = await db.order.findUnique({ where: { number: orderNumber }, include: { items: true, payments: true } });
  if (!order || (order.paymentMethod !== "sslcommerz" && order.paymentMethod !== "cod")) return { ok: false, reason: "That order can't be paid online." };
  const cod = order.paymentMethod === "cod";
  const waiting = order.status === "pending" && (order.paymentStatus === "pending" || order.paymentStatus === "failed");
  const early = cod && order.paymentStatus === "cod_pending" && ["pending", "confirmed", "packed", "shipped"].includes(order.status);
  if (!waiting && !early) return { ok: false, reason: "This order doesn't need a payment." };
  const owed = !waiting ? order.total - order.paidAmount : cod ? order.shippingFee : order.total;
  if (owed <= 0) return { ok: false, reason: "This order doesn't need a payment." };

  // Every attempt gets its own transaction id, so a retry never collides with an earlier try.
  const tranId = `${orderNo(order.number)}-${order.payments.filter((p) => p.providerRef).length + 1}`;
  const open = waiting ? order.payments.find((p) => !p.providerRef && p.status === "pending" && p.method === "sslcommerz" && p.amount === owed) : undefined;
  const payment = await db.$transaction(async (tx) => {
    if (waiting) await tx.order.update({ where: { id: order.id }, data: { paymentStatus: "pending", paymentDueAt: holdUntil() } });
    return open
      ? tx.payment.update({ where: { id: open.id }, data: { providerRef: tranId } })
      : tx.payment.create({ data: { orderId: order.id, method: "sslcommerz", status: "pending", amount: owed, providerRef: tranId } });
  });

  const intl = order.shipKind === "intl";
  const first = order.items[0]?.title ?? "MISK BD order";
  const r = await createSession(cfg, {
    tranId,
    amount: owed,
    orderNo: orderNo(order.number),
    productName: order.items.length > 1 ? `${first} and ${order.items.length - 1} more` : first,
    itemCount: order.items.reduce((n, i) => n + i.qty, 0),
    name: order.contactName,
    email: order.contactEmail || "customer@miskbd.com",
    phone: order.contactPhone,
    address: order.shipStreet,
    city: (intl ? order.shipCity : order.shipDistrict) || "Dhaka",
    country: order.shipCountry ?? "Bangladesh",
    intl,
  });
  if (!r.ok) {
    await db.payment.update({ where: { id: payment.id }, data: { status: "failed", raw: { reason: r.reason } } });
    if (waiting) await db.order.update({ where: { id: order.id }, data: { paymentStatus: "failed" } });
  }
  return r;
}

export type Settled = { orderNo: string | null; paid: boolean };

/**
 * Confirms a payment with SSLCommerz itself. Called by both the browser return and the IPN, so it must be
 * safe to run twice (and at the same time): the order row is locked and a paid payment is never re-applied.
 */
export async function settleSslcommerz(valId: string, tranIdHint: string): Promise<Settled> {
  const cfg = sslConfig();
  const fallback = (tran: string) => ({ orderNo: /^(MB-\d{5,9})-\d+$/.exec(tran)?.[1] ?? null, paid: false });
  if (!cfg || !valId) return fallback(tranIdHint);

  const v = await validatePayment(cfg, valId);
  if (!v) return fallback(tranIdHint);
  const payment = await db.payment.findUnique({ where: { method_providerRef: { method: "sslcommerz", providerRef: v.tranId } } });
  if (!payment) return fallback(tranIdHint);

  return db.$transaction(async (tx): Promise<Settled> => {
    const locked = await tx.$queryRaw<{ id: string }[]>(Prisma.sql`SELECT id FROM orders WHERE id = ${payment.orderId}::uuid FOR UPDATE`);
    const order = await tx.order.findUniqueOrThrow({ where: { id: locked[0].id } });
    const no = orderNo(order.number);
    const current = await tx.payment.findUniqueOrThrow({ where: { id: payment.id } });
    if (current.status === "paid") return { orderNo: no, paid: true };

    if (v.status !== "VALID" && v.status !== "VALIDATED") return { orderNo: no, paid: false };
    // What we asked this attempt to collect: the whole total, or only the delivery charge of a Cash on Delivery order.
    if (v.currency !== "BDT" || v.amount !== current.amount) {
      // Money arrived but not the right amount: never mark it paid on our own say-so.
      console.error("sslcommerz amount mismatch", { order: no, expected: current.amount, got: v.amount, currency: v.currency });
      await tx.payment.update({ where: { id: payment.id }, data: { status: "failed", raw: { ...v.raw, problem: "amount_mismatch" } } });
      await tx.orderStatusHistory.create({ data: { orderId: order.id, status: order.status, note: `Payment of ${v.amount} ${v.currency} did not match the amount requested. Check the SSLCommerz panel.` } });
      return { orderNo: no, paid: false };
    }

    const paidAmount = Math.min(order.total, order.paidAmount + current.amount);
    const whole = paidAmount >= order.total;
    const wasCod = order.paymentMethod === "cod";
    const how = `SSLCommerz${v.cardType ? `, ${v.cardType}` : ""}${v.bankTranId ? `, ref ${v.bankTranId}` : ""}`;
    const notes = [whole
      ? `Paid online (${how})${wasCod ? ". It was Cash on Delivery, so nothing is due on delivery" : ""}`
      : `Delivery charge of ${current.amount} BDT paid online (${how}). Collect the remaining ${order.total - paidAmount} BDT on delivery`];
    if (v.riskLevel === "1") notes.push("The gateway flagged this payment as risky. Check it in the SSLCommerz panel before shipping.");
    if (order.status === "cancelled") notes.push("This order was already cancelled, so its stock was released. Reinstate it or refund the customer.");
    // Paying a Cash on Delivery order in full replaces the cash part; paying only its delivery charge keeps it Cash on Delivery.
    if (wasCod && whole) await tx.payment.updateMany({ where: { orderId: order.id, method: "cod", status: "pending" }, data: { status: "failed", raw: { superseded: "paid online" } } });
    await tx.payment.update({ where: { id: payment.id }, data: { status: "paid", raw: v.raw } });
    await tx.order.update({ where: { id: order.id }, data: { paidAmount, paymentDueAt: null, paymentStatus: whole ? "paid" : "cod_pending", ...(wasCod && whole ? { paymentMethod: "sslcommerz" as const } : {}) } });
    await tx.orderStatusHistory.create({ data: { orderId: order.id, status: order.status, note: notes.join(". ") } });
    return { orderNo: no, paid: true };
  });
}

/** The shopper backed out or the card was declined. The order stays open for a retry until the hold runs out. */
export async function failSslcommerz(tranId: string, kind: "failed" | "cancelled"): Promise<string | null> {
  const payment = await db.payment.findUnique({ where: { method_providerRef: { method: "sslcommerz", providerRef: tranId } }, include: { order: true } });
  if (!payment) return null;
  if (payment.status === "pending") {
    await db.payment.update({ where: { id: payment.id }, data: { status: "failed", raw: { reason: kind } } });
    // Only an order still waiting for its money is marked failed. A Cash on Delivery order whose optional
    // "pay it all now" attempt failed is still a perfectly good COD order.
    if (payment.order.paymentStatus === "pending") await db.order.update({ where: { id: payment.orderId }, data: { paymentStatus: "failed" } });
  }
  return orderNo(payment.order.number);
}

/**
 * Cancels orders (online, or Cash on Delivery awaiting its delivery charge) whose hold ran out without a payment and puts their stock back.
 * Safe to run often and from several places at once.
 */
export async function expireUnpaid(limit = 50): Promise<number> {
  const due = await db.order.findMany({
    where: { status: "pending", paymentMethod: { in: ["sslcommerz", "cod"] }, paymentStatus: { in: ["pending", "failed"] }, paymentDueAt: { lt: new Date() } },
    select: { id: true },
    take: limit,
  });
  let done = 0;
  for (const { id } of due) {
    const ok = await db.$transaction(async (tx) => {
      await tx.$queryRaw(Prisma.sql`SELECT id FROM orders WHERE id = ${id}::uuid FOR UPDATE`);
      const o = await tx.order.findUniqueOrThrow({ where: { id }, include: { items: true } });
      if (o.status !== "pending" || o.paymentStatus === "paid" || !o.paymentDueAt || o.paymentDueAt > new Date()) return false;

      await restockLines(tx, o.items, o.number, `Order ${orderNo(o.number)} cancelled: payment not received`, { username: "system" });
      await tx.payment.updateMany({ where: { orderId: id, status: "pending" }, data: { status: "failed" } });
      await tx.order.update({ where: { id }, data: { status: "cancelled", cancelledAt: new Date(), paymentStatus: "failed", paymentDueAt: null } });
      await tx.orderStatusHistory.create({ data: { orderId: id, status: "cancelled", note: o.paymentMethod === "cod" ? "The delivery charge was not paid in time" : "Payment was not received in time" } });
      return true;
    });
    if (ok) done++;
  }
  return done;
}
