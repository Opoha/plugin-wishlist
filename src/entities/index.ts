import { RecentlyViewedEntity } from './recently-viewed.entity.js';
import { WishlistItemEntity } from './wishlist-item.entity.js';

/** TypeORM entities owned by this plugin (ADR-0005). */
export const wishlistEntities = [WishlistItemEntity, RecentlyViewedEntity] as const;

export { RecentlyViewedEntity, WishlistItemEntity };
