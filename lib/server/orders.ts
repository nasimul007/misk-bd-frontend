import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { bdLocal, computeTotals, estimateFor, validate, type CheckoutForm, type FormErrors } from "@/lib/checkout";
import { discountArgs, productArgs, toDiscount, toProduct } from "@/lib/data/mappers";
import { priceInfo } from "@/lib/pricing";
import type { FreshLine, Order } from "@/lib/orders";

// Order creation. The browser only says WHAT it wants (slug, size, qty) and WHERE it ships; every price,
// discount, shipping fee and stock check is recomputed here from the database.

export type OrderLineInput = { slug: string; size: string; qty: number };
export type PlaceOrderInput = { lines: OrderLineInput[]; form: CheckoutForm; expectedTotal: number };

export type PlaceOrderResult =
  | { ok: true; orderNo: string; token: string }
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
    merged.set(key, { slug: slug.slice(0, 120), size: size.slice(0, 12), qty: Math.min(MAX_QTY, (prev?.qty ?? 0) + qty) });
  }

  const f = form as Record<string, unknown>;
  const clean: CheckoutForm = {
    intl: f.intl === true,
    name: str(f.name, 80), phone: str(f.phone, 30), dial: str(f.dial, 8), email: str(f.email, 120),
    division: str(f.division, 60), district: str(f.district, 60), thana: str(f.thana, 60),
    country: str(f.country, 80), region: str(f.region, 80), city: str(f.city, 80), postal: str(f.postal, 20),
    street: str(f.street, 300),
    pay: str(f.pay, 12) as CheckoutForm["pay"],
  };
  return { lines: [...merged.values()], form: clean, expectedTotal: typeof expectedTotal === "number" ? expectedTotal : NaN };
}

const phoneFor = (f: CheckoutForm) => (f.intl ? `${f.dial}${f.phone.replace(/\D/g, "")}` : `+88${bdLocal(f.phone)}`);

type Tx = Prisma.TransactionClient;

async function priceLines(tx: Tx, lines: OrderLineInput[]) {
  const slugs = [...new Set(lines.map((l) => l.slug))];

  // Lock the product rows (in a fixed order, so two orders can't deadlock) before reading stock.
  const locked = await tx.$queryRaw<{ id: string; slug: string }[]>(
    Prisma.sql`SELECT id, slug FROM products WHERE slug IN (${Prisma.join(slugs)}) AND active ORDER BY id FOR UPDATE`,
  );
  const rows = await tx.product.findMany({ where: { id: { in: locked.map((r) => r.id) } }, ...productArgs });
  const discounts = (await tx.discount.findMany(discountArgs)).map(toDiscount);
  const bySlug = new Map(rows.map((r) => [r.slug, r]));

  const priced = [];
  const fresh: FreshLine[] = [];
  const wanted = new Map<string, number>(); // qty per product (stock is per product, not per size)
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
    wanted.set(l.slug, (wanted.get(l.slug) ?? 0) + l.qty);
    fresh.push({ slug: l.slug, size: l.size, price: info.price, original: info.original, stock: row.stock });
    priced.push({ line: l, row, product, info });
  }
  for (const [slug, qty] of wanted) {
    const row = bySlug.get(slug)!;
    if (qty > row.stock && problem !== "unavailable") {
      problem = "stock";
      message = row.stock <= 0 ? `${row.title} is out of stock.` : `Only ${row.stock} of ${row.title} left in stock.`;
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

    const perProduct = new Map<string, number>();
    for (const p of priced) perProduct.set(p.row.id, (perProduct.get(p.row.id) ?? 0) + p.line.qty);
    for (const [id, qty] of perProduct) {
      const p = await tx.product.update({ where: { id }, data: { stock: { decrement: qty } } });
      await tx.inventoryAdjustment.create({ data: { productId: id, delta: -qty, stockAfter: p.stock, reason: `Order ${orderNo(order.number)} placed`, orderNumber: order.number, username: "system" } });
    }
    return { ok: true, orderNo: orderNo(order.number), token };
  });
}

type OrderRow = Prisma.OrderGetPayload<{ include: { items: true } }>;

/** Row to the shape the receipt and account pages already render. */
function toOrder(o: OrderRow): Order {
  const intl = o.shipKind === "intl";
  const country = o.shipCountry ?? "Bangladesh";
  return {
    id: orderNo(o.number),
    placedAt: o.createdAt.toISOString(),
    items: o.items.map((i) => ({ key: `${i.slug}__${i.size}`, id: i.slug, title: i.title, image: i.image, size: i.size, price: i.unitPrice, original: i.unitList, qty: i.qty, stock: 0 })),
    totals: { listTotal: o.subtotalList, subtotal: o.subtotal, savings: o.discountTotal, shipping: o.shippingFee, vat: o.vatAmount, total: o.total },
    pay: o.paymentMethod,
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
  const rows = await db.order.findMany({ where: { number: { in: wanted.map((w) => w.n) } }, include: { items: true }, orderBy: { createdAt: "desc" } });
  const tokenFor = new Map(wanted.map((w) => [w.n, w.token]));
  return rows
    .filter((r) => (customerId && r.customerId === customerId) || (tokenFor.get(r.number) && tokenMatches(r.guestTokenHash, tokenFor.get(r.number)!)))
    .map(toOrder);
}

/** A customer's own orders, plus any guest orders this browser can prove it placed. */
export async function ordersFor(customerId: string, refs: Ref[] = []): Promise<Order[]> {
  const mine = await db.order.findMany({ where: { customerId }, include: { items: true }, orderBy: { createdAt: "desc" }, take: 100 });
  const mineNos = new Set(mine.map((o) => o.number));
  const guest = await findOrders(refs.filter((r) => !mineNos.has(parseOrderNo(r?.no) ?? -1)));
  return [...mine.map(toOrder), ...guest].sort((a, b) => b.placedAt.localeCompare(a.placedAt));
}

/** On sign-in, attach guest orders this browser holds tokens for to the customer. Never touches an order that already has an owner. */
export async function claimOrders(customerId: string, refs: Ref[]): Promise<void> {
  const found = await findOrders(refs);
  const numbers = found.map((o) => parseOrderNo(o.id)).filter((n): n is number => n !== null);
  if (numbers.length) await db.order.updateMany({ where: { number: { in: numbers }, customerId: null }, data: { customerId } });
}
