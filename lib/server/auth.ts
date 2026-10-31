import "server-only";
import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { hash as argonHash, verify as argonVerify } from "@node-rs/argon2";
import type { Customer } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { bdLocal } from "@/lib/checkout";
import { sendEmail, sendSms } from "./notify";

// Customer authentication core. Cookie handling lives in session.ts; everything here takes and returns plain
// values so it can be tested without a request. Messages never reveal whether an account exists.

export type AuthUser = { id: string; name: string; phone: string; email: string; hasPassword: boolean };
export type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

const OTP_TTL_MS = 5 * 60_000;
const OTP_MAX_ATTEMPTS = 5;
const OTP_MAX_PER_WINDOW = 3; // codes per phone per 10 minutes
const LOGIN_MAX_FAILS = 5; // per email per 15 minutes
const RESET_TTL_MS = 30 * 60_000;
const SESSION_TTL_MS = 30 * 86_400_000;

const sha256 = (v: string) => createHash("sha256").update(v).digest("hex");
const secret = () => {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 16) throw new Error("AUTH_SECRET is not set");
  return s;
};
const hmac = (v: string) => createHmac("sha256", secret()).update(v).digest("hex");
const same = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const normalizeEmail = (e: string) => e.trim().toLowerCase();
export const validEmail = (e: string) => e.length <= 120 && EMAIL.test(e);

/** National mobile number to E.164, or null if it isn't a Bangladeshi mobile. */
export const toE164 = (phone: string) => {
  const local = bdLocal(phone);
  return /^01[3-9]\d{8}$/.test(local) ? `+88${local}` : null;
};

const COMMON = ["password", "password1", "12345678", "123456789", "1234567890", "qwerty123", "qwerty1234", "letmein123", "welcome123", "miskbd123", "iloveyou1"];
export function passwordProblem(pw: unknown): string | null {
  if (typeof pw !== "string" || pw.length < 8) return "Use at least 8 characters.";
  if (pw.length > 128) return "Use 128 characters or fewer.";
  if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return "Include both letters and numbers.";
  if (COMMON.includes(pw.toLowerCase())) return "That password is too common.";
  return null;
}

export const toUser = (c: Pick<Customer, "id" | "name" | "phone" | "email" | "passwordHash">): AuthUser => ({
  id: c.id,
  name: c.name,
  phone: c.phone ?? "",
  email: c.email ?? "",
  hasPassword: !!c.passwordHash,
});

// A real hash to verify against when the email is unknown, so timing doesn't reveal which emails exist.
let dummyHash: Promise<string> | undefined;
const getDummy = () => (dummyHash ??= argonHash(randomBytes(16).toString("hex")));

// ───────── Phone OTP ─────────

export async function requestOtp(rawPhone: string): Promise<Result> {
  const phone = toE164(rawPhone);
  if (!phone) return { ok: false, error: "Enter a valid 11-digit Bangladeshi mobile number." };

  const recent = await db.otpCode.count({ where: { phone, purpose: "login", createdAt: { gt: new Date(Date.now() - 10 * 60_000) } } });
  if (recent >= OTP_MAX_PER_WINDOW) return { ok: false, error: "Too many codes requested. Please wait a few minutes and try again." };

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await db.otpCode.create({ data: { phone, purpose: "login", codeHash: hmac(`${phone}:${code}`), expiresAt: new Date(Date.now() + OTP_TTL_MS) } });
  try {
    await sendSms(phone, `Your Misk BD code is ${code}. It expires in 5 minutes. Don't share it with anyone.`);
  } catch (e) {
    console.error("OTP SMS failed", e);
    return { ok: false, error: "We couldn't send the code right now. Please try again shortly." };
  }
  return { ok: true };
}

export async function verifyOtp(rawPhone: string, rawCode: string): Promise<Result<{ user: AuthUser }>> {
  const phone = toE164(rawPhone);
  const code = typeof rawCode === "string" ? rawCode.trim() : "";
  const bad = { ok: false, error: "That code is incorrect or has expired." } as const;
  if (!phone || !/^\d{6}$/.test(code)) return bad;

  const row = await db.otpCode.findFirst({
    where: { phone, purpose: "login", consumedAt: null, expiresAt: { gt: new Date() }, attempts: { lt: OTP_MAX_ATTEMPTS } },
    orderBy: { createdAt: "desc" },
  });
  if (!row) return bad;
  if (!same(row.codeHash, hmac(`${phone}:${code}`))) {
    await db.otpCode.update({ where: { id: row.id }, data: { attempts: { increment: 1 } } });
    return bad;
  }
  // Single use: only one concurrent request can flip consumedAt.
  const claimed = await db.otpCode.updateMany({ where: { id: row.id, consumedAt: null }, data: { consumedAt: new Date() } });
  if (claimed.count !== 1) return bad;

  const existing = await db.customer.findUnique({ where: { phone } });
  if (existing?.status === "blocked") return { ok: false, error: "This account is unavailable. Please contact us." };
  const customer = existing
    ? await db.customer.update({ where: { id: existing.id }, data: { phoneVerifiedAt: existing.phoneVerifiedAt ?? new Date(), lastLoginAt: new Date() } })
    : await db.customer.create({ data: { phone, phoneVerifiedAt: new Date(), lastLoginAt: new Date() } });
  return { ok: true, user: toUser(customer) };
}

// ───────── Email + password ─────────

async function recentFails(email: string) {
  return db.loginAttempt.count({ where: { identifier: email, success: false, at: { gt: new Date(Date.now() - 15 * 60_000) } } });
}

export async function signUpWithEmail(name: string, rawEmail: string, password: string): Promise<Result<{ user: AuthUser }>> {
  const email = normalizeEmail(rawEmail);
  if (!validEmail(email)) return { ok: false, error: "Enter a valid email address." };
  const problem = passwordProblem(password);
  if (problem) return { ok: false, error: problem };
  const cleanName = typeof name === "string" ? name.trim().slice(0, 80) : "";

  if (await db.customer.findUnique({ where: { email } })) {
    return { ok: false, error: "An account with this email already exists. Try signing in, or reset your password." };
  }
  try {
    const customer = await db.customer.create({ data: { name: cleanName, email, passwordHash: await argonHash(password), lastLoginAt: new Date() } });
    return { ok: true, user: toUser(customer) };
  } catch (e) {
    if ((e as { code?: string }).code === "P2002") return { ok: false, error: "An account with this email already exists. Try signing in, or reset your password." };
    throw e;
  }
}

export async function signInWithEmail(rawEmail: string, password: string): Promise<Result<{ user: AuthUser }>> {
  const email = normalizeEmail(rawEmail);
  const generic = { ok: false, error: "Incorrect email or password." } as const;
  if (!validEmail(email) || typeof password !== "string" || password.length > 128) return generic;

  if ((await recentFails(email)) >= LOGIN_MAX_FAILS) {
    return { ok: false, error: "Too many failed attempts. Please wait 15 minutes or reset your password." };
  }
  const customer = await db.customer.findUnique({ where: { email } });
  const good = await argonVerify(customer?.passwordHash ?? (await getDummy()), password).catch(() => false);
  if (!customer || !customer.passwordHash || !good) {
    await db.loginAttempt.create({ data: { identifier: email, success: false } });
    return generic;
  }
  if (customer.status === "blocked") return { ok: false, error: "This account is unavailable. Please contact us." };
  await db.loginAttempt.create({ data: { identifier: email, success: true } });
  const updated = await db.customer.update({ where: { id: customer.id }, data: { lastLoginAt: new Date() } });
  return { ok: true, user: toUser(updated) };
}

// ───────── Password reset ─────────

export async function requestPasswordReset(rawEmail: string): Promise<void> {
  const email = normalizeEmail(rawEmail);
  if (!validEmail(email)) return;
  const customer = await db.customer.findUnique({ where: { email } });
  if (!customer || customer.status === "blocked") return; // same response either way

  const recent = await db.passwordResetToken.count({ where: { customerId: customer.id, createdAt: { gt: new Date(Date.now() - 10 * 60_000) } } });
  if (recent >= 3) return;

  const token = randomBytes(32).toString("base64url");
  await db.passwordResetToken.create({ data: { customerId: customer.id, tokenHash: sha256(token), expiresAt: new Date(Date.now() + RESET_TTL_MS) } });
  const base = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  try {
    await sendEmail(email, "Reset your Misk BD password", `Use this link to choose a new password. It expires in 30 minutes.\n\n${base}/reset-password?token=${token}\n\nIf you didn't ask for this, you can ignore this email.`);
  } catch (e) {
    console.error("Reset email failed", e);
  }
}

export async function resetPassword(token: string, password: string): Promise<Result<{ user: AuthUser }>> {
  const problem = passwordProblem(password);
  if (problem) return { ok: false, error: problem };
  const bad = { ok: false, error: "This reset link is invalid or has expired." } as const;
  if (typeof token !== "string" || token.length < 20 || token.length > 100) return bad;

  const row = await db.passwordResetToken.findUnique({ where: { tokenHash: sha256(token) } });
  if (!row || row.usedAt || row.expiresAt < new Date()) return bad;
  const claimed = await db.passwordResetToken.updateMany({ where: { id: row.id, usedAt: null }, data: { usedAt: new Date() } });
  if (claimed.count !== 1) return bad;

  const customer = await db.customer.update({ where: { id: row.customerId }, data: { passwordHash: await argonHash(password), emailVerifiedAt: new Date() } });
  await db.authSession.updateMany({ where: { customerId: customer.id, revokedAt: null }, data: { revokedAt: new Date() } }); // sign out everywhere
  await db.loginAttempt.deleteMany({ where: { identifier: customer.email ?? "" } });
  return { ok: true, user: toUser(customer) };
}

// ───────── Sessions ─────────

export async function createSession(customerId: string, userAgent?: string | null) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db.authSession.create({ data: { customerId, tokenHash: sha256(token), expiresAt, userAgent: userAgent?.slice(0, 200) ?? null } });
  return { token, expiresAt };
}

export async function userForSession(token: string | undefined): Promise<AuthUser | null> {
  if (!token || token.length > 100) return null;
  const s = await db.authSession.findUnique({ where: { tokenHash: sha256(token) }, include: { customer: true } });
  if (!s || s.revokedAt || s.expiresAt < new Date() || s.customer.status !== "active") return null;
  // Slide the expiry, but not on every request.
  if (Date.now() - s.lastSeenAt.getTime() > 10 * 60_000) {
    await db.authSession.update({ where: { id: s.id }, data: { lastSeenAt: new Date(), expiresAt: new Date(Date.now() + SESSION_TTL_MS) } });
  }
  return toUser(s.customer);
}

export async function endSession(token: string | undefined) {
  if (!token) return;
  await db.authSession.updateMany({ where: { tokenHash: sha256(token), revokedAt: null }, data: { revokedAt: new Date() } });
}
