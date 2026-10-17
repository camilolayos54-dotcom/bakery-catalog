// Web/Windows-browser implementation: same API as repo.ts, backed by localStorage.
import { applyOp, type PriceOp } from '@/lib/priceOps';
import type { Group, Product } from '@/types';

export { applyOp, type PriceOp };

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

export async function addGroup(name: string) {
  const d = load();
  const order = Math.max(0, ...d.groups.map((g) => g.sort_order)) + 1;
  d.groups.push({ id: d.nextGroupId++, name: name.trim(), sort_order: order });
  save(d);
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
  return load().products.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
}

export async function getProduct(id: number): Promise<Product | null> {
  return load().products.find((p) => p.id === id) ?? null;
}

export type ProductInput = Pick<Product, 'name' | 'price_cents' | 'image_uri' | 'group_id'>;

export async function saveProduct(input: ProductInput, id?: number) {
  const d = load();
  const clean = { ...input, name: input.name.trim() };
  const existing = id ? d.products.find((p) => p.id === id) : undefined;
  if (existing) Object.assign(existing, clean);
  else d.products.push({ id: d.nextProductId++, created_at: Date.now(), ...clean });
  save(d);
}

export async function deleteProduct(id: number) {
  const d = load();
  d.products = d.products.filter((p) => p.id !== id);
  save(d);
}

export async function applyPriceOp(ids: number[], op: PriceOp, value: number, percent: boolean) {
  const d = load();
  d.products.forEach((p) => {
    if (ids.includes(p.id)) p.price_cents = applyOp(p.price_cents, op, value, percent);
  });
  save(d);
}

export async function deleteProducts(ids: number[]) {
  const d = load();
  d.products = d.products.filter((p) => !ids.includes(p.id));
  save(d);
}
