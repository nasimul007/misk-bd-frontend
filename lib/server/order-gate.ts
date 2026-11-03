import "server-only";
import { db } from "@/lib/db";
import { allow, DAY, HOUR, SLOW_DOWN } from "@/lib/server/limits";

/**
 * Abuse limits for placing an order, checked before anything is written. A bot placing orders would otherwise hold
 * stock (online orders reserve it while they wait for payment) and fill the admin with fake orders. The numbers
 * are generous for a real shopper, and for the many people who share one mobile-network address.
 * Returns what to tell the shopper, or null when the order may go ahead.
 */
export async function orderGate(phone: string, pay: string, ip: string): Promise<string | null> {
  const fromKnownAddress = ip === "unknown" || (await allow(`limit:order:ip:${ip}`, 20, HOUR));
  if (!fromKnownAddress || !(await allow(`limit:order:phone:${phone}`, 6, HOUR)) || !(await allow(`limit:order:phone-day:${phone}`, 15, DAY))) return SLOW_DOWN;

  if (pay === "sslcommerz") {
    const waiting = await db.order.count({ where: { contactPhone: phone, paymentMethod: "sslcommerz", status: "pending", paymentStatus: { in: ["pending", "failed"] }, paymentDueAt: { gt: new Date() } } });
    if (waiting >= 2) return "You already have orders waiting for payment. Please pay for them (see Track My Order) or let them expire before placing another.";
  }
  return null;
}
