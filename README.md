# Wishlist Plugin

Official `@opoha/plugin-wishlist` — customer wishlists and recently viewed products (Phase 4 D-02 / D-03).

## What it owns

Plugin-owned TypeORM tables (ADR-0005 / ADR-0010) — **never** core tables:

| Table                             | Purpose                                     |
| --------------------------------- | ------------------------------------------- |
| `plugin_wishlist_items`           | Customer wishlist rows (customer + product) |
| `plugin_wishlist_recently_viewed` | Customer-scoped recently viewed products    |

## GraphQL contributions

| Name                     | Kind     | Notes                                       |
| ------------------------ | -------- | ------------------------------------------- |
| `wishlistItems`          | query    | List by `customerId`                        |
| `isInWishlist`           | query    | Membership check                            |
| `addToWishlist`          | mutation | Idempotent on customer+product              |
| `removeFromWishlist`     | mutation | By customer+product                         |
| `recentlyViewedProducts` | query    | Newest-first; optional `limit` (default 20) |
| `recordRecentlyViewed`   | mutation | Upserts / bumps `viewedAt`                  |
| `clearRecentlyViewed`    | mutation | Clears one customer’s history               |

## Events

Listens for core `ProductDeleted` and cascades wishlist cleanup for that product id (no core→plugin imports).

## Permissions

- `plugin:wishlist:read`
- `plugin:wishlist:configure`

## Load

```bash
pnpm install && pnpm build
export OPOHA_PLUGINS="$(pwd)"
```

Core discovers via `OPOHA_PLUGINS` / `OPOHA_PLUGINS_PATH` and dynamically imports `dist/index.js` — core never statically imports this package.
