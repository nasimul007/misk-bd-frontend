-- AlterTable
ALTER TABLE "order_items" ALTER COLUMN "size" SET DATA TYPE VARCHAR(40);

-- AlterTable
ALTER TABLE "product_variants" ADD COLUMN     "position" SMALLINT NOT NULL DEFAULT 0,
ALTER COLUMN "size" SET DATA TYPE VARCHAR(40);

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "unit" VARCHAR(12) NOT NULL DEFAULT 'ml';

-- Existing options keep the order shoppers see today: cheapest first.
UPDATE "product_variants" v SET "position" = r.rn - 1
FROM (SELECT id, row_number() OVER (PARTITION BY "productId" ORDER BY "priceBdt") AS rn FROM "product_variants") r
WHERE r.id = v.id;
