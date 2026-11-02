-- Stock moves from the product to each of its options ("50g", "Pack of 10"). A product's stock is now the
-- sum of its options.

ALTER TABLE "product_variants" ADD COLUMN "stock" INTEGER NOT NULL DEFAULT 0;

-- Copy first, drop after: every existing option starts with the stock its product had, so nothing
-- suddenly looks sold out.
UPDATE "product_variants" v SET "stock" = p."stock" FROM "products" p WHERE p."id" = v."productId";

ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_stock_nonneg" CHECK ("stock" >= 0);

-- The stock log says which option each change was for. Older entries have none.
ALTER TABLE "inventory_adjustments" ADD COLUMN "option" VARCHAR(40) NOT NULL DEFAULT '';

-- Also drops the products_stock_nonneg check.
ALTER TABLE "products" DROP COLUMN "stock";
