import 'reflect-metadata';

/**
 * Plugin-owned TypeORM surface for CLI / host migration aggregation (ADR-0005).
 * Core never imports this package statically — hosts load via dynamic import.
 */

import { RecentlyViewedEntity, WishlistItemEntity, wishlistEntities } from './entities/index.js';
import { WishlistInit1722721000000 } from './migrations/1722721000000-WishlistInit.js';
import { wishlistMigrations } from './migrations/index.js';

export const PLUGIN_ID = 'wishlist' as const;

/** Namespaced migrations table — never shares core `migrations`. */
export const MIGRATIONS_TABLE_NAME = 'opoha_migrations_wishlist' as const;

export const entities = wishlistEntities;
export const migrations = wishlistMigrations;

export {
  RecentlyViewedEntity,
  WishlistInit1722721000000,
  WishlistItemEntity,
  wishlistEntities,
  wishlistMigrations,
};
