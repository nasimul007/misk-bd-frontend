import "server-only";
import { timingSafeEqual } from "node:crypto";

/** True when the request carries the scheduler's secret (`Authorization: Bearer $CRON_SECRET`). A short or missing secret never matches. */
export function cronAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET ?? "";
  const given = (request.headers.get("authorization") ?? "").replace(/^Bearer /, "");
  const a = Buffer.from(secret);
  const b = Buffer.from(given);
  return secret.length >= 16 && a.length === b.length && timingSafeEqual(a, b);
}
