export function formatPrice(cents: number) {
  return `$${(cents / 100).toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

/** Largest price accepted ($100.000.000), far below what a JS number can hold exactly. */
export const MAX_PRICE_CENTS = 100_000_000 * 100;

/** "1.500", "$1500", "1500,50" or "1500.5" -> cents. Returns null if invalid or out of range. */
export function parsePrice(text: string): number | null {
  const t = text.trim().replace(/[\$\s]/g, '');
  if (!t || !/^[\d.,]+$/.test(t)) return null;
  const normalized = /,\d{1,2}$/.test(t)
    ? t.replace(/\./g, '').replace(',', '.')
    : /\.\d{1,2}$/.test(t)
      ? t.replace(/,/g, '')
      : t.replace(/[.,]/g, '');
  const n = Number(normalized);
  if (!Number.isFinite(n) || n < 0) return null;
  const cents = Math.round(n * 100);
  return cents > MAX_PRICE_CENTS ? null : cents;
}

/** A sellable price: positive and within range. */
export function isSellablePrice(cents: number | null): cents is number {
  return cents !== null && cents > 0 && cents <= MAX_PRICE_CENTS;
}
