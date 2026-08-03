import { randomUUID } from 'node:crypto';

import { z } from 'zod';

export const wishlistItemSchema = z.object({
  customerId: z.string().uuid(),
  productId: z.string().uuid(),
});

export type WishlistItem = z.infer<typeof wishlistItemSchema> & {
  id: string;
  createdAt: Date;
};

let items: WishlistItem[] = [];

/** Test helper — reset module state between Vitest cases. */
export function resetWishlistForTests(): void {
  items = [];
}

/** Add a product to a customer's wishlist; idempotent on customer+product. */
export function addToWishlist(
  input: z.input<typeof wishlistItemSchema>,
): WishlistItem {
  const parsed = wishlistItemSchema.parse(input);
  const existing = items.find(
    (i) =>
      i.customerId === parsed.customerId && i.productId === parsed.productId,
  );
  if (existing) {
    return existing;
  }
  const row: WishlistItem = {
    id: randomUUID(),
    ...parsed,
    createdAt: new Date(),
  };
  items = [...items, row];
  return row;
}

/** Remove a product from a customer's wishlist. Returns false if not present. */
export function removeFromWishlist(
  customerId: string,
  productId: string,
): boolean {
  const before = items.length;
  items = items.filter(
    (i) => !(i.customerId === customerId && i.productId === productId),
  );
  return items.length < before;
}

/** List a customer's saved products, most recently added first. */
export function listWishlist(customerId: string): WishlistItem[] {
  return items
    .filter((i) => i.customerId === customerId)
    .slice()
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export function isInWishlist(customerId: string, productId: string): boolean {
  return items.some(
    (i) => i.customerId === customerId && i.productId === productId,
  );
}

/** Cascade-remove wishlist entries for a deleted product (ProductDeleted). */
export function removeWishlistEntriesForProduct(productId: string): number {
  const before = items.length;
  items = items.filter((i) => i.productId !== productId);
  return before - items.length;
}

/** Extension surface registered via PluginContext.registerProvider. */
export const wishlistProvider = {
  add: addToWishlist,
  remove: removeFromWishlist,
  list: listWishlist,
  isSaved: isInWishlist,
};
