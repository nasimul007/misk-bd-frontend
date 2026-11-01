import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { orderNo } from "@/lib/server/orders";
import { createSession, sslConfig, validatePayment } from "@/lib/server/sslcommerz";

/** How long an online order may wait for its payment before stock goes back on the shelf. */
export const HOLD_MINUTES = 30;
const holdUntil = () => new Date(Date.now() + HOLD_MINUTES * 60_000);

export const sslEnabled = () => sslConfig() !== null;

type Start = { ok: true; url: string } | { ok: false; reason: string };

/** Opens a fresh SSLCommerz payment attempt for an order that is still waiting for money. */
export async function startSslcommerz(orderNumber: number): Promise<Start> {
  const cfg = sslConfig();
  if (!cfg) return { ok: false, reason: "Online payment isn't available right now." };

  const order = await db.order.findUnique({ where: { number: orderNumber }, include: { items: true, payments: true } });
  if (!order || order.paymentMethod !== "sslcommerz") return { ok: false, reason: "That order can't be paid online." };
  if (order.status !== "pending" || order.paymentStatus === "paid") return { ok: false, reason: "This order doesn't need a payment." };

  // Every attempt gets its own transaction id, so a retry never collides with an earlier try.
  const tranId = `${orderNo(order.number)}-${order.payments.filter((p) => p.providerRef).length + 1}`;
  const open = order.payments.find((p) => !p.providerRef && p.status === "pending");
  const payment = await db.$transaction(async (tx) => {
    await tx.order.update({ where: { id: order.id }, data: { paymentStatus: "pending", paymentDueAt: holdUntil() } });
    return open
      ? tx.payment.update({ where: { id: open.id }, data: { providerRef: tranId } })
      : tx.payment.create({ data: { orderId: order.id, method: "sslcommerz", status: "pending", amount: order.total, providerRef: tranId } });
  });

  const intl = order.shipKind === "intl";
  const first = order.items[0]?.title ?? "MISK BD order";
  const r = await createSession(cfg, {
    tranId,
    amount: order.total,
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
    await db.order.update({ where: { id: order.id }, data: { paymentStatus: "failed" } });
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
    if (v.currency !== "BDT" || v.amount !== order.total) {
      // Money arrived but not the right amount: never mark it paid on our own say-so.
      console.error("sslcommerz amount mismatch", { order: no, expected: order.total, got: v.amount, currency: v.currency });
      await tx.payment.update({ where: { id: payment.id }, data: { status: "failed", raw: { ...v.raw, problem: "amount_mismatch" } } });
      await tx.orderStatusHistory.create({ data: { orderId: order.id, status: order.status, note: `Payment of ${v.amount} ${v.currency} did not match the order total. Check the SSLCommerz panel.` } });
      return { orderNo: no, paid: false };
    }

    const notes = [`Paid online (SSLCommerz${v.cardType ? `, ${v.cardType}` : ""}${v.bankTranId ? `, ref ${v.bankTranId}` : ""})`];
    if (v.riskLevel === "1") notes.push("The gateway flagged this payment as risky. Check it in the SSLCommerz panel before shipping.");
    if (order.status === "cancelled") notes.push("This order was already cancelled, so its stock was released. Reinstate it or refund the customer.");
    await tx.payment.update({ where: { id: payment.id }, data: { status: "paid", raw: v.raw } });
    await tx.order.update({ where: { id: order.id }, data: { paymentStatus: "paid", paymentDueAt: null } });
    await tx.orderStatusHistory.create({ data: { orderId: order.id, status: order.status, note: notes.join(". ") } });
    return { orderNo: no, paid: true };
  });
}

/** The shopper backed out or the card was declined. The order stays open for a retry until the hold runs out. */
export async function failSslcommerz(tranId: string, kind: "failed" | "cancelled"): Promise<string | null> {
  const payment = await db.payment.findUnique({ where: { method_providerRef: { method: "sslcommerz", providerRef: tranId } }, include: { order: true } });
  if (!payment) return null;
  if (payment.status === "pending" && payment.order.paymentStatus !== "paid") {
    await db.$transaction([
      db.payment.update({ where: { id: payment.id }, data: { status: "failed", raw: { reason: kind } } }),
      db.order.update({ where: { id: payment.orderId }, data: { paymentStatus: "failed" } }),
    ]);
  }
  return orderNo(payment.order.number);
}

/**
 * Cancels online orders whose hold ran out without a payment and puts their stock back.
 * Safe to run often and from several places at once.
 */
export async function expireUnpaid(limit = 50): Promise<number> {
  const due = await db.order.findMany({
    where: { status: "pending", paymentMethod: "sslcommerz", paymentStatus: { in: ["pending", "failed"] }, paymentDueAt: { lt: new Date() } },
    select: { id: true },
    take: limit,
  });
  let done = 0;
  for (const { id } of due) {
    const ok = await db.$transaction(async (tx) => {
      await tx.$queryRaw(Prisma.sql`SELECT id FROM orders WHERE id = ${id}::uuid FOR UPDATE`);
      const o = await tx.order.findUniqueOrThrow({ where: { id }, include: { items: true } });
      if (o.status !== "pending" || o.paymentStatus === "paid" || !o.paymentDueAt || o.paymentDueAt > new Date()) return false;

      const per = new Map<string, number>();
      for (const i of o.items) if (i.productId) per.set(i.productId, (per.get(i.productId) ?? 0) + i.qty);
      for (const [productId, qty] of per) {
        const p = await tx.product.update({ where: { id: productId }, data: { stock: { increment: qty } } });
        await tx.inventoryAdjustment.create({ data: { productId, delta: qty, stockAfter: p.stock, reason: `Order ${orderNo(o.number)} cancelled: payment not received`, orderNumber: o.number, username: "system" } });
      }
      await tx.payment.updateMany({ where: { orderId: id, status: "pending" }, data: { status: "failed" } });
      await tx.order.update({ where: { id }, data: { status: "cancelled", cancelledAt: new Date(), paymentStatus: "failed", paymentDueAt: null } });
      await tx.orderStatusHistory.create({ data: { orderId: id, status: "cancelled", note: "Payment was not received in time" } });
      return true;
    });
    if (ok) done++;
  }
  return done;
}
