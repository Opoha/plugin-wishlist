import { randomUUID } from 'node:crypto';

import { z } from 'zod';

/** Default cap for recently-viewed lists (storefront shelf). */
export const DEFAULT_RECENTLY_VIEWED_LIMIT = 20;

export const recordRecentlyViewedSchema = z.object({
  customerId: z.string().uuid(),
  productId: z.string().uuid(),
  viewedAt: z.coerce.date().optional(),
});

export const listRecentlyViewedSchema = z.object({
  customerId: z.string().uuid(),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .default(DEFAULT_RECENTLY_VIEWED_LIMIT),
});

export type RecentlyViewed = {
  id: string;
  customerId: string;
  productId: string;
  viewedAt: Date;
  updatedAt: Date;
};

let rows: RecentlyViewed[] = [];

/** Reset in-memory stores for Vitest. */
export function resetRecentlyViewedForTests(): void {
  rows = [];
}

/**
 * Record a product view for a customer.
 * Re-viewing the same product bumps `viewedAt` (upsert on customer+product).
 */
export function recordRecentlyViewed(
  input: z.input<typeof recordRecentlyViewedSchema>,
): RecentlyViewed {
  const parsed = recordRecentlyViewedSchema.parse(input);
  const viewedAt = parsed.viewedAt ?? new Date();
  const existing = rows.find(
    (row) =>
      row.customerId === parsed.customerId &&
      row.productId === parsed.productId,
  );
  if (existing != null) {
    const updated: RecentlyViewed = {
      ...existing,
      viewedAt,
      updatedAt: viewedAt,
    };
    rows = rows.map((row) => (row.id === existing.id ? updated : row));
    return updated;
  }
  const row: RecentlyViewed = {
    id: randomUUID(),
    customerId: parsed.customerId,
    productId: parsed.productId,
    viewedAt,
    updatedAt: viewedAt,
  };
  rows = [...rows, row];
  return row;
}

export function listRecentlyViewed(
  input: z.input<typeof listRecentlyViewedSchema>,
): RecentlyViewed[] {
  const parsed = listRecentlyViewedSchema.parse(input);
  return rows
    .filter((row) => row.customerId === parsed.customerId)
    .sort((a, b) => b.viewedAt.getTime() - a.viewedAt.getTime())
    .slice(0, parsed.limit);
}

export function clearRecentlyViewed(customerId: string): number {
  const before = rows.length;
  rows = rows.filter((row) => row.customerId !== customerId);
  return before - rows.length;
}

/** Provider token surface for host DI / GraphQL wiring. */
export const recentlyViewedProvider = {
  record: recordRecentlyViewed,
  list: listRecentlyViewed,
  clear: clearRecentlyViewed,
};
