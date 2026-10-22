export type Group = { id: number; name: string; sort_order: number };

export type Subcategory = { id: number; group_id: number; name: string; sort_order: number };

export type Product = {
  id: number;
  name: string;
  price_cents: number;
  image_uri: string | null;
  group_id: number | null;
  subcategory_id: number | null;
  created_at: number;
  /** Position in the catalog (lower first). Users can reorder products by hand. */
  sort_order: number;
  /** Promotion: buying `promo_qty` units costs `promo_price_cents` in total. */
  promo_qty: number | null;
  promo_price_cents: number | null;
};

export type ExportedProduct = Product & {
  image_base64?: string | null;
};

export type BackupPayload = {
  version: number;
  exported_at: number;
  exported_at_readable: string;
  groups: Group[];
  subcategories: Subcategory[];
  products: ExportedProduct[];
  frequencies: Record<number, number>;
};

