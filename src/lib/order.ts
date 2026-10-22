// Custom product order. Every product has a numeric `sort_order`; reordering a (filtered) list
// only reassigns the numbers those products already own, so products outside the list keep their place.

export type Ordered = { id: number; sort_order: number };

/** Moves `id` so it ends up at index `to` of `ids` (clamped). Returns a new array. */
export function moveToIndex(ids: number[], id: number, to: number): number[] {
  const from = ids.indexOf(id);
  if (from < 0) return ids.slice();
  const out = ids.slice();
  out.splice(from, 1);
  out.splice(Math.max(0, Math.min(out.length, to)), 0, id);
  return out;
}

/** One step earlier (-1) or later (+1) in the list. */
export function moveBy(ids: number[], id: number, delta: -1 | 1): number[] {
  const from = ids.indexOf(id);
  return from < 0 ? ids.slice() : moveToIndex(ids, id, from + delta);
}

/**
 * Given the desired order of some products and the numbers they currently hold, returns the number each
 * one gets: the same set of numbers, handed out in the new order (made strictly increasing).
 */
export function assignOrder(desired: number[], current: Ordered[]): Map<number, number> {
  const have = new Map(current.map((c) => [c.id, c.sort_order]));
  const ids = desired.filter((id) => have.has(id));
  const values = ids.map((id) => have.get(id)!).sort((a, b) => a - b);
  for (let i = 1; i < values.length; i++) if (values[i] <= values[i - 1]) values[i] = values[i - 1] + 1;
  return new Map(ids.map((id, i) => [id, values[i]]));
}

/** Alphabetical order, used to initialise `sort_order` for existing catalogs. */
export function alphabeticalOrder<T extends { id: number; name: string }>(items: T[]): Map<number, number> {
  const sorted = items
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }) || a.id - b.id);
  return new Map(sorted.map((p, i) => [p.id, i + 1]));
}

/** Sorts by custom order, then name, then id. */
export function byCustomOrder<T extends { id: number; name: string; sort_order: number }>(a: T, b: T): number {
  return (
    a.sort_order - b.sort_order ||
    a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }) ||
    a.id - b.id
  );
}
