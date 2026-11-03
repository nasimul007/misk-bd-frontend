import "server-only";
import { db } from "@/lib/db";

const DAY = 86_400_000;
const ago = (days: number) => new Date(Date.now() - days * DAY);

/**
 * Removes rows that have done their job: old rate-limit and failed-login records, expired login codes, used or
 * expired reset links, and sessions that ended a while ago. Nothing a customer or staff member still needs is
 * touched (orders, reviews, the audit log and stock history are kept). Safe to run as often as you like.
 */
export async function cleanupOldRows() {
  const [attempts, codes, resets, customerSessions, staffSessions] = await Promise.all([
    // The longest limit window is a day, so two days back is more than enough.
    db.loginAttempt.deleteMany({ where: { at: { lt: ago(2) } } }),
    db.otpCode.deleteMany({ where: { OR: [{ expiresAt: { lt: ago(1) } }, { consumedAt: { lt: ago(1) } }] } }),
    db.passwordResetToken.deleteMany({ where: { OR: [{ expiresAt: { lt: ago(1) } }, { usedAt: { lt: ago(7) } }] } }),
    db.authSession.deleteMany({ where: { OR: [{ expiresAt: { lt: ago(30) } }, { revokedAt: { lt: ago(30) } }] } }),
    db.staffSession.deleteMany({ where: { OR: [{ expiresAt: { lt: ago(30) } }, { revokedAt: { lt: ago(30) } }] } }),
  ]);
  return { attempts: attempts.count, loginCodes: codes.count, resetTokens: resets.count, customerSessions: customerSessions.count, staffSessions: staffSessions.count };
}
