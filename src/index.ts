import { definePlugin } from '@opoha/plugin-sdk';

import {
  clearRecentlyViewed,
  listRecentlyViewed,
  recentlyViewedProvider,
  recordRecentlyViewed,
  type RecentlyViewed,
} from './recently-viewed.js';
import {
  addToWishlist,
  isInWishlist,
  listWishlist,
  removeFromWishlist,
  removeWishlistEntriesForProduct,
  wishlistProvider,
  type WishlistItem,
} from './wishlist.js';

export {
  DEFAULT_RECENTLY_VIEWED_LIMIT,
  clearRecentlyViewed,
  listRecentlyViewed,
  listRecentlyViewedSchema,
  recentlyViewedProvider,
  recordRecentlyViewed,
  recordRecentlyViewedSchema,
  resetRecentlyViewedForTests,
  type RecentlyViewed,
} from './recently-viewed.js';

export {
  addToWishlist,
  isInWishlist,
  listWishlist,
  removeFromWishlist,
  removeWishlistEntriesForProduct,
  resetWishlistForTests,
  wishlistItemSchema,
  wishlistProvider,
  type WishlistItem,
} from './wishlist.js';

/**
 * Official wishlist plugin (Phase 4 D-02 / D-03).
 * Owns wishlist + recently-viewed tables — never edits core schema.
 */
export default definePlugin({
  id: 'wishlist',
  boot(ctx) {
    ctx.registerProvider({
      token: 'wishlist.items',
      provider: wishlistProvider,
    });
    ctx.registerProvider({
      token: 'wishlist.recentlyViewed',
      provider: recentlyViewedProvider,
    });

    ctx.registerGraphQL({
      name: 'wishlistItems',
      kind: 'query',
      descriptor: {
        resolve: (_parent: unknown, args: { customerId: string }): WishlistItem[] =>
          listWishlist(args.customerId),
      },
    });
    ctx.registerGraphQL({
      name: 'isInWishlist',
      kind: 'query',
      descriptor: {
        resolve: (_parent: unknown, args: { customerId: string; productId: string }): boolean =>
          isInWishlist(args.customerId, args.productId),
      },
    });
    ctx.registerGraphQL({
      name: 'addToWishlist',
      kind: 'mutation',
      descriptor: {
        resolve: (
          _parent: unknown,
          args: { input: Parameters<typeof addToWishlist>[0] },
        ): WishlistItem => addToWishlist(args.input),
      },
    });
    ctx.registerGraphQL({
      name: 'removeFromWishlist',
      kind: 'mutation',
      descriptor: {
        resolve: (_parent: unknown, args: { customerId: string; productId: string }): boolean =>
          removeFromWishlist(args.customerId, args.productId),
      },
    });

    ctx.registerGraphQL({
      name: 'recentlyViewedProducts',
      kind: 'query',
      descriptor: {
        resolve: (
          _parent: unknown,
          args: { customerId: string; limit?: number },
        ): RecentlyViewed[] =>
          listRecentlyViewed({
            customerId: args.customerId,
            limit: args.limit,
          }),
      },
    });
    ctx.registerGraphQL({
      name: 'recordRecentlyViewed',
      kind: 'mutation',
      descriptor: {
        resolve: (
          _parent: unknown,
          args: { input: Parameters<typeof recordRecentlyViewed>[0] },
        ): RecentlyViewed => recordRecentlyViewed(args.input),
      },
    });
    ctx.registerGraphQL({
      name: 'clearRecentlyViewed',
      kind: 'mutation',
      descriptor: {
        resolve: (_parent: unknown, args: { customerId: string }): number =>
          clearRecentlyViewed(args.customerId),
      },
    });

    ctx.registerListener('ProductDeleted', async (event) => {
      const productId = (event as { data?: { productId?: string } })?.data?.productId;
      if (typeof productId === 'string' && productId.length > 0) {
        removeWishlistEntriesForProduct(productId);
      }
    });

    ctx.registerAdmin({
      navigation: [
        {
          id: 'wishlist-nav',
          label: 'Wishlists',
          path: '/plugins/wishlist',
          order: 46,
          permission: 'plugin:wishlist:read',
        },
      ],
      pages: [
        {
          id: 'wishlist-ops',
          path: '/plugins/wishlist',
          title: 'Wishlist Ops',
          permission: 'plugin:wishlist:read',
        },
      ],
      settings: [
        {
          id: 'wishlist-settings',
          title: 'Wishlist',
          path: '/plugins/wishlist/settings',
          permission: 'plugin:wishlist:configure',
        },
      ],
      permissions: ['plugin:wishlist:read', 'plugin:wishlist:configure'],
    });
  },
});
