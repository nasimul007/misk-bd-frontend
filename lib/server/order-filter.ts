import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { STATUSES, type Status } from "@/lib/order-flow";
import { parseOrderNo } from "@/lib/server/orders";

export type OrderFilter = { status: Status | undefined; q: string; returns: boolean };

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

/** The admin orders filters, read from a page's search params (or an export link), validated once. */
export function parseOrderFilter(sp: Record<string, string | string[] | undefined>): OrderFilter {
  return {
    status: STATUSES.find((s) => s === one(sp.status)),
    q: one(sp.q).trim().slice(0, 40),
    returns: one(sp.returns) === "1", // only orders with an open return request
  };
}

export function orderWhere(f: OrderFilter): Prisma.OrderWhereInput {
  const number = parseOrderNo(f.q.toUpperCase());
  const digits = f.q.replace(/\D/g, "");
  return {
    ...(f.status ? { status: f.status } : {}),
    ...(f.returns ? { returnRequests: { some: { status: "open" } } } : {}),
    ...(f.q
      ? { OR: [...(number ? [{ number }] : []), ...(digits.length >= 4 ? [{ contactPhone: { contains: digits } }] : []), { contactName: { contains: f.q, mode: "insensitive" as const } }] }
      : {}),
  };
}
