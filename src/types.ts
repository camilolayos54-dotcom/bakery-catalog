export type Group = { id: number; name: string; sort_order: number };

export type Product = {
  id: number;
  name: string;
  price_cents: number;
  image_uri: string | null;
  group_id: number | null;
  created_at: number;
  /** Promotion: buying `promo_qty` units costs `promo_price_cents` in total. */
  promo_qty: number | null;
  promo_price_cents: number | null;
};
