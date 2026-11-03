-- Real, verified-buyer reviews. The ratings the products carried until now were demo numbers, so they start
-- again from zero and are computed from actual reviews from here on.
CREATE TABLE "reviews" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "productId" UUID NOT NULL,
    "orderId" UUID,
    "author" VARCHAR(60) NOT NULL,
    "rating" SMALLINT NOT NULL,
    "comment" VARCHAR(600) NOT NULL DEFAULT '',
    "status" VARCHAR(10) NOT NULL DEFAULT 'visible',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "reviews_rating_check" CHECK ("rating" BETWEEN 1 AND 5),
    CONSTRAINT "reviews_status_check" CHECK ("status" IN ('visible', 'hidden'))
);
CREATE UNIQUE INDEX "reviews_orderId_productId_key" ON "reviews"("orderId", "productId");
CREATE INDEX "reviews_productId_status_createdAt_idx" ON "reviews"("productId", "status", "createdAt");
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

UPDATE "products" SET "ratingAvg" = 0, "reviewCount" = 0;
