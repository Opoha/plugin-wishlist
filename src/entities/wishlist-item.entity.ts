import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

/**
 * OWNER: @opoha/plugin-wishlist — saved product row (ADR-0005).
 * Table prefix: plugin id `wishlist` → `plugin_wishlist_*`.
 * customerId / productId are opaque UUIDs — no FK into core tables.
 */
@Entity({ name: 'plugin_wishlist_items' })
@Unique('plugin_wishlist_items_customer_product_uidx', [
  'customerId',
  'productId',
])
@Index('plugin_wishlist_items_customer_idx', ['customerId'])
export class WishlistItemEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Opaque reference to a core customer. */
  @Column({ name: 'customer_id', type: 'uuid' })
  customerId!: string;

  /** Opaque reference to a core catalog product. */
  @Column({ name: 'product_id', type: 'uuid' })
  productId!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
