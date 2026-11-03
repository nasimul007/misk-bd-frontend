import "server-only";
import { headers } from "next/headers";
import { db } from "@/lib/db";

const IP_SHAPE = /^[0-9a-fA-F:.]{3,45}$/;

/**
 * The visitor's network address, read from the header the hosting platform sets itself. Platforms overwrite
 * these headers, so a visitor cannot choose their own value: Vercel (x-vercel-forwarded-for), Cloudflare
 * (cf-connecting-ip) and most reverse proxies (x-real-ip). On a host that does none of this, set
 * CLIENT_IP_HEADER to the header your proxy controls. Returns "unknown" when nothing usable is there, in which
 * case address-based limits are skipped (the per-phone and per-order limits still apply).
 */
export async function callerIp(): Promise<string> {
  const h = await headers();
  const forced = process.env.CLIENT_IP_HEADER?.trim().toLowerCase();
  for (const name of forced ? [forced] : ["x-vercel-forwarded-for", "cf-connecting-ip", "x-real-ip", "x-forwarded-for"]) {
    const v = (h.get(name) ?? "").split(",")[0].trim();
    if (IP_SHAPE.test(v)) return v;
  }
  return "unknown";
}

/**
 * Counts one use of `key` and says whether it is still within `max` per `windowMs`. The check and the count are
 * done under a per-key lock, so a burst of parallel requests cannot all slip in before the first is counted.
 * Uses the same table as the login lockouts; the daily cleanup removes old rows.
 */
export async function allow(key: string, max: number, windowMs: number): Promise<boolean> {
  const since = new Date(Date.now() - windowMs);
  return db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${key}))`;
    const used = await tx.loginAttempt.count({ where: { identifier: key, at: { gt: since } } });
    if (used >= max) return false;
    await tx.loginAttempt.create({ data: { identifier: key, success: true } });
    return true;
  });
}

export const MINUTE = 60_000;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;

/** Same wording everywhere, so it never hints at which limit was hit. */
export const SLOW_DOWN = "Too many requests from here. Please wait a few minutes and try again.";

/** True when this visitor may proceed. Address limits are skipped when the address can't be known. */
export async function allowIp(scope: string, max: number, windowMs: number): Promise<boolean> {
  const ip = await callerIp();
  return ip === "unknown" ? true : allow(`limit:${scope}:ip:${ip}`, max, windowMs);
}
