"use server";

import { bdLocal } from "@/lib/checkout";
import { db } from "@/lib/db";
import {
  normalizeEmail, requestOtp, requestPasswordReset, resetPassword, signInWithEmail, signUpWithEmail, validEmail, verifyOtp,
  type AuthUser, type Result,
} from "@/lib/server/auth";
import { claimOrders, ordersFor } from "@/lib/server/orders";
import { currentUser, startSession, stopSession } from "@/lib/server/session";
import type { Order, OrderRef } from "@/lib/orders";

// Server actions run on the server whatever the caller sends, so every argument is re-checked here.

const text = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");
const refsOf = (v: unknown): OrderRef[] =>
  Array.isArray(v) ? v.slice(0, 30).map((r) => ({ no: text(r?.no, 20), token: text(r?.token, 100) })) : [];

const fail = (e: unknown): { ok: false; error: string } => {
  console.error("auth action failed", e);
  return { ok: false, error: "Something went wrong. Please try again." };
};

/** Signs in a verified user, attaches the guest orders this browser holds, and returns the public profile. */
async function signedIn(user: AuthUser, refs: OrderRef[]): Promise<Result<{ user: AuthUser }>> {
  await startSession(user.id);
  await claimOrders(user.id, refs).catch((e) => console.error("claimOrders failed", e));
  return { ok: true, user };
}

export async function meAction(): Promise<AuthUser | null> {
  try { return await currentUser(); } catch { return null; }
}

export async function requestOtpAction(phone: unknown): Promise<Result> {
  try { return await requestOtp(text(phone, 30)); } catch (e) { return fail(e); }
}

export async function verifyOtpAction(phone: unknown, code: unknown, refs: unknown): Promise<Result<{ user: AuthUser }>> {
  try {
    const r = await verifyOtp(text(phone, 30), text(code, 10));
    return r.ok ? await signedIn(r.user, refsOf(refs)) : r;
  } catch (e) { return fail(e); }
}

export async function signUpAction(name: unknown, email: unknown, password: unknown, refs: unknown): Promise<Result<{ user: AuthUser }>> {
  try {
    const r = await signUpWithEmail(text(name, 80), text(email, 120), text(password, 200));
    return r.ok ? await signedIn(r.user, refsOf(refs)) : r;
  } catch (e) { return fail(e); }
}

export async function signInAction(email: unknown, password: unknown, refs: unknown): Promise<Result<{ user: AuthUser }>> {
  try {
    const r = await signInWithEmail(text(email, 120), text(password, 200));
    return r.ok ? await signedIn(r.user, refsOf(refs)) : r;
  } catch (e) { return fail(e); }
}

/** Always succeeds from the caller's point of view, so it can't be used to discover which emails have accounts. */
export async function forgotPasswordAction(email: unknown): Promise<Result> {
  try { await requestPasswordReset(text(email, 120)); } catch (e) { console.error("reset request failed", e); }
  return { ok: true };
}

export async function resetPasswordAction(token: unknown, password: unknown): Promise<Result<{ user: AuthUser }>> {
  try {
    const r = await resetPassword(text(token, 100), text(password, 200));
    if (!r.ok) return r;
    await startSession(r.user.id);
    return r;
  } catch (e) { return fail(e); }
}

export async function signOutAction(): Promise<void> {
  try { await stopSession(); } catch (e) { console.error("signOut failed", e); }
}

export async function updateProfileAction(name: unknown, email: unknown): Promise<Result<{ user: AuthUser }>> {
  const user = await currentUser();
  if (!user) return { ok: false, error: "Please sign in again." };
  const cleanName = text(name, 80).trim();
  const cleanEmail = normalizeEmail(text(email, 120));
  if (cleanEmail && !validEmail(cleanEmail)) return { ok: false, error: "Enter a valid email address." };
  try {
    if (cleanEmail && cleanEmail !== user.email) {
      const taken = await db.customer.findUnique({ where: { email: cleanEmail } });
      if (taken && taken.id !== user.id) return { ok: false, error: "That email is already used by another account." };
    }
    const c = await db.customer.update({
      where: { id: user.id },
      data: { name: cleanName, ...(cleanEmail !== user.email ? { email: cleanEmail || null, emailVerifiedAt: null } : {}) },
    });
    return { ok: true, user: { id: c.id, name: c.name, phone: c.phone ?? "", email: c.email ?? "", hasPassword: !!c.passwordHash } };
  } catch (e) { return fail(e); }
}

export type AddressDto = { id: string; label: string; text: string; isDefault: boolean };
const toAddress = (a: { id: string; label: string; street: string; isDefault: boolean }): AddressDto => ({ id: a.id, label: a.label, text: a.street, isDefault: a.isDefault });

export async function listAddressesAction(): Promise<AddressDto[]> {
  const user = await currentUser();
  if (!user) return [];
  return (await db.customerAddress.findMany({ where: { customerId: user.id }, orderBy: { createdAt: "asc" } })).map(toAddress);
}

export async function addAddressAction(label: unknown, address: unknown): Promise<Result<{ addresses: AddressDto[] }>> {
  const user = await currentUser();
  if (!user) return { ok: false, error: "Please sign in again." };
  const street = text(address, 255).trim();
  if (street.length < 8) return { ok: false, error: "Enter the full address." };
  const count = await db.customerAddress.count({ where: { customerId: user.id } });
  if (count >= 10) return { ok: false, error: "You can save up to 10 addresses." };
  await db.customerAddress.create({ data: { customerId: user.id, label: text(label, 40).trim() || "Address", street, isDefault: count === 0 } });
  return { ok: true, addresses: await listAddressesAction() };
}

export async function removeAddressAction(id: unknown): Promise<Result<{ addresses: AddressDto[] }>> {
  const user = await currentUser();
  if (!user) return { ok: false, error: "Please sign in again." };
  const gone = await db.customerAddress.deleteMany({ where: { id: text(id, 40), customerId: user.id } }).catch(() => ({ count: 0 }));
  if (gone.count) {
    const rest = await db.customerAddress.findMany({ where: { customerId: user.id }, orderBy: { createdAt: "asc" } });
    if (rest.length && !rest.some((a) => a.isDefault)) await db.customerAddress.update({ where: { id: rest[0].id }, data: { isDefault: true } });
  }
  return { ok: true, addresses: await listAddressesAction() };
}

export async function myOrdersAction(refs: unknown): Promise<Order[]> {
  const user = await currentUser();
  if (!user) return [];
  try { return await ordersFor(user.id, refsOf(refs)); } catch (e) { console.error("myOrders failed", e); return []; }
}

export type Prefill = { name: string; phone: string; email: string; division: string; district: string; thana: string; street: string };

/**
 * Details to pre-fill checkout for a signed-in customer: their account name, phone and email, and the
 * delivery address from their last Bangladesh order (it is complete: division, district, upazila, street),
 * falling back to their default saved address text.
 */
export async function checkoutPrefillAction(): Promise<Prefill | null> {
  const user = await currentUser();
  if (!user) return null;
  try {
    const [last, saved] = await Promise.all([
      db.order.findFirst({ where: { customerId: user.id, shipKind: "bd" }, orderBy: { createdAt: "desc" }, select: { shipDivision: true, shipDistrict: true, shipUpazila: true, shipStreet: true } }),
      db.customerAddress.findFirst({ where: { customerId: user.id }, orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }], select: { street: true } }),
    ]);
    return {
      name: user.name,
      phone: user.phone ? bdLocal(user.phone) : "",
      email: user.email ?? "",
      division: last?.shipDivision ?? "",
      district: last?.shipDistrict ?? "",
      thana: last?.shipUpazila ?? "",
      street: last?.shipStreet ?? saved?.street ?? "",
    };
  } catch (e) {
    console.error("checkoutPrefill failed", e);
    return null;
  }
}
