export type Group = { id: number; name: string; sort_order: number };

export type Product = {
  id: number;
  name: string;
  price_cents: number;
  image_uri: string | null;
  group_id: number | null;
  created_at: number;
};
