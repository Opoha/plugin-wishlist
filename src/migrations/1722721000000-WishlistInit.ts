import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Initial wishlist + recently-viewed tables (ADR-0005).
 * Table prefix: plugin id `wishlist` → `plugin_wishlist_*`
 * (never touches core tables).
 */
export class WishlistInit1722721000000 implements MigrationInterface {
  name = 'WishlistInit1722721000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "plugin_wishlist_items" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "customer_id" uuid NOT NULL,
        "product_id" uuid NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "plugin_wishlist_items_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "plugin_wishlist_items_customer_product_uidx"
          UNIQUE ("customer_id", "product_id")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "plugin_wishlist_items_customer_idx"
        ON "plugin_wishlist_items" ("customer_id")
    `);

    await queryRunner.query(`
      CREATE TABLE "plugin_wishlist_recently_viewed" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "customer_id" uuid NOT NULL,
        "product_id" uuid NOT NULL,
        "viewed_at" TIMESTAMPTZ NOT NULL,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "plugin_wishlist_recently_viewed_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "plugin_wishlist_recently_viewed_customer_product_uidx"
          UNIQUE ("customer_id", "product_id")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "plugin_wishlist_recently_viewed_customer_viewed_idx"
        ON "plugin_wishlist_recently_viewed" ("customer_id", "viewed_at")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "plugin_wishlist_recently_viewed"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "plugin_wishlist_items"`);
  }
}
