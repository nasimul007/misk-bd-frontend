"use server";

import { updateTag } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { NEXT, STATUSES, type Status } from "@/lib/order-flow";
import { UNIT_IDS } from "@/lib/units";
import { BLOCK_KEYS, parseBlock } from "@/lib/site-blocks";
import { parseOrderNo, recomputeRating, restockLines } from "@/lib/server/orders";
import { audit, changeOwnPassword, createStaff, resetStaffPassword, revokeAllStaffSessions, staffLogin, type Result } from "@/lib/server/staff";
import { assertStaff, Forbidden, startStaffSession, staffToken, stopStaffSession } from "@/lib/server/staff-session";

// Every mutation starts with assertStaff(): the check that counts. Hiding a button in the UI is cosmetic.

const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const int = (v: unknown) => (typeof v === "number" && Number.isInteger(v) ? v : typeof v === "string" && /^\d+$/.test(v.trim()) ? Number(v) : NaN);

async function guarded<R extends Result<object>>(role: "owner" | undefined, fn: (staff: Awaited<ReturnType<typeof assertStaff>>) => Promise<R>, opts?: { allowMustChange?: boolean }): Promise<R | { ok: false; error: string }> {
  try {
    return await fn(await assertStaff(role, opts));
  } catch (e) {
    if (e instanceof Forbidden) return { ok: false, error: e.message };
    console.error("admin action failed", e);
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}

// ───────── Sign in / out ─────────

export async function adminLoginAction(username: unknown, password: unknown): Promise<Result<{ mustChange: boolean }>> {
  try {
    const r = await staffLogin(text(username, 40), typeof password === "string" ? password : "");
    if (!r.ok) return r;
    await startStaffSession(r.staff.id);
    return { ok: true, mustChange: r.staff.mustChangePassword };
  } catch (e) {
    console.error("admin login failed", e);
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}

export async function adminLogoutAction(): Promise<void> {
  await stopStaffSession().catch((e) => console.error("admin logout failed", e));
}

export async function changePasswordAction(current: unknown, next: unknown): Promise<Result> {
  return guarded(undefined, async (s) => {
    const r = await changeOwnPassword(s.id, typeof current === "string" ? current : "", typeof next === "string" ? next : "", await staffToken());
    if (r.ok) await audit(s, "staff.password", "staff", s.id);
    return r;
  }, { allowMustChange: true });
}

// ───────── Orders ─────────


/** One status change, with every check the order needs (allowed move, stock, payment). Shared by the single and bulk actions. */
async function transitionOrder(s: Awaited<ReturnType<typeof assertStaff>>, orderNumber: unknown, status: unknown, note: unknown): Promise<Result> {
  {
    const number = typeof orderNumber === "string" ? parseOrderNo(orderNumber) : null;
    if (number === null || typeof status !== "string" || !STATUSES.includes(status as Status)) return { ok: false, error: "That change isn't valid." };
    const to = status as Status;

    return db.$transaction(async (tx): Promise<Result> => {
      // Lock the order so two staff clicking at once can't apply a transition twice (or restock twice).
      const locked = await tx.$queryRaw<{ id: string }[]>(Prisma.sql`SELECT id FROM orders WHERE number = ${number} FOR UPDATE`);
      if (!locked[0]) return { ok: false, error: "Order not found." };
      const order = await tx.order.findUniqueOrThrow({ where: { id: locked[0].id }, include: { items: true } });
      if (!NEXT[order.status].includes(to)) return { ok: false, error: `An order that is ${order.status} can't become ${to}.` };

      if (to === "confirmed" && (order.paymentStatus === "pending" || order.paymentStatus === "failed")) {
        return { ok: false, error: order.paymentMethod === "cod" ? "This order is waiting for its delivery charge to be paid online. Confirm it once the payment arrives." : "This order is waiting for its online payment. Confirm it once the payment arrives." };
      }

      const now = new Date();
      const data: Prisma.OrderUpdateInput = { status: to };
      if (to === "confirmed") data.confirmedAt = now;
      if (to === "shipped") data.shippedAt = now;
      if (to === "delivered") {
        data.deliveredAt = now;
        if (order.paymentMethod === "cod") data.paymentStatus = "cod_collected";
      }
      if (to === "cancelled") data.cancelledAt = now;

      // Stock was taken when the order was placed; give it back when the order won't be fulfilled.
      const restock = to === "cancelled" || to === "returned";
      const wasConfirmed = order.confirmedAt !== null;
      if (restock) await restockLines(tx, order.items, number, `Order MB-${10000 + number} ${to}`, { staffId: s.id, username: s.username });
      for (const i of order.items) {
        if (!i.productId) continue;
        const soldDelta = to === "confirmed" ? i.qty : restock && wasConfirmed ? -i.qty : 0;
        if (soldDelta) await tx.product.update({ where: { id: i.productId }, data: { soldCount: { increment: soldDelta } } });
      }
      if (to === "delivered" && order.paymentMethod === "cod") {
        await tx.payment.updateMany({ where: { orderId: order.id, method: "cod" }, data: { status: "paid" } });
      }
      await tx.order.update({ where: { id: order.id }, data });
      await tx.orderStatusHistory.create({ data: { orderId: order.id, status: to, note: text(note, 300) || null, actorId: s.id } });
      // Marking an order returned settles any open return request on it.
      if (to === "returned") await tx.returnRequest.updateMany({ where: { orderId: order.id, status: "open" }, data: { status: "closed", closedAt: now } });
      await tx.auditLog.create({ data: { staffId: s.id, username: s.username, action: "order.status", entity: "order", entityId: String(number), detail: { from: order.status, to } } });
      return { ok: true };
    });
  }
}

export async function setOrderStatusAction(orderNumber: unknown, status: unknown, note: unknown): Promise<Result> {
  return guarded(undefined, (s) => transitionOrder(s, orderNumber, status, note));
}

/** Apply one status to several orders. Each is checked on its own, so some can move while others are skipped with a reason. */
export async function bulkSetOrderStatusAction(orderNumbers: unknown, status: unknown): Promise<Result<{ done: number; skipped: { no: string; reason: string }[] }>> {
  return guarded(undefined, async (s) => {
    const list = Array.isArray(orderNumbers) ? orderNumbers.filter((n): n is string => typeof n === "string").slice(0, 50) : [];
    if (list.length === 0) return { ok: false, error: "Select at least one order." };
    let done = 0;
    const skipped: { no: string; reason: string }[] = [];
    for (const no of list) {
      const r = await transitionOrder(s, no, status, "");
      if (r.ok) done++; else skipped.push({ no, reason: r.error });
    }
    return { ok: true, done, skipped };
  });
}

/** Dismiss a customer's return request without returning the order (for example, it is outside the policy). */
export async function closeReturnRequestAction(orderNumber: unknown): Promise<Result> {
  return guarded(undefined, async (s) => {
    const number = typeof orderNumber === "string" ? parseOrderNo(orderNumber) : null;
    if (number === null) return { ok: false, error: "That change isn't valid." };
    const r = await db.returnRequest.updateMany({ where: { order: { number }, status: "open" }, data: { status: "closed", closedAt: new Date() } });
    if (r.count === 0) return { ok: false, error: "There is no open return request on this order." };
    await db.auditLog.create({ data: { staffId: s.id, username: s.username, action: "return.dismiss", entity: "order", entityId: String(number) } });
    return { ok: true };
  });
}

// ───────── Products ─────────

const MAX_OPTIONS = 8;
export type ProductInput = {
  slug: string | null;
  unit: string;
  title: string; titleAr: string; description: string; category: string; scentFamily: string; sectionSlug: string; subsectionSlug: string;
  bestseller: boolean; active: boolean; tags: string;
  lastingHours: number | string; projection: string; concentration: string; origin: string;
  variants: { size: string; price: number | string; stock: number | string }[];
  images: string[];
};

const slugify = (t: string) => t.toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 100);
const okImage = (u: string) => u.length <= 300 && /^\/[\w./-]+$/.test(u) && !u.includes("..");

export async function saveProductAction(raw: unknown): Promise<Result<{ slug: string }>> {
  return guarded("owner", async (s) => {
    const p = (raw ?? {}) as Partial<ProductInput>;
    const title = text(p.title, 120);
    if (!title) return { ok: false, error: "Enter a product name." };
    const category = text(p.category, 60);
    if (!category) return { ok: false, error: "Enter a category (for example Men's Perfume)." };

    const unit = text(p.unit, 12);
    if (!UNIT_IDS.includes(unit)) return { ok: false, error: "Choose what this product is sold in (ml, grams, pieces…)." };

    // Options in the order the admin listed them. The label is what shoppers see ("6ml", "50g", "Pack of 10").
    const seen = new Set<string>();
    const variants: { size: string; priceBdt: number; stock: number; position: number }[] = [];
    const given = Array.isArray(p.variants) ? p.variants : [];
    if (given.length > MAX_OPTIONS) return { ok: false, error: `A product can have up to ${MAX_OPTIONS} options.` };
    for (const v of given) {
      const size = text(v?.size, 40);
      const price = int(v?.price);
      if (!size) return { ok: false, error: "Every option needs a name, such as 50g or Pack of 10." };
      if (seen.has(size.toLowerCase())) return { ok: false, error: `"${size}" is listed twice.` };
      if (!Number.isInteger(price) || price < 1 || price > 10_000_000) return { ok: false, error: `Enter a price above 0 for ${size}.` };
      const stock = v?.stock === "" || v?.stock == null ? 0 : int(v.stock);
      if (!Number.isInteger(stock) || stock < 0 || stock > 100000) return { ok: false, error: `Stock for ${size} must be a whole number, 0 or more.` };
      seen.add(size.toLowerCase());
      variants.push({ size, priceBdt: price, stock, position: variants.length });
    }
    if (!variants.length) return { ok: false, error: "Add at least one option with a price." };

    const images = (Array.isArray(p.images) ? p.images : []).map((u) => text(u, 300)).filter(Boolean).slice(0, 5);
    if (images.some((u) => !okImage(u))) return { ok: false, error: "Images must be uploaded (or be a file already on the site)." };

    const sectionSlug = text(p.sectionSlug, 60);
    const section = sectionSlug ? await db.section.findUnique({ where: { slug: sectionSlug } }) : null;
    if (sectionSlug && !section) return { ok: false, error: "That collection doesn't exist." };
    const subSlug = text(p.subsectionSlug, 60);
    const sub = section && subSlug ? await db.subsection.findUnique({ where: { sectionId_slug: { sectionId: section.id, slug: subSlug } } }) : null;
    if (subSlug && !sub) return { ok: false, error: "That sub-section isn't in the chosen collection." };
    const lasting = p.lastingHours === "" || p.lastingHours == null ? null : int(p.lastingHours);
    if (lasting !== null && (!Number.isInteger(lasting) || lasting < 0 || lasting > 72)) return { ok: false, error: "Lasting hours must be between 0 and 72." };

    const data = {
      title, unit, titleAr: text(p.titleAr, 120) || null, description: text(p.description, 4000), category,
      scentFamily: text(p.scentFamily, 60) || null, sectionId: section?.id ?? null, subsectionId: sub?.id ?? null,
      bestseller: !!p.bestseller, active: !!p.active,
      tags: text(p.tags, 300).split(",").map((t) => t.trim().toLowerCase()).filter(Boolean).slice(0, 12),
      lastingHours: lasting, projection: text(p.projection, 60) || null, concentration: text(p.concentration, 60) || null, origin: text(p.origin, 120) || null,
    };

    const existingSlug = text(p.slug, 120);
    const slug = await db.$transaction(async (tx) => {
      let target = existingSlug;
      let id: string;
      if (existingSlug) {
        const row = await tx.product.findUnique({ where: { slug: existingSlug } });
        if (!row) throw new Forbidden("That product no longer exists.");
        id = row.id;
        // The product row is the lock orders also take, so this edit can't overwrite a stock change made by an order mid-way.
        await tx.$queryRaw(Prisma.sql`SELECT id FROM products WHERE id = ${id}::uuid FOR UPDATE`);
        await tx.product.update({ where: { id }, data: { ...data, archivedAt: data.active ? null : (row.archivedAt ?? new Date()) } });
      } else {
        const base = slugify(title) || "product";
        target = base;
        for (let n = 2; await tx.product.findUnique({ where: { slug: target } }); n++) target = `${base}-${n}`;
        id = (await tx.product.create({ data: { ...data, slug: target } })).id;
      }
      const before = new Map((await tx.productVariant.findMany({ where: { productId: id } })).map((v) => [v.size, v.stock]));
      await tx.productVariant.deleteMany({ where: { productId: id, size: { notIn: variants.map((v) => v.size) } } });
      for (const v of variants) {
        await tx.productVariant.upsert({ where: { productId_size: { productId: id, size: v.size } }, update: { priceBdt: v.priceBdt, position: v.position, stock: v.stock }, create: { productId: id, ...v } });
        // Every stock change leaves a log line, including the opening stock of a new option.
        const was = before.get(v.size) ?? 0;
        if (v.stock !== was) {
          await tx.inventoryAdjustment.create({ data: { productId: id, option: v.size, delta: v.stock - was, stockAfter: v.stock, reason: before.has(v.size) ? "Edited in product form" : "Opening stock", staffId: s.id, username: s.username } });
        }
      }
      await tx.productImage.deleteMany({ where: { productId: id } });
      if (images.length) await tx.productImage.createMany({ data: images.map((url, position) => ({ productId: id, url, position })) });
      await tx.auditLog.create({ data: { staffId: s.id, username: s.username, action: existingSlug ? "product.update" : "product.create", entity: "product", entityId: target, detail: { active: data.active, variants } } });
      return target;
    });
    updateTag("catalogue");
    return { ok: true, slug };
  });
}

// ───────── Inventory (any staff) ─────────

export async function adjustStockAction(slug: unknown, size: unknown, delta: unknown, reason: unknown): Promise<Result<{ stock: number }>> {
  return guarded(undefined, async (s) => {
    const change = typeof delta === "number" && Number.isInteger(delta) ? delta : NaN;
    if (!Number.isFinite(change) || change === 0 || Math.abs(change) > 10000) return { ok: false, error: "Enter a whole number, not zero." };
    const why = text(reason, 120);
    if (!why) return { ok: false, error: "Give a reason (for example Restock or Damaged)." };
    const key = text(slug, 120);
    const option = text(size, 40);

    const r = await db.$transaction(async (tx): Promise<Result<{ stock: number }>> => {
      // Same lock orders take, so a change here and a sale of the same option can't cross.
      const locked = await tx.$queryRaw<{ id: string }[]>(Prisma.sql`SELECT id FROM products WHERE slug = ${key} FOR UPDATE`);
      if (!locked[0]) return { ok: false, error: "Product not found." };
      const v = await tx.productVariant.findUnique({ where: { productId_size: { productId: locked[0].id, size: option } } });
      if (!v) return { ok: false, error: "That option no longer exists." };
      const next = v.stock + change;
      if (next < 0) return { ok: false, error: `Only ${v.stock} of ${option} in stock, so that would go below zero.` };
      await tx.productVariant.update({ where: { id: v.id }, data: { stock: next } });
      await tx.inventoryAdjustment.create({ data: { productId: locked[0].id, option, delta: change, stockAfter: next, reason: why, staffId: s.id, username: s.username } });
      await tx.auditLog.create({ data: { staffId: s.id, username: s.username, action: "stock.adjust", entity: "product", entityId: key, detail: { option, change, reason: why } } });
      return { ok: true, stock: next };
    });
    if (r.ok) updateTag("catalogue");
    return r;
  });
}

export async function setProductActiveAction(slug: unknown, active: unknown): Promise<Result> {
  return guarded("owner", async (s) => {
    const key = text(slug, 120);
    if (!key || typeof active !== "boolean") return { ok: false, error: "That change isn't valid." };
    const r = await db.product.updateMany({ where: { slug: key }, data: { active } });
    if (r.count === 0) return { ok: false, error: "Product not found." };
    await db.auditLog.create({ data: { staffId: s.id, username: s.username, action: active ? "product.restore" : "product.archive", entity: "product", entityId: key } });
    updateTag("catalogue");
    return { ok: true };
  });
}

/** Removes a product for good. Past orders keep their own copy of what was bought, so history is unaffected. */
export async function deleteProductAction(slug: unknown): Promise<Result> {
  return guarded("owner", async (s) => {
    const key = text(slug, 120);
    if (!key) return { ok: false, error: "That change isn't valid." };
    const done = await db.$transaction(async (tx) => {
      const p = await tx.product.findUnique({ where: { slug: key }, select: { id: true, title: true, _count: { select: { orderItems: true } } } });
      if (!p) return null;
      await tx.product.delete({ where: { id: p.id } });
      await tx.auditLog.create({ data: { staffId: s.id, username: s.username, action: "product.delete", entity: "product", entityId: key, detail: { title: p.title, orderLines: p._count.orderItems } } });
      return p;
    });
    if (!done) return { ok: false, error: "Product not found." };
    updateTag("catalogue");
    return { ok: true };
  });
}

// ───────── Reviews (any staff) ─────────

async function changeReview(id: unknown, act: (tx: Prisma.TransactionClient, review: { id: string; productId: string }) => Promise<void>, action: string, who: { id: string; username: string }): Promise<Result> {
  const key = text(id, 40);
  if (!/^[0-9a-f-]{36}$/.test(key)) return { ok: false, error: "That review could not be found." };
  const done = await db.$transaction(async (tx) => {
    const r = await tx.review.findUnique({ where: { id: key }, select: { id: true, productId: true } });
    if (!r) return false;
    await act(tx, r);
    await recomputeRating(tx, r.productId);
    await tx.auditLog.create({ data: { staffId: who.id, username: who.username, action, entity: "review", entityId: key } });
    return true;
  });
  if (!done) return { ok: false, error: "That review could not be found." };
  updateTag("catalogue");
  return { ok: true };
}

/** Hide a review from the shop (or show it again). A hidden review no longer counts towards the rating. */
export async function setReviewVisibleAction(id: unknown, visible: unknown): Promise<Result> {
  return guarded(undefined, (s) => changeReview(id, (tx, r) => tx.review.update({ where: { id: r.id }, data: { status: visible === true ? "visible" : "hidden" } }).then(() => undefined), visible === true ? "review.show" : "review.hide", s));
}

export async function deleteReviewAction(id: unknown): Promise<Result> {
  return guarded(undefined, (s) => changeReview(id, (tx, r) => tx.review.delete({ where: { id: r.id } }).then(() => undefined), "review.delete", s));
}

// ───────── Discounts ─────────

export type DiscountInput = {
  id: string | null; name: string; scope: string; target: string; type: string; value: number | string;
  sizes: string[]; startsOn: string; endsOn: string; active: boolean;
};
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export async function saveDiscountAction(raw: unknown): Promise<Result> {
  return guarded("owner", async (s) => {
    const d = (raw ?? {}) as Partial<DiscountInput>;
    const name = text(d.name, 80);
    if (!name) return { ok: false, error: "Give the discount a name, e.g. Eid Sale. Customers see it." };
    const scope = (["product", "category", "all"] as const).find((x) => x === d.scope);
    const type = (["percent", "fixed"] as const).find((x) => x === d.type);
    if (!scope) return { ok: false, error: "Choose what the discount applies to." };
    if (!type) return { ok: false, error: "Choose percent or fixed." };
    const value = typeof d.value === "number" ? d.value : Number(String(d.value ?? "").trim());
    if (!Number.isFinite(value) || value <= 0) return { ok: false, error: "The amount must be above 0." };
    if (type === "percent" && value >= 100) return { ok: false, error: "A percentage must be below 100." };
    if (type === "fixed" && (!Number.isInteger(value) || value > 10_000_000)) return { ok: false, error: "A fixed amount must be a whole number of taka." };

    const target = text(d.target, 120);
    let targetProductId: string | null = null;
    if (scope === "product") {
      const p = await db.product.findUnique({ where: { slug: target } });
      if (!p) return { ok: false, error: "Choose a product." };
      targetProductId = p.id;
    }
    if (scope === "category" && !target) return { ok: false, error: "Enter the category (for example Women's Perfume)." };
    const sizes = (Array.isArray(d.sizes) ? d.sizes : []).filter((x): x is string => typeof x === "string" && x.length > 0 && x.length <= 40);
    const startsOn = text(d.startsOn, 10), endsOn = text(d.endsOn, 10);
    if ((startsOn && !DATE.test(startsOn)) || (endsOn && !DATE.test(endsOn))) return { ok: false, error: "Use real dates." };
    if (startsOn && endsOn && endsOn < startsOn) return { ok: false, error: "The end date must be after the start date." };

    const data = {
      name, scope, type, value, sizes, active: !!d.active,
      targetProductId, targetCategory: scope === "category" ? target : null,
      startsOn: startsOn ? new Date(startsOn) : null, endsOn: endsOn ? new Date(endsOn) : null,
    };
    const id = text(d.id, 40);
    const row = id ? await db.discount.update({ where: { id }, data }) : await db.discount.create({ data });
    await audit(s, id ? "discount.update" : "discount.create", "discount", row.id, { name, scope, type, value });
    updateTag("catalogue");
    return { ok: true };
  });
}

export async function deleteDiscountAction(id: unknown): Promise<Result> {
  return guarded("owner", async (s) => {
    const key = text(id, 40);
    const gone = await db.discount.deleteMany({ where: { id: key } });
    if (gone.count) { await audit(s, "discount.delete", "discount", key); updateTag("catalogue"); }
    return { ok: true };
  });
}

// ───────── Staff (owner only) ─────────

export async function createStaffAction(username: unknown, name: unknown, password: unknown): Promise<Result> {
  return guarded("owner", async (s) => {
    const r = await createStaff(text(username, 40), text(name, 80), typeof password === "string" ? password : "", "admin");
    if (r.ok) await audit(s, "staff.create", "staff", r.staff.id, { username: r.staff.username });
    return r.ok ? { ok: true } : r;
  });
}

export async function setStaffActiveAction(id: unknown, active: unknown): Promise<Result> {
  return guarded("owner", async (s) => {
    const key = text(id, 40);
    const target = await db.staffAccount.findUnique({ where: { id: key } });
    if (!target) return { ok: false, error: "Account not found." };
    if (target.role === "owner" || target.id === s.id) return { ok: false, error: "The owner account can't be disabled." };
    await db.staffAccount.update({ where: { id: key }, data: { active: active === true } });
    if (active !== true) await revokeAllStaffSessions(key);
    await audit(s, active === true ? "staff.enable" : "staff.disable", "staff", key, { username: target.username });
    return { ok: true };
  });
}

export async function resetStaffPasswordAction(id: unknown, password: unknown): Promise<Result> {
  return guarded("owner", async (s) => {
    const key = text(id, 40);
    const target = await db.staffAccount.findUnique({ where: { id: key } });
    if (!target) return { ok: false, error: "Account not found." };
    if (target.role === "owner" && target.id !== s.id) return { ok: false, error: "Only the owner can change the owner's password, from their own account." };
    const r = await resetStaffPassword(key, typeof password === "string" ? password : "");
    if (r.ok) await audit(s, "staff.reset", "staff", key, { username: target.username });
    return r;
  });
}

// ───────── Site content and sections (owner only) ─────────

export async function saveBlockAction(key: unknown, data: unknown): Promise<Result> {
  return guarded("owner", async (s) => {
    const k = text(key, 40);
    if (!(BLOCK_KEYS as readonly string[]).includes(k)) return { ok: false, error: "Unknown content block." };
    const parsed = parseBlock(k, data);
    if (!parsed.ok) return parsed;
    await db.siteBlock.upsert({ where: { key: k }, update: { data: parsed.data as object, updatedBy: s.username }, create: { key: k, data: parsed.data as object, updatedBy: s.username } });
    await audit(s, "content.update", "content", k);
    updateTag("catalogue");
    return { ok: true };
  });
}

/** Drops the owner's edits for one block so the storefront shows the built-in default again. */
export async function resetBlockAction(key: unknown): Promise<Result> {
  return guarded("owner", async (s) => {
    const k = text(key, 40);
    await db.siteBlock.deleteMany({ where: { key: k } });
    await audit(s, "content.reset", "content", k);
    updateTag("catalogue");
    return { ok: true };
  });
}

const slugOf = (name: string) => name.toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "section";

export async function saveSectionAction(raw: unknown): Promise<Result> {
  return guarded("owner", async (s) => {
    const d = (raw ?? {}) as { id?: unknown; name?: unknown; blurb?: unknown; image?: unknown; visible?: unknown; showSpecs?: unknown };
    const name = text(d.name, 60);
    if (!name) return { ok: false, error: "Enter a name for the section." };
    const image = text(d.image, 300);
    if (image && !okImage(image)) return { ok: false, error: "The image must be uploaded or a file already on the site." };
    const data = { name, blurb: text(d.blurb, 160), image, visible: d.visible !== false, showSpecs: d.showSpecs !== false };
    const id = text(d.id, 40);

    const clash = await db.section.findFirst({ where: { name: { equals: name, mode: "insensitive" }, ...(id ? { id: { not: id } } : {}) } });
    if (clash) return { ok: false, error: "A section with that name already exists." };

    if (id) {
      await db.section.update({ where: { id }, data });
    } else {
      if ((await db.section.count()) >= 40) return { ok: false, error: "You can have up to 40 sections." };
      const last = await db.section.aggregate({ _max: { sortOrder: true } });
      let slug = slugOf(name);
      for (let n = 2; await db.section.findUnique({ where: { slug } }); n++) slug = `${slugOf(name)}-${n}`;
      await db.section.create({ data: { ...data, slug, image: image || "/images/product-1.jpg", sortOrder: (last._max.sortOrder ?? -1) + 1 } });
    }
    await audit(s, id ? "section.update" : "section.create", "section", id || name);
    updateTag("catalogue");
    return { ok: true };
  });
}

export async function deleteSectionAction(id: unknown): Promise<Result> {
  return guarded("owner", async (s) => {
    const key = text(id, 40);
    // Products keep existing (their section link is cleared); sub-sections go with the section.
    const gone = await db.section.deleteMany({ where: { id: key } });
    if (gone.count) { await audit(s, "section.delete", "section", key); updateTag("catalogue"); }
    return { ok: true };
  });
}

export async function moveSectionAction(id: unknown, direction: unknown): Promise<Result> {
  return guarded("owner", async (s) => {
    const key = text(id, 40);
    const list = await db.section.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true } });
    const i = list.findIndex((x) => x.id === key);
    const j = i + (direction === "up" ? -1 : 1);
    if (i < 0 || j < 0 || j >= list.length || (direction !== "up" && direction !== "down")) return { ok: true };
    const order = list.map((x) => x.id);
    [order[i], order[j]] = [order[j], order[i]];
    await db.$transaction(order.map((sid, n) => db.section.update({ where: { id: sid }, data: { sortOrder: n } })));
    await audit(s, "section.move", "section", key, { direction });
    updateTag("catalogue");
    return { ok: true };
  });
}

export async function saveSubsectionAction(sectionId: unknown, id: unknown, name: unknown): Promise<Result> {
  return guarded("owner", async (s) => {
    const sid = text(sectionId, 40);
    const subId = text(id, 40);
    const n = text(name, 60);
    if (!n) return { ok: false, error: "Enter a name." };
    if (!(await db.section.findUnique({ where: { id: sid } }))) return { ok: false, error: "That section no longer exists." };
    const clash = await db.subsection.findFirst({ where: { sectionId: sid, name: { equals: n, mode: "insensitive" }, ...(subId ? { id: { not: subId } } : {}) } });
    if (clash) return { ok: false, error: `"${n}" already exists in this section.` };
    if (subId) {
      await db.subsection.updateMany({ where: { id: subId, sectionId: sid }, data: { name: n } });
    } else {
      if ((await db.subsection.count({ where: { sectionId: sid } })) >= 40) return { ok: false, error: "You can have up to 40 sub-sections per section." };
      const last = await db.subsection.aggregate({ where: { sectionId: sid }, _max: { sortOrder: true } });
      let slug = slugOf(n);
      for (let k = 2; await db.subsection.findUnique({ where: { sectionId_slug: { sectionId: sid, slug } } }); k++) slug = `${slugOf(n)}-${k}`;
      await db.subsection.create({ data: { sectionId: sid, name: n, slug, sortOrder: (last._max.sortOrder ?? -1) + 1 } });
    }
    await audit(s, subId ? "subsection.update" : "subsection.create", "section", sid, { name: n });
    updateTag("catalogue");
    return { ok: true };
  });
}

export async function deleteSubsectionAction(sectionId: unknown, id: unknown): Promise<Result> {
  return guarded("owner", async (s) => {
    const gone = await db.subsection.deleteMany({ where: { id: text(id, 40), sectionId: text(sectionId, 40) } });
    if (gone.count) { await audit(s, "subsection.delete", "section", text(sectionId, 40)); updateTag("catalogue"); }
    return { ok: true };
  });
}
