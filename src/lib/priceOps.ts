export type PriceOp = 'add' | 'sub' | 'mul' | 'div';

/** New price in cents after applying op. `percent` makes add/sub relative to the current price. */
export function applyOp(cents: number, op: PriceOp, value: number, percent: boolean): number {
  let next = cents;
  if (op === 'add') next = percent ? cents * (1 + value / 100) : cents + value * 100;
  else if (op === 'sub') next = percent ? cents * (1 - value / 100) : cents - value * 100;
  else if (op === 'mul') next = cents * value;
  else if (op === 'div') next = cents / value;
  return Math.max(0, Math.round(next));
}
