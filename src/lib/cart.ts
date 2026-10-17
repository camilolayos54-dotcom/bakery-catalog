import type { Product } from '@/types';

export function hasPromo(p: Product) {
  return !!p.promo_qty && p.promo_qty > 1 && p.promo_price_cents != null;
}

/** Total in cents for `qty` units, applying the promo to every complete bundle. */
export function lineTotal(p: Product, qty: number) {
  if (!hasPromo(p)) return p.price_cents * qty;
  const bundles = Math.floor(qty / p.promo_qty!);
  return bundles * p.promo_price_cents! + (qty % p.promo_qty!) * p.price_cents;
}

export function lineSavings(p: Product, qty: number) {
  return p.price_cents * qty - lineTotal(p, qty);
}

export function promoLabel(p: Product, fmt: (cents: number) => string) {
  return hasPromo(p) ? `${p.promo_qty} x ${fmt(p.promo_price_cents!)}` : '';
}
