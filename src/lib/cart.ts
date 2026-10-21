import type { Product } from '@/types';

export function hasPromo(p: Product) {
  return !!p.promo_qty && p.promo_qty > 1 && p.promo_price_cents != null;
}

/** Total in cents for `qty` units, applying the promo to every complete bundle. */
export function lineTotal(p: Product, qty: number) {
  if (!hasPromo(p)) return p.price_cents * qty;
  const size = p.promo_qty!;
  // A "promotion" dearer than the normal price never overcharges the customer.
  const bundlePrice = Math.min(p.promo_price_cents!, p.price_cents * size);
  return Math.floor(qty / size) * bundlePrice + (qty % size) * p.price_cents;
}

export function lineSavings(p: Product, qty: number) {
  return p.price_cents * qty - lineTotal(p, qty);
}

export function promoLabel(p: Product, fmt: (cents: number) => string) {
  return hasPromo(p) ? `${p.promo_qty} x ${fmt(p.promo_price_cents!)}` : '';
}
