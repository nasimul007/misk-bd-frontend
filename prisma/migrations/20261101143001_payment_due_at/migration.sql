-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "paymentDueAt" TIMESTAMPTZ;

-- The expiry sweep only looks at online orders still waiting for money.
CREATE INDEX "orders_payment_due_idx" ON "orders" ("paymentDueAt") WHERE "paymentDueAt" IS NOT NULL;
