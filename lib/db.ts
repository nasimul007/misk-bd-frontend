import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

// One client per server process; in dev, hot reloads would otherwise open a new pool each time.
const globalForDb = globalThis as unknown as { prisma?: PrismaClient };

export const db =
  globalForDb.prisma ??
  new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

if (process.env.NODE_ENV !== "production") globalForDb.prisma = db;
