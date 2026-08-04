import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MIGRATIONS_TABLE_NAME, PLUGIN_ID, entities, migrations } from './database.js';
import wishlistPlugin, {
  addToWishlist,
  clearRecentlyViewed,
  isInWishlist,
  listRecentlyViewed,
  listWishlist,
  recordRecentlyViewed,
  removeFromWishlist,
  removeWishlistEntriesForProduct,
  resetRecentlyViewedForTests,
  resetWishlistForTests,
  wishlistItemSchema,
} from './index.js';
import { WishlistInit1722721000000 } from './migrations/1722721000000-WishlistInit.js';
import { createStubPluginContext } from '@opoha/plugin-sdk';

/** RFC-4122 variant nibble (8/9/a/b) required by Zod 4 uuid(). */
const CUSTOMER_A = '11111111-1111-4111-8111-111111111111';
const CUSTOMER_B = '22222222-2222-4222-9222-222222222222';
const PRODUCT_A = '33333333-3333-4333-a333-333333333333';
const PRODUCT_B = '44444444-4444-4444-b444-444444444444';
const PRODUCT_C = '55555555-5555-4555-8555-555555555555';

function createQueryRunnerMock() {
  const queries: string[] = [];
  return {
    queries,
    query: vi.fn(async (sql: string) => {
      queries.push(sql);
    }),
  };
}

function emptyBootCtx() {
  const providers: Array<{ token: string }> = [];
  const graphql: Array<{ name: string; kind: string }> = [];
  const admin: unknown[] = [];
  const listeners: Array<{
    eventName: string;
    handler: (event: unknown) => void | Promise<void>;
  }> = [];
  return {
    providers,
    graphql,
    admin,
    listeners,
    ctx: createStubPluginContext('wishlist', {
      registerGraphQL(input: { name: string; kind: string }) {
        graphql.push({ name: input.name, kind: input.kind });
      },
      registerProvider(input: { token: string }) {
        providers.push({ token: input.token });
      },
      registerListener(eventName: string, handler: (event: unknown) => void | Promise<void>) {
        listeners.push({ eventName, handler });
      },
      registerAdmin(contribution: unknown) {
        admin.push(contribution);
      },
      registerPaymentProvider() {},
      registerShippingMethod() {},
      registerTaxProvider() {},
      registerPromotionRuleProvider() {},
      registerNotificationProvider() {},
      registerStorageAdapter() {},
      registerSearchProvider() {},
    }),
  };
}

describe('@opoha/plugin-wishlist', () => {
  beforeEach(() => {
    resetWishlistForTests();
    resetRecentlyViewedForTests();
  });

  it('exports definePlugin definition with wishlist id', () => {
    expect(wishlistPlugin.id).toBe('wishlist');
    expect(typeof wishlistPlugin.boot).toBe('function');
  });

  it('rejects invalid wishlist payloads', () => {
    expect(() =>
      wishlistItemSchema.parse({
        customerId: 'not-a-uuid',
        productId: PRODUCT_A,
      }),
    ).toThrow();
  });

  it('adds and lists wishlist items for a customer', () => {
    const item = addToWishlist({
      customerId: CUSTOMER_A,
      productId: PRODUCT_A,
    });
    expect(item.customerId).toBe(CUSTOMER_A);
    expect(item.productId).toBe(PRODUCT_A);
    expect(isInWishlist(CUSTOMER_A, PRODUCT_A)).toBe(true);

    addToWishlist({ customerId: CUSTOMER_A, productId: PRODUCT_B });
    addToWishlist({ customerId: CUSTOMER_B, productId: PRODUCT_A });

    expect(listWishlist(CUSTOMER_A)).toHaveLength(2);
    expect(listWishlist(CUSTOMER_B)).toHaveLength(1);
  });

  it('is idempotent on re-add of the same customer+product', () => {
    const first = addToWishlist({
      customerId: CUSTOMER_A,
      productId: PRODUCT_A,
    });
    const second = addToWishlist({
      customerId: CUSTOMER_A,
      productId: PRODUCT_A,
    });
    expect(second.id).toBe(first.id);
    expect(listWishlist(CUSTOMER_A)).toHaveLength(1);
  });

  it('removes wishlist items and cascades on ProductDeleted', async () => {
    addToWishlist({ customerId: CUSTOMER_A, productId: PRODUCT_A });
    addToWishlist({ customerId: CUSTOMER_A, productId: PRODUCT_B });
    addToWishlist({ customerId: CUSTOMER_B, productId: PRODUCT_A });

    expect(removeFromWishlist(CUSTOMER_A, PRODUCT_A)).toBe(true);
    expect(isInWishlist(CUSTOMER_A, PRODUCT_A)).toBe(false);
    expect(listWishlist(CUSTOMER_A)).toHaveLength(1);

    expect(removeWishlistEntriesForProduct(PRODUCT_A)).toBe(1);
    expect(listWishlist(CUSTOMER_B)).toHaveLength(0);
    expect(listWishlist(CUSTOMER_A)).toHaveLength(1);
  });

  it('records and lists recently viewed products newest-first', () => {
    const t1 = new Date('2026-08-01T10:00:00Z');
    const t2 = new Date('2026-08-01T11:00:00Z');
    const t3 = new Date('2026-08-01T12:00:00Z');

    recordRecentlyViewed({
      customerId: CUSTOMER_A,
      productId: PRODUCT_A,
      viewedAt: t1,
    });
    recordRecentlyViewed({
      customerId: CUSTOMER_A,
      productId: PRODUCT_B,
      viewedAt: t2,
    });
    recordRecentlyViewed({
      customerId: CUSTOMER_A,
      productId: PRODUCT_C,
      viewedAt: t3,
    });
    recordRecentlyViewed({
      customerId: CUSTOMER_B,
      productId: PRODUCT_A,
      viewedAt: t3,
    });

    expect(listRecentlyViewed({ customerId: CUSTOMER_A }).map((r) => r.productId)).toEqual([
      PRODUCT_C,
      PRODUCT_B,
      PRODUCT_A,
    ]);
    expect(listRecentlyViewed({ customerId: CUSTOMER_A, limit: 2 })).toHaveLength(2);
  });

  it('bumps viewedAt on re-view and clears per customer', () => {
    const early = new Date('2026-08-01T10:00:00Z');
    const late = new Date('2026-08-01T15:00:00Z');

    recordRecentlyViewed({
      customerId: CUSTOMER_A,
      productId: PRODUCT_A,
      viewedAt: early,
    });
    recordRecentlyViewed({
      customerId: CUSTOMER_A,
      productId: PRODUCT_B,
      viewedAt: early,
    });
    const bumped = recordRecentlyViewed({
      customerId: CUSTOMER_A,
      productId: PRODUCT_A,
      viewedAt: late,
    });
    expect(bumped.viewedAt.getTime()).toBe(late.getTime());
    expect(listRecentlyViewed({ customerId: CUSTOMER_A }).map((r) => r.productId)).toEqual([
      PRODUCT_A,
      PRODUCT_B,
    ]);

    expect(clearRecentlyViewed(CUSTOMER_A)).toBe(2);
    expect(listRecentlyViewed({ customerId: CUSTOMER_A })).toHaveLength(0);
  });

  it('registers providers, GraphQL, admin, and ProductDeleted listener', async () => {
    const { ctx, providers, graphql, admin, listeners } = emptyBootCtx();
    wishlistPlugin.boot?.(ctx);

    expect(providers).toEqual(
      expect.arrayContaining([{ token: 'wishlist.items' }, { token: 'wishlist.recentlyViewed' }]),
    );
    expect(graphql.map((g) => g.name)).toEqual([
      'wishlistItems',
      'isInWishlist',
      'addToWishlist',
      'removeFromWishlist',
      'recentlyViewedProducts',
      'recordRecentlyViewed',
      'clearRecentlyViewed',
    ]);
    expect(admin).toHaveLength(1);
    expect(listeners.map((l) => l.eventName)).toEqual(['ProductDeleted']);

    addToWishlist({ customerId: CUSTOMER_A, productId: PRODUCT_A });
    const listener = listeners.find((l) => l.eventName === 'ProductDeleted');
    await listener?.handler({ data: { productId: PRODUCT_A } });
    expect(listWishlist(CUSTOMER_A)).toHaveLength(0);
  });

  it('exposes plugin-owned entities and namespaced migrations table', () => {
    expect(PLUGIN_ID).toBe('wishlist');
    expect(MIGRATIONS_TABLE_NAME).toBe('opoha_migrations_wishlist');
    expect(entities).toHaveLength(2);
    expect(migrations).toHaveLength(1);
    expect(migrations[0]).toBe(WishlistInit1722721000000);
  });

  it('migration up/down owns only plugin_wishlist_* tables (not core)', async () => {
    const migration = new WishlistInit1722721000000();
    const upRunner = createQueryRunnerMock();
    await migration.up(upRunner as never);
    const upSql = upRunner.queries.join('\n');
    expect(upSql).toContain('CREATE TABLE "plugin_wishlist_items"');
    expect(upSql).toContain('CREATE TABLE "plugin_wishlist_recently_viewed"');
    expect(upSql).not.toMatch(/"products"|"customers"/);

    const downRunner = createQueryRunnerMock();
    await migration.down(downRunner as never);
    const downSql = downRunner.queries.join('\n');
    expect(downSql).toContain('DROP TABLE IF EXISTS "plugin_wishlist_items"');
    expect(downSql).toContain('DROP TABLE IF EXISTS "plugin_wishlist_recently_viewed"');
  });
});
