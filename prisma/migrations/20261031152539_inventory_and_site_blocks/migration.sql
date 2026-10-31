-- CreateTable
CREATE TABLE "inventory_adjustments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "productId" UUID NOT NULL,
    "delta" INTEGER NOT NULL,
    "stockAfter" INTEGER NOT NULL,
    "reason" VARCHAR(120) NOT NULL,
    "orderNumber" INTEGER,
    "staffId" UUID,
    "username" VARCHAR(32) NOT NULL,
    "at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_adjustments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_blocks" (
    "key" VARCHAR(40) NOT NULL,
    "data" JSONB NOT NULL,
    "updatedBy" VARCHAR(32),
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "site_blocks_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "inventory_adjustments_productId_at_idx" ON "inventory_adjustments"("productId", "at");

-- CreateIndex
CREATE INDEX "inventory_adjustments_at_idx" ON "inventory_adjustments"("at");

-- AddForeignKey
ALTER TABLE "inventory_adjustments" ADD CONSTRAINT "inventory_adjustments_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
