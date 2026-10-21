import { lineSavings, lineTotal } from '@/lib/cart';
import { parsePrice } from '@/lib/money';
import type { Product } from '@/types';

const PESO = 100; // cents

export type BillInput = {
  lines: { product: Product; qty: number }[];
  discountText: string;
  discountIsPercent: boolean;
  extraText: string;
  peopleText: string;
  receivedText: string;
};

export type Bill = {
  units: number;
  subtotal: number;
  promoSaved: number;
  discountCents: number;
  extraCents: number;
  total: number;
  /** Rounded up to a whole peso so the group always covers the total. */
  perPerson: number | null;
  /** Positive = change to give back, negative = still missing. */
  change: number | null;
};

/** Everything the "Sumas" tab shows, in cents and always in whole pesos. */
export function computeBill(i: BillInput): Bill {
  const units = i.lines.reduce((s, l) => s + l.qty, 0);
  const subtotal = i.lines.reduce((s, l) => s + lineTotal(l.product, l.qty), 0);
  const promoSaved = i.lines.reduce((s, l) => s + lineSavings(l.product, l.qty), 0);

  let discountCents = 0;
  const raw = i.discountText.trim();
  if (raw) {
    if (i.discountIsPercent) {
      const pct = Number(raw.replace(',', '.'));
      if (Number.isFinite(pct) && pct > 0) {
        discountCents = Math.round((subtotal * Math.min(pct, 100)) / 100 / PESO) * PESO;
      }
    } else {
      discountCents = Math.min(subtotal, parsePrice(raw) ?? 0);
    }
  }

  const extraCents = parsePrice(i.extraText) ?? 0;
  const total = Math.max(0, subtotal - discountCents + extraCents);

  const people = Math.floor(Number(i.peopleText));
  const perPerson = Number.isFinite(people) && people >= 2 ? Math.ceil(total / people / PESO) * PESO : null;

  const received = parsePrice(i.receivedText);
  const change = received != null ? received - total : null;

  return { units, subtotal, promoSaved, discountCents, extraCents, total, perPerson, change };
}
