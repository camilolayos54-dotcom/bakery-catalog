// Web/Windows-browser implementation: same API as repo.ts, backed by localStorage.
import type { Group, Product } from '@/types';

type Data = { groups: Group[]; products: Product[]; nextGroupId: number; nextProductId: number };
const KEY = 'bakery-catalog-v1';

function load(): Data {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as Data;
  } catch {}
  return { groups: [], products: [], nextGroupId: 1, nextProductId: 1 };
}

function save(d: Data) {
  localStorage.setItem(KEY, JSON.stringify(d));
}

export async function listGroups(): Promise<Group[]> {
  return load().groups.sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
}

export async function addGroup(name: string): Promise<number> {
  const d = load();
  const order = Math.max(0, ...d.groups.map((g) => g.sort_order)) + 1;
  const id = d.nextGroupId++;
  d.groups.push({ id, name: name.trim(), sort_order: order });
  save(d);
  return id;
}

export async function renameGroup(id: number, name: string) {
  const d = load();
  const g = d.groups.find((x) => x.id === id);
  if (g) g.name = name.trim();
  save(d);
}

export async function deleteGroup(id: number) {
  const d = load();
  d.groups = d.groups.filter((g) => g.id !== id);
  d.products.forEach((p) => {
    if (p.group_id === id) p.group_id = null;
  });
  save(d);
}

export async function listProducts(): Promise<Product[]> {
  return load()
    .products.map((p) => ({ ...p, promo_qty: p.promo_qty ?? null, promo_price_cents: p.promo_price_cents ?? null }))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
}

export async function getProduct(id: number): Promise<Product | null> {
  const p = load().products.find((x) => x.id === id);
  return p ? { ...p, promo_qty: p.promo_qty ?? null, promo_price_cents: p.promo_price_cents ?? null } : null;
}

export type ProductInput = Pick<
  Product,
  'name' | 'price_cents' | 'image_uri' | 'group_id' | 'promo_qty' | 'promo_price_cents'
>;

export async function saveProduct(input: ProductInput, id?: number) {
  const d = load();
  const clean = { ...input, name: input.name.trim() };
  const existing = id ? d.products.find((p) => p.id === id) : undefined;
  if (existing) Object.assign(existing, clean);
  else d.products.push({ id: d.nextProductId++, created_at: Date.now(), ...clean });
  save(d);
}

export async function addProductsBulk(items: { name: string; price_cents: number }[], groupId: number | null) {
  const d = load();
  for (const it of items) {
    d.products.push({
      id: d.nextProductId++,
      created_at: Date.now(),
      name: it.name.trim(),
      price_cents: it.price_cents,
      image_uri: null,
      group_id: groupId,
      promo_qty: null,
      promo_price_cents: null,
    });
  }
  save(d);
}

export async function deleteProduct(id: number) {
  const d = load();
  d.products = d.products.filter((p) => p.id !== id);
  save(d);
}
