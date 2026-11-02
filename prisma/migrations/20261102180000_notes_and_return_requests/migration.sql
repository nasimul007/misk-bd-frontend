-- Delivery notes at checkout, and customer return requests.
ALTER TABLE "orders" ADD COLUMN "deliveryNote" VARCHAR(300);
ALTER TABLE "orders" ADD COLUMN "contactless" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "return_requests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "orderId" UUID NOT NULL,
    "reason" VARCHAR(300) NOT NULL,
    "status" VARCHAR(10) NOT NULL DEFAULT 'open',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMPTZ,
    CONSTRAINT "return_requests_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "return_requests_status_check" CHECK ("status" IN ('open', 'closed'))
);
CREATE INDEX "return_requests_status_createdAt_idx" ON "return_requests"("status", "createdAt");
CREATE INDEX "return_requests_orderId_idx" ON "return_requests"("orderId");
ALTER TABLE "return_requests" ADD CONSTRAINT "return_requests_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
