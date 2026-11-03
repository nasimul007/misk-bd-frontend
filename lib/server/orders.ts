import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { bdLocal, computeTotals, estimateFor, validate, type CheckoutForm, type FormErrors } from "@/lib/checkout";
import { discountArgs, productArgs, toDiscount, toProduct } from "@/lib/data/mappers";
import { priceInfo } from "@/lib/pricing";
import { getPolicy } from "@/lib/server/policy";
import { sslConfig } from "@/lib/server/sslcommerz";
import type { FreshLine, Order } from "@/lib/orders";
import type { OrderPolicy } from "@/lib/types";

// Order creation. The browser only says WHAT it wants (slug, size, qty) and WHERE it ships; every price,
// discount, shipping fee and stock check is recomputed here from the database.

export type OrderLineInput = { slug: string; size: string; qty: number };
export type PlaceOrderInput = { lines: OrderLineInput[]; form: CheckoutForm; expectedTotal: number };

export type PlaceOrderResult =
  | { ok: true; orderNo: string; token: string; redirectUrl?: string; payError?: string }
  | { ok: false; code: "invalid"; message: string; errors?: FormErrors }
  | { ok: false; code: "unavailable" | "stock"; message: string; fresh: FreshLine[] }
  | { ok: false; code: "price_changed"; message: string; fresh: FreshLine[] };

const ORDER_BASE = 10000;
export const orderNo = (n: number) => `MB-${ORDER_BASE + n}`;
export const parseOrderNo = (no: string) => {
  const m = /^MB-(\d{5,9})$/.exec(no);
  const n = m ? Number(m[1]) - ORDER_BASE : NaN;
  return Number.isSafeInteger(n) && n > 0 && n <= 2_147_483_647 ? n : null;
};
const hash = (token: string) => createHash("sha256").update(token).digest("hex");

const MAX_LINES = 40;
const MAX_QTY = 99;
const str = (v: unknown, max = 255) => (typeof v === "string" ? v.slice(0, max) : "");

/** Everything crossing the network is untrusted: rebuild a clean input or reject it. */
export function parseInput(raw: unknown): PlaceOrderInput | null {
  if (!raw || typeof raw !== "object") return null;
  const { lines, form, expectedTotal } = raw as Record<string, unknown>;
  if (!Array.isArray(lines) || lines.length === 0 || lines.length > MAX_LINES || !form || typeof form !== "object") return null;

  const merged = new Map<string, OrderLineInput>();
  for (const l of lines) {
    const { slug, size, qty } = (l ?? {}) as Record<string, unknown>;
    if (typeof slug !== "string" || typeof size !== "string" || typeof qty !== "number" || !Number.isInteger(qty) || qty < 1 || qty > MAX_QTY) return null;
    const key = `${slug}__${size}`;
    const prev = merged.get(key);
    merged.set(key, { slug: slug.slice(0, 120), size: size.slice(0, 40), qty: Math.min(MAX_QTY, (prev?.qty ?? 0) + qty) });
  }

  const f = form as Record<string, unknown>;
  const clean: CheckoutForm = {
    intl: f.intl === true,
    name: str(f.name, 80), phone: str(f.phone, 30), dial: str(f.dial, 8), email: str(f.email, 120),
    division: str(f.division, 60), district: str(f.district, 60), thana: str(f.thana, 60),
    country: str(f.country, 80), region: str(f.region, 80), city: str(f.city, 80), postal: str(f.postal, 20),
    street: str(f.street, 300),
    note: str(f.note, 300).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, ""),
    contactless: f.contactless === true,
    pay: str(f.pay, 12) as CheckoutForm["pay"],
  };
  return { lines: [...merged.values()], form: clean, expectedTotal: typeof expectedTotal === "number" ? expectedTotal : NaN };
}

const phoneFor = (f: CheckoutForm) => (f.intl ? `${f.dial}${f.phone.replace(/\D/g, "")}` : `+88${bdLocal(f.phone)}`);

type Tx = Prisma.TransactionClient;

async function priceLines(tx: Tx, lines: OrderLineInput[]) {
  const slugs = [...new Set(lines.map((l) => l.slug))];

  // Lock the product rows (in a fixed order, so two orders can't deadlock) before reading stock. This lock is the
  // one mutex for a product's options: orders and staff stock changes both take it before touching stock.
  const locked = await tx.$queryRaw<{ id: string; slug: string }[]>(
    Prisma.sql`SELECT id, slug FROM products WHERE slug IN (${Prisma.join(slugs)}) AND active ORDER BY id FOR UPDATE`,
  );
  const rows = await tx.product.findMany({ where: { id: { in: locked.map((r) => r.id) } }, ...productArgs });
  const discounts = (await tx.discount.findMany(discountArgs)).map(toDiscount);
  const bySlug = new Map(rows.map((r) => [r.slug, r]));

  const priced = [];
  const fresh: FreshLine[] = [];
  const wanted = new Map<string, { slug: string; size: string; qty: number }>(); // qty per option: each size has its own stock
  let problem: "unavailable" | "stock" | null = null;
  let message = "";

  for (const l of lines) {
    const row = bySlug.get(l.slug);
    const product = row && toProduct(row);
    if (!row || !product || !product.variants.some((v) => v.size === l.size)) {
      problem = "unavailable";
      message = "An item in your bag is no longer available.";
      continue;
    }
    const info = priceInfo(product, l.size, discounts);
    const variant = row.variants.find((v) => v.size === l.size)!;
    const key = `${l.slug}__${l.size}`;
    wanted.set(key, { slug: l.slug, size: l.size, qty: (wanted.get(key)?.qty ?? 0) + l.qty });
    fresh.push({ slug: l.slug, size: l.size, price: info.price, original: info.original, stock: variant.stock });
    priced.push({ line: l, row, variant, product, info });
  }
  for (const { slug, size, qty } of wanted.values()) {
    const row = bySlug.get(slug)!;
    const have = row.variants.find((v) => v.size === size)!.stock;
    const name = row.variants.length > 1 ? `${row.title} (${size})` : row.title;
    if (qty > have && problem !== "unavailable") {
      problem = "stock";
      message = have <= 0 ? `${name} is out of stock.` : `Only ${have} of ${name} left in stock.`;
    }
  }
  return { priced, fresh, problem, message };
}

export async function placeOrder(input: PlaceOrderInput, customerId?: string): Promise<PlaceOrderResult> {
  const errors = validate(input.form);
  if (Object.keys(errors).length) return { ok: false, code: "invalid", message: "Please check your details.", errors };
  const f = input.form;
  const token = randomBytes(32).toString("base64url");

  return db.$transaction(async (tx): Promise<PlaceOrderResult> => {
    const { priced, fresh, problem, message } = await priceLines(tx, input.lines);
    if (problem) return { ok: false, code: problem, message, fresh };

    const t = computeTotals(
      priced.map((p) => ({ price: p.info.price, original: p.info.original, qty: p.line.qty })),
      { intl: f.intl, division: f.division },
    );
    if (t.total !== input.expectedTotal) {
      return { ok: false, code: "price_changed", message: "Some prices changed while you were shopping. Please review your bag.", fresh };
    }

    const cod = f.pay === "cod";
    const order = await tx.order.create({
      data: {
        guestTokenHash: hash(token),
        customerId: customerId ?? null,
        paymentMethod: f.pay as "bkash",
        paymentStatus: cod ? "cod_pending" : "pending",
        subtotalList: t.listTotal,
        discountTotal: t.savings,
        subtotal: t.subtotal,
        shippingFee: t.shipping,
        vatAmount: t.vat,
        total: t.total,
        contactName: f.name.trim(),
        contactPhone: phoneFor(f),
        contactEmail: f.email.trim() || null,
        shipKind: f.intl ? "intl" : "bd",
        shipDivision: f.intl ? null : f.division,
        shipDistrict: f.intl ? null : f.district,
        shipUpazila: f.intl ? null : f.thana,
        shipCountry: f.intl ? f.country : "Bangladesh",
        shipRegion: f.intl ? f.region.trim() : null,
        shipCity: f.intl ? f.city.trim() : null,
        shipPostal: f.intl ? f.postal.trim() : null,
        shipStreet: f.street.trim(),
        etaText: estimateFor(f.intl, f.division),
        deliveryNote: f.note.trim() || null,
        contactless: f.contactless,
        items: {
          create: priced.map(({ line, row, product, info }) => ({
            productId: row.id,
            slug: product.id,
            title: product.title,
            image: product.image,
            size: line.size,
            qty: line.qty,
            unitList: info.original,
            unitPrice: info.price,
            discount: info.rule?.name ?? null,
          })),
        },
        history: { create: { status: "pending", note: "Order placed" } },
        payments: { create: { method: f.pay as "bkash", status: "pending", amount: t.total } },
      },
    });

    // Take each option's units off its own stock (several lines can share one option).
    const perOption = new Map<string, { productId: string; size: string; qty: number }>();
    for (const p of priced) {
      const prev = perOption.get(p.variant.id);
      perOption.set(p.variant.id, { productId: p.row.id, size: p.variant.size, qty: (prev?.qty ?? 0) + p.line.qty });
    }
    for (const [id, o] of perOption) {
      const v = await tx.productVariant.update({ where: { id }, data: { stock: { decrement: o.qty } } });
      await tx.inventoryAdjustment.create({ data: { productId: o.productId, option: o.size, delta: -o.qty, stockAfter: v.stock, reason: `Order ${orderNo(order.number)} placed`, orderNumber: order.number, username: "system" } });
    }
    return { ok: true, orderNo: orderNo(order.number), token };
  });
}

const withDetail = {
  items: true,
  history: { select: { status: true, createdAt: true }, orderBy: { createdAt: "asc" } },
  returnRequests: { where: { status: "open" }, select: { id: true } },
  reviews: { select: { productId: true } },
} satisfies Prisma.OrderInclude;
type OrderRow = Prisma.OrderGetPayload<{ include: typeof withDetail }>;

/** Row to the shape the receipt and account pages already render. */
/** Whether the customer may still cancel under the owner's policy. */
export const cancellable = (status: string, policy: OrderPolicy) =>
  policy.customerCancel === "pending" ? status === "pending" : policy.customerCancel === "confirmed" ? status === "pending" || status === "confirmed" : false;

const DAY = 86_400_000;
/** Delivered, inside the return window, and no request already open. */
const returnable = (o: OrderRow, policy: OrderPolicy) =>
  o.status === "delivered" && policy.returnDays > 0 && !!o.deliveredAt && Date.now() - o.deliveredAt.getTime() <= policy.returnDays * DAY && o.returnRequests.length === 0;

/** Delivered items still waiting for a review: one per product, skipping any the customer already rated. */
function unreviewed(o: OrderRow) {
  const done = new Set(o.reviews.map((r) => r.productId));
  const seen = new Set<string>();
  const out: Order["toReview"] = [];
  for (const i of o.items) {
    if (!i.productId || done.has(i.productId) || seen.has(i.productId)) continue;
    seen.add(i.productId);
    out.push({ slug: i.slug, title: i.title, image: i.image });
  }
  return out;
}

function toOrder(o: OrderRow, policy: OrderPolicy): Order {
  const intl = o.shipKind === "intl";
  const country = o.shipCountry ?? "Bangladesh";
  return {
    id: orderNo(o.number),
    placedAt: o.createdAt.toISOString(),
    items: o.items.map((i) => ({ key: `${i.slug}__${i.size}`, id: i.slug, title: i.title, image: i.image, size: i.size, price: i.unitPrice, original: i.unitList, qty: i.qty, stock: 0 })),
    totals: { listTotal: o.subtotalList, subtotal: o.subtotal, savings: o.discountTotal, shipping: o.shippingFee, vat: o.vatAmount, total: o.total },
    pay: o.paymentMethod,
    timeline: o.history.map((h) => ({ status: h.status, at: h.createdAt.toISOString() })),
    payStatus: o.paymentStatus,
    payDueAt: o.paymentDueAt ? o.paymentDueAt.toISOString() : null,
    status: o.status,
    intl,
    name: o.contactName,
    phone: o.contactPhone,
    email: o.contactEmail ?? "",
    country,
    division: intl ? country : (o.shipDivision ?? ""),
    address: intl
      ? [o.shipStreet, o.shipCity, o.shipRegion, o.shipPostal, country].filter(Boolean).join(", ")
      : [o.shipStreet, o.shipUpazila, o.shipDistrict, o.shipDivision].filter(Boolean).join(", "),
    note: o.deliveryNote ?? "",
    contactless: o.contactless,
    canCancel: cancellable(o.status, policy),
    canReturn: returnable(o, policy),
    returnRequested: o.returnRequests.length > 0,
    toReview: o.status === "delivered" ? unreviewed(o) : [],
    canPayOnline: o.paymentMethod === "cod" && o.paymentStatus === "cod_pending" && ["pending", "confirmed", "packed", "shipped"].includes(o.status) && sslConfig() !== null,
  };
}

const tokenMatches = (stored: string | null, token: string) => {
  if (!stored) return false;
  const a = Buffer.from(stored, "hex");
  const b = Buffer.from(hash(token), "hex");
  return a.length === b.length && timingSafeEqual(a, b);
};

type Ref = { no: string; token: string };
const cleanRefs = (refs: Ref[]) =>
  refs
    .slice(0, 30)
    .map((r) => ({ n: typeof r?.no === "string" ? parseOrderNo(r.no) : null, token: typeof r?.token === "string" ? r.token.slice(0, 100) : "" }))
    .filter((r): r is { n: number; token: string } => r.n !== null);

/**
 * The order number alone grants nothing: the guest token issued at checkout must match, or the
 * signed-in customer must own the order.
 */
export async function findOrders(refs: Ref[], customerId?: string): Promise<Order[]> {
  const wanted = cleanRefs(refs);
  if (!wanted.length) return [];
  const rows = await db.order.findMany({ where: { number: { in: wanted.map((w) => w.n) } }, include: withDetail, orderBy: { createdAt: "desc" } });
  const tokenFor = new Map(wanted.map((w) => [w.n, w.token]));
  const policy = await getPolicy();
  return rows
    .filter((r) => (customerId && r.customerId === customerId) || (tokenFor.get(r.number) && tokenMatches(r.guestTokenHash, tokenFor.get(r.number)!)))
    .map((r) => toOrder(r, policy));
}

/** A customer's own orders, plus any guest orders this browser can prove it placed. */
export async function ordersFor(customerId: string, refs: Ref[] = []): Promise<Order[]> {
  const mine = await db.order.findMany({ where: { customerId }, include: withDetail, orderBy: { createdAt: "desc" }, take: 100 });
  const mineNos = new Set(mine.map((o) => o.number));
  const guest = await findOrders(refs.filter((r) => !mineNos.has(parseOrderNo(r?.no) ?? -1)));
  const policy = await getPolicy();
  return [...mine.map((r) => toOrder(r, policy)), ...guest].sort((a, b) => b.placedAt.localeCompare(a.placedAt));
}

/** On sign-in, attach guest orders this browser holds tokens for to the customer. Never touches an order that already has an owner. */
export async function claimOrders(customerId: string, refs: Ref[]): Promise<void> {
  const found = await findOrders(refs);
  const numbers = found.map((o) => parseOrderNo(o.id)).filter((n): n is number => n !== null);
  if (numbers.length) await db.order.updateMany({ where: { number: { in: numbers }, customerId: null }, data: { customerId } });
}


/**
 * Puts the units of an order's lines back on the shelf, each onto the option it was taken from, and logs it.
 * A line whose product or option no longer exists is skipped: there is nothing left to give the stock back to.
 */
export async function restockLines(
  tx: Tx,
  items: { productId: string | null; size: string; qty: number }[],
  orderNumber: number,
  reason: string,
  by: { staffId?: string; username: string },
) {
  const per = new Map<string, { productId: string; size: string; qty: number }>();
  for (const i of items) {
    if (!i.productId) continue;
    const k = `${i.productId}__${i.size}`;
    per.set(k, { productId: i.productId, size: i.size, qty: (per.get(k)?.qty ?? 0) + i.qty });
  }
  for (const o of per.values()) {
    const v = await tx.productVariant.findUnique({ where: { productId_size: { productId: o.productId, size: o.size } } });
    if (!v) continue;
    const after = await tx.productVariant.update({ where: { id: v.id }, data: { stock: { increment: o.qty } } });
    await tx.inventoryAdjustment.create({ data: { productId: o.productId, option: o.size, delta: o.qty, stockAfter: after.stock, reason, orderNumber, staffId: by.staffId ?? null, username: by.username } });
  }
}

// ───────── Proving an order is yours, then acting on it ─────────

const lastDigits = (v: string, n = 10) => v.replace(/\D/g, "").slice(-n);
const WINDOW = 15 * 60_000;

/** How a caller proves an order is theirs: the guest token from checkout, or the phone it was placed with. A signed-in owner needs neither. */
export type Proof = { token?: string; phone?: string };

type Found = { ok: true; row: OrderRow } | { ok: false; message: string };
const NOT_FOUND = "We couldn't find an order with those details. Check the order number and the phone number you ordered with.";

/**
 * The one door every customer-side order action goes through. The order number alone grants nothing: the
 * caller must be the signed-in owner, hold the order's guest token, or give the phone number it was placed with.
 * Wrong phone guesses are counted per order and per caller, and too many are refused.
 */
export async function authorizeOrder(no: string, proof: Proof, customerId: string | undefined, caller: string): Promise<Found> {
  const n = parseOrderNo(no.trim().toUpperCase().replace(/^(\d{5,9})$/, "MB-$1"));
  if (n === null) return { ok: false, message: NOT_FOUND };
  const row = await db.order.findUnique({ where: { number: n }, include: withDetail });
  if (row && customerId && row.customerId === customerId) return { ok: true, row };
  if (row && proof.token && tokenMatches(row.guestTokenHash, proof.token.slice(0, 100))) return { ok: true, row };

  const keys = [`track:order:${n}`, `track:caller:${caller}`];
  const since = new Date(Date.now() - WINDOW);
  const [perOrder, perCaller] = await Promise.all(keys.map((identifier) => db.loginAttempt.count({ where: { identifier, success: false, at: { gt: since } } })));
  if (perOrder >= 5 || perCaller >= 20) return { ok: false, message: "Too many attempts. Please wait a few minutes and try again." };

  const phone = proof.phone ?? "";
  if (!row || lastDigits(phone).length < 7 || lastDigits(phone) !== lastDigits(row.contactPhone)) {
    await db.loginAttempt.createMany({ data: keys.map((identifier) => ({ identifier, success: false })) });
    return { ok: false, message: NOT_FOUND };
  }
  return { ok: true, row };
}

export type TrackResult = { ok: true; order: Order } | { ok: false; message: string };

/** "Track my order": number plus phone, or the signed-in owner. */
export async function trackOrder(no: string, phone: string, customerId: string | undefined, caller: string): Promise<TrackResult> {
  const a = await authorizeOrder(no, { phone }, customerId, caller);
  return a.ok ? { ok: true, order: toOrder(a.row, await getPolicy()) } : a;
}

const reload = async (id: string): Promise<Order> => toOrder(await db.order.findUniqueOrThrow({ where: { id }, include: withDetail }), await getPolicy());

/** The customer cancels their own order, while the owner's policy still allows it. Stock goes back; a paid order is flagged for a refund. */
export async function cancelOrder(no: string, proof: Proof, customerId: string | undefined, caller: string, why: string): Promise<TrackResult> {
  const a = await authorizeOrder(no, proof, customerId, caller);
  if (!a.ok) return a;
  const policy = await getPolicy();
  const reason = why.trim().slice(0, 200);

  const done = await db.$transaction(async (tx): Promise<{ ok: true } | { ok: false; message: string }> => {
    await tx.$queryRaw(Prisma.sql`SELECT id FROM orders WHERE id = ${a.row.id}::uuid FOR UPDATE`);
    const o = await tx.order.findUniqueOrThrow({ where: { id: a.row.id }, include: { items: true } });
    if (!cancellable(o.status, policy)) {
      return { ok: false, message: policy.customerCancel === "off" || o.status === "cancelled" || o.status === "delivered" || o.status === "returned"
        ? (o.status === "cancelled" ? "This order is already cancelled." : "This order can't be cancelled online. Please contact us.")
        : "This order is already being prepared, so it can't be cancelled online. Please contact us." };
    }
    await restockLines(tx, o.items, o.number, `Order ${orderNo(o.number)} cancelled by the customer`, { username: "customer" });
    if (o.confirmedAt) for (const i of o.items) if (i.productId) await tx.product.update({ where: { id: i.productId }, data: { soldCount: { decrement: i.qty } } });
    await tx.payment.updateMany({ where: { orderId: o.id, status: "pending" }, data: { status: "failed" } });
    const paid = o.paymentStatus === "paid";
    await tx.order.update({ where: { id: o.id }, data: { status: "cancelled", cancelledAt: new Date(), paymentDueAt: null, ...(paid || o.paymentMethod === "cod" ? {} : { paymentStatus: "failed" }) } });
    await tx.orderStatusHistory.create({ data: { orderId: o.id, status: "cancelled", note: `Cancelled by the customer${reason ? `: ${reason}` : ""}${paid ? ". Paid online, so a refund is due." : ""}` } });
    return { ok: true };
  });
  return done.ok ? { ok: true, order: await reload(a.row.id) } : done;
}

/** A delivered order the customer wants to send back, inside the return window. Staff settle it from the admin. */
export async function requestReturn(no: string, proof: Proof, customerId: string | undefined, caller: string, why: string): Promise<TrackResult> {
  const reason = why.trim().replace(/\s+/g, " ").slice(0, 300);
  if (reason.length < 5) return { ok: false, message: "Please tell us briefly why you'd like to return it." };
  const a = await authorizeOrder(no, proof, customerId, caller);
  if (!a.ok) return a;
  const policy = await getPolicy();
  if (!returnable(a.row, policy)) {
    return { ok: false, message: a.row.returnRequests.length ? "A return request is already open for this order." : a.row.status !== "delivered" ? "Returns can be requested once the order is delivered." : "The return window for this order has passed. Please contact us." };
  }
  await db.$transaction([
    db.returnRequest.create({ data: { orderId: a.row.id, reason } }),
    db.orderStatusHistory.create({ data: { orderId: a.row.id, status: a.row.status, note: `Customer asked to return this order: ${reason}` } }),
  ]);
  return { ok: true, order: await reload(a.row.id) };
}

/** "Tahsin Rahman Shefat(Kabbo)" becomes "Tahsin S." so a review never shows a full name. */
const reviewer = (name: string) => {
  const parts = name.replace(/[()[\],"/]/g, " ").trim().split(/\s+/).filter(Boolean);
  return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.` : (parts[0] ?? "Customer");
};

/** Recompute a product's stored rating from its visible reviews. Call inside the transaction that changed them. */
export async function recomputeRating(tx: Tx, productId: string) {
  const agg = await tx.review.aggregate({ where: { productId, status: "visible" }, _avg: { rating: true }, _count: true });
  await tx.product.update({ where: { id: productId }, data: { ratingAvg: agg._avg.rating ? Math.round(agg._avg.rating * 10) / 10 : 0, reviewCount: agg._count } });
}

/** A verified-buyer review: only for a product on an order that was delivered, once per order and product. */
export async function submitReview(no: string, proof: Proof, customerId: string | undefined, caller: string, productSlug: string, rating: number, comment: string): Promise<TrackResult> {
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return { ok: false, message: "Choose a rating from 1 to 5 stars." };
  const text = comment.trim().replace(/\s+/g, " ").slice(0, 600);
  const a = await authorizeOrder(no, proof, customerId, caller);
  if (!a.ok) return a;
  if (a.row.status !== "delivered") return { ok: false, message: "You can review items once your order is delivered." };
  const item = a.row.items.find((i) => i.slug === productSlug && i.productId);
  if (!item?.productId) return { ok: false, message: "That item isn't on this order." };
  const productId = item.productId;
  try {
    await db.$transaction(async (tx) => {
      await tx.review.create({ data: { productId, orderId: a.row.id, author: reviewer(a.row.contactName), rating, comment: text } });
      await recomputeRating(tx, productId);
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return { ok: false, message: "You've already reviewed this item. Thank you!" };
    throw e;
  }
  return { ok: true, order: await reload(a.row.id) };
}
