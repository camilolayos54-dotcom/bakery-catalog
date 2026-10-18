export function formatPrice(cents: number) {
  return `$${(cents / 100).toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

/** "1.500", "$1500", "1500,50" or "1500.5" -> cents. Returns null if invalid. */
export function parsePrice(text: string): number | null {
  const t = text.trim().replace(/[\$\s]/g, '');
  if (!t) return null;
  const normalized = /,\d{1,2}$/.test(t)
    ? t.replace(/\./g, '').replace(',', '.')
    : /\.\d{1,2}$/.test(t)
      ? t.replace(/,/g, '')
      : t.replace(/[.,]/g, '');
  const n = Number(normalized);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null;
}
