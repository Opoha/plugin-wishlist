import { Column, Entity, Index, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from 'typeorm';

/**
 * OWNER: @opoha/plugin-wishlist — recently viewed product (ADR-0005 / D-03).
 * Table prefix: plugin id `wishlist` → `plugin_wishlist_*`.
 * customerId / productId are opaque UUIDs — no FK into core tables.
 */
@Entity({ name: 'plugin_wishlist_recently_viewed' })
@Unique('plugin_wishlist_recently_viewed_customer_product_uidx', ['customerId', 'productId'])
@Index('plugin_wishlist_recently_viewed_customer_viewed_idx', ['customerId', 'viewedAt'])
export class RecentlyViewedEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Opaque reference to a customer (no cross-owner FK). */
  @Column({ name: 'customer_id', type: 'uuid' })
  customerId!: string;

  /** Opaque reference to a core catalog product (no cross-owner FK). */
  @Column({ name: 'product_id', type: 'uuid' })
  productId!: string;

  @Column({ name: 'viewed_at', type: 'timestamptz' })
  viewedAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
