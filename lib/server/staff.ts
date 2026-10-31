import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { hash as argonHash, verify as argonVerify } from "@node-rs/argon2";
import type { StaffAccount } from "@/generated/prisma/client";
import { db } from "@/lib/db";

// Staff (admin) authentication core. Separate from customers: own table, own cookie, shorter sessions.
// Cookie handling is in staff-session.ts; everything here takes and returns plain values.

export type Staff = { id: string; username: string; name: string; role: "owner" | "admin"; mustChangePassword: boolean };
export type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

export const IDLE_MS = 15 * 60_000; // signed out after 15 minutes without a request
const ABSOLUTE_MS = 12 * 3_600_000;
const MAX_FAILS = 5;

const sha256 = (v: string) => createHash("sha256").update(v).digest("hex");
export const USERNAME = /^[a-z0-9._-]{3,32}$/;

const COMMON = ["password1234", "1234567890", "qwerty1234", "admin12345", "owner12345", "letmein1234", "welcome1234", "miskbd12345"];
export function passwordProblem(pw: unknown, username?: string): string | null {
  if (typeof pw !== "string" || pw.length < 10) return "Use at least 10 characters.";
  if (pw.length > 128) return "Use 128 characters or fewer.";
  if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return "Include both letters and numbers.";
  if (username && pw.toLowerCase().includes(username.toLowerCase())) return "The password must not contain the username.";
  if (COMMON.includes(pw.toLowerCase())) return "That password is too common.";
  return null;
}

export const toStaff = (s: Pick<StaffAccount, "id" | "username" | "name" | "role" | "mustChangePassword">): Staff => ({
  id: s.id, username: s.username, name: s.name, role: s.role, mustChangePassword: s.mustChangePassword,
});

let dummy: Promise<string> | undefined;
const getDummy = () => (dummy ??= argonHash(randomBytes(16).toString("hex")));

export async function createStaff(username: string, name: string, password: string, role: "owner" | "admin"): Promise<Result<{ staff: Staff }>> {
  const u = String(username ?? "").trim().toLowerCase();
  const n = String(name ?? "").trim().slice(0, 80);
  if (!n) return { ok: false, error: "Enter the staff member's name." };
  if (!USERNAME.test(u)) return { ok: false, error: "Username: 3–32 letters, numbers, dot, dash or underscore." };
  const problem = passwordProblem(password, u);
  if (problem) return { ok: false, error: problem };
  if (await db.staffAccount.findUnique({ where: { username: u } })) return { ok: false, error: "That username is already taken." };
  const s = await db.staffAccount.create({ data: { username: u, name: n, role, passwordHash: await argonHash(password), mustChangePassword: true } });
  return { ok: true, staff: toStaff(s) };
}

export async function staffLogin(username: string, password: string): Promise<Result<{ staff: Staff }>> {
  const bad = { ok: false, error: "Incorrect username or password." } as const;
  const u = String(username ?? "").trim().toLowerCase();
  if (!USERNAME.test(u) || typeof password !== "string" || password.length > 128) return bad;

  const acct = await db.staffAccount.findUnique({ where: { username: u } });
  if (acct?.lockedUntil && acct.lockedUntil > new Date()) {
    const mins = Math.ceil((acct.lockedUntil.getTime() - Date.now()) / 60_000);
    return { ok: false, error: `Too many failed attempts. Try again in ${mins} minute${mins === 1 ? "" : "s"}.` };
  }
  const good = await argonVerify(acct?.passwordHash ?? (await getDummy()), password).catch(() => false);
  if (!acct || !acct.active || !good) {
    if (acct) {
      const n = acct.failedAttempts + 1;
      const lock = n >= MAX_FAILS ? new Date(Date.now() + Math.min(15 * 60_000, 30_000 * 2 ** (n - MAX_FAILS))) : null;
      await db.staffAccount.update({ where: { id: acct.id }, data: { failedAttempts: n, lockedUntil: lock } });
    }
    return bad;
  }
  const updated = await db.staffAccount.update({ where: { id: acct.id }, data: { failedAttempts: 0, lockedUntil: null, lastLoginAt: new Date() } });
  return { ok: true, staff: toStaff(updated) };
}

export async function createStaffSession(staffId: string) {
  const token = randomBytes(32).toString("base64url");
  await db.staffSession.create({ data: { staffId, tokenHash: sha256(token), expiresAt: new Date(Date.now() + ABSOLUTE_MS) } });
  return token;
}

/** Valid only if not revoked, within the absolute lifetime, not idle too long, and the account is still active. */
export async function staffForSession(token: string | undefined): Promise<Staff | null> {
  if (!token || token.length > 100) return null;
  const s = await db.staffSession.findUnique({ where: { tokenHash: sha256(token) }, include: { staff: true } });
  if (!s || s.revokedAt || s.expiresAt < new Date() || !s.staff.active) return null;
  if (Date.now() - s.lastSeenAt.getTime() > IDLE_MS) return null;
  if (Date.now() - s.lastSeenAt.getTime() > 30_000) await db.staffSession.update({ where: { id: s.id }, data: { lastSeenAt: new Date() } });
  return toStaff(s.staff);
}

export async function endStaffSession(token: string | undefined) {
  if (!token) return;
  await db.staffSession.updateMany({ where: { tokenHash: sha256(token), revokedAt: null }, data: { revokedAt: new Date() } });
}

export async function revokeAllStaffSessions(staffId: string, exceptToken?: string) {
  await db.staffSession.updateMany({
    where: { staffId, revokedAt: null, ...(exceptToken ? { tokenHash: { not: sha256(exceptToken) } } : {}) },
    data: { revokedAt: new Date() },
  });
}

export async function changeOwnPassword(staffId: string, current: string, next: string, keepToken?: string): Promise<Result> {
  const acct = await db.staffAccount.findUnique({ where: { id: staffId } });
  if (!acct) return { ok: false, error: "Account not found." };
  if (typeof current !== "string" || !(await argonVerify(acct.passwordHash, current).catch(() => false))) return { ok: false, error: "Current password is incorrect." };
  const problem = passwordProblem(next, acct.username);
  if (problem) return { ok: false, error: problem };
  if (next === current) return { ok: false, error: "Choose a password different from the current one." };
  await db.staffAccount.update({ where: { id: staffId }, data: { passwordHash: await argonHash(next), mustChangePassword: false } });
  await revokeAllStaffSessions(staffId, keepToken);
  return { ok: true };
}

/** Owner resets another account: a one-time password, which must be changed at next sign-in. */
export async function resetStaffPassword(staffId: string, newPassword: string): Promise<Result> {
  const acct = await db.staffAccount.findUnique({ where: { id: staffId } });
  if (!acct) return { ok: false, error: "Account not found." };
  const problem = passwordProblem(newPassword, acct.username);
  if (problem) return { ok: false, error: problem };
  await db.staffAccount.update({ where: { id: staffId }, data: { passwordHash: await argonHash(newPassword), mustChangePassword: true, failedAttempts: 0, lockedUntil: null } });
  await revokeAllStaffSessions(staffId);
  return { ok: true };
}

export async function audit(staff: Pick<Staff, "id" | "username">, action: string, entity: string, entityId: string, detail?: object) {
  await db.auditLog.create({ data: { staffId: staff.id, username: staff.username, action, entity, entityId, detail: detail ?? undefined } });
}
