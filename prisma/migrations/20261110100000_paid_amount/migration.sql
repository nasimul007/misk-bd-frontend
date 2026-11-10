-- How much of an order has been paid online. Cash on Delivery orders now take their delivery charge online first,
-- so "paid" is no longer all-or-nothing: the rest is collected on delivery.
ALTER TABLE "orders" ADD COLUMN "paidAmount" INTEGER NOT NULL DEFAULT 0;

-- Orders already paid online were paid in full.
UPDATE "orders" SET "paidAmount" = "total" WHERE "paymentStatus" = 'paid';

ALTER TABLE "orders" ADD CONSTRAINT "orders_paid_amount_check" CHECK ("paidAmount" >= 0 AND "paidAmount" <= "total");
