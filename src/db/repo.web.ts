// Web/Windows-browser implementation: same API as repo.ts, backed by localStorage.
import { DUPLICATE_NAME, normalizeName } from '@/lib/names';
import { alphabeticalOrder, assignOrder, byCustomOrder } from '@/lib/order';
import type { BackupPayload, Group, Product, Subcategory } from '@/types';
import { INITIAL_CATALOG } from './initialData';
import { seedImageUri } from './seedImages';

type Data = {
  groups: Group[];
  subcategories: Subcategory[];
  products: Product[];
  nextGroupId: number;
  nextSubcategoryId: number;
  nextProductId: number;
  frequencies?: Record<number, number>;
};
const KEY = 'bakery-catalog-v5';

function createInitialData(): Data {
  let gId = 1;
  let sId = 1;
  let pId = 1;
  const groups: Group[] = [];
  const subcategories: Subcategory[] = [];
  const products: Product[] = [];

  for (const cat of INITIAL_CATALOG) {
    const groupId = gId++;
    groups.push({
      id: groupId,
      name: cat.name,
      sort_order: cat.sort_order,
    });

    const subcategoryMap = new Map<string, number>();
    for (let i = 0; i < cat.subcategories.length; i++) {
      const subId = sId++;
      const sName = cat.subcategories[i];
      subcategories.push({
        id: subId,
        group_id: groupId,
        name: sName,
        sort_order: i + 1,
      });
      subcategoryMap.set(sName, subId);
    }

    for (const prod of cat.products) {
      const subId = prod.subcategory ? subcategoryMap.get(prod.subcategory) ?? null : null;
      products.push({
        id: pId++,
        name: prod.name,
        price_cents: prod.price_cents,
        image_uri: seedImageUri(prod.image),
        group_id: groupId,
        subcategory_id: subId,
        created_at: prod.created_at ?? Date.now(),
        sort_order: prod.sort_order ?? 0,
        promo_qty: prod.promo_qty ?? null,
        promo_price_cents: prod.promo_price_cents ?? null,
      });
    }
  }

  // Catalog without its own order: alphabetical (the order users already see).
  if (products.some((p) => !p.sort_order)) {
    const initialOrder = alphabeticalOrder(products);
    products.forEach((p) => (p.sort_order = initialOrder.get(p.id) ?? 0));
  }

  return {
    groups,
    subcategories,
    products,
    nextGroupId: gId,
    nextSubcategoryId: sId,
    nextProductId: pId,
    frequencies: {},
  };
}

function load(): Data {
  const raw = localStorage.getItem(KEY);
  let parsed: Data | null = null;
  if (raw) {
    try {
      parsed = JSON.parse(raw) as Data;
    } catch {
      // Damaged content: keep a copy instead of silently replacing the user's catalog.
      try {
        localStorage.setItem(`${KEY}-damaged`, raw);
      } catch {}
    }
  }

  if (parsed) {
    if (!parsed.subcategories) {
      parsed.subcategories = [];
      parsed.nextSubcategoryId = 1;
    }
    if (!parsed.frequencies) {
      parsed.frequencies = {};
    }
    if (parsed.products?.some((p) => typeof p.sort_order !== 'number')) {
      // Catalog saved before custom order existed: start from the alphabetical order.
      const initialOrder = alphabeticalOrder(parsed.products);
      parsed.products.forEach((p) => (p.sort_order = initialOrder.get(p.id) ?? 0));
      save(parsed);
    }
    if ((!parsed.groups || parsed.groups.length === 0) && (!parsed.products || parsed.products.length === 0)) {
      const initial = createInitialData();
      save(initial);
      return initial;
    }
    return parsed;
  }

  const initial = createInitialData();
  save(initial);
  return initial;
}

/** Browsers keep about 5-10 MB per site: tell the user instead of failing silently. */
function save(d: Data) {
  try {
    localStorage.setItem(KEY, JSON.stringify(d));
  } catch (e) {
    const msg =
      'El navegador se quedó sin espacio para guardar el catálogo (suele pasar con muchas fotos grandes). ' +
      'Exporta un respaldo y quita fotos pesadas.';
    if (typeof window !== 'undefined' && typeof window.alert === 'function') window.alert(msg);
    throw e;
  }
}
// Groups
export async function listGroups(): Promise<Group[]> {
  return load().groups.sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
}

/** Adds a group; if one with the same name already exists (ignoring case/accents) returns that one. */
export async function addGroup(name: string): Promise<number> {
  const d = load();
  const same = d.groups.find((g) => normalizeName(g.name) === normalizeName(name));
  if (same) return same.id;
  const order = Math.max(0, ...d.groups.map((g) => g.sort_order)) + 1;
  const id = d.nextGroupId++;
  d.groups.push({ id, name: name.trim(), sort_order: order });
  save(d);
  return id;
}

export async function renameGroup(id: number, name: string) {
  const d = load();
  if (d.groups.some((g) => g.id !== id && normalizeName(g.name) === normalizeName(name))) {
    throw new Error(DUPLICATE_NAME);
  }
  const g = d.groups.find((x) => x.id === id);
  if (g) g.name = name.trim();
  save(d);
}

export async function deleteGroup(id: number) {
  const d = load();
  d.groups = d.groups.filter((g) => g.id !== id);
  d.subcategories = d.subcategories.filter((s) => s.group_id !== id);
  d.products.forEach((p) => {
    if (p.group_id === id) {
      p.group_id = null;
      p.subcategory_id = null;
    }
  });
  save(d);
}

export async function reorderGroups(orderedIds: number[]) {
  const d = load();
  const idToOrder = new Map(orderedIds.map((id, index) => [id, index]));
  d.groups.forEach((g) => {
    const newOrder = idToOrder.get(g.id);
    if (newOrder !== undefined) {
      g.sort_order = newOrder;
    }
  });
  save(d);
}

export async function moveGroup(id: number, direction: 'up' | 'down') {
  const groups = await listGroups();
  const idx = groups.findIndex((g) => g.id === id);
  if (idx < 0) return;
  const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
  if (targetIdx < 0 || targetIdx >= groups.length) return;

  const temp = groups[idx];
  groups[idx] = groups[targetIdx];
  groups[targetIdx] = temp;

  await reorderGroups(groups.map((g) => g.id));
}

// Subcategories
export async function listSubcategories(groupId?: number): Promise<Subcategory[]> {
  const d = load();
  const list = groupId !== undefined ? d.subcategories.filter((s) => s.group_id === groupId) : d.subcategories;
  return list.sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
}

export async function addSubcategory(groupId: number, name: string): Promise<number> {
  const d = load();
  const existing = d.subcategories.filter((s) => s.group_id === groupId);
  const same = existing.find((s) => normalizeName(s.name) === normalizeName(name));
  if (same) return same.id;
  const order = Math.max(0, ...existing.map((s) => s.sort_order)) + 1;
  const id = d.nextSubcategoryId++;
  d.subcategories.push({ id, group_id: groupId, name: name.trim(), sort_order: order });
  save(d);
  return id;
}

export async function renameSubcategory(id: number, name: string) {
  const d = load();
  const s = d.subcategories.find((x) => x.id === id);
  if (
    s &&
    d.subcategories.some((o) => o.id !== id && o.group_id === s.group_id && normalizeName(o.name) === normalizeName(name))
  ) {
    throw new Error(DUPLICATE_NAME);
  }
  if (s) s.name = name.trim();
  save(d);
}

export async function deleteSubcategory(id: number) {
  const d = load();
  d.subcategories = d.subcategories.filter((s) => s.id !== id);
  d.products.forEach((p) => {
    if (p.subcategory_id === id) p.subcategory_id = null;
  });
  save(d);
}

// Products
export async function listProducts(): Promise<Product[]> {
  return load()
    .products.map((p) => ({
      ...p,
      subcategory_id: p.subcategory_id ?? null,
      promo_qty: p.promo_qty ?? null,
      promo_price_cents: p.promo_price_cents ?? null,
    }))
    .sort(byCustomOrder);
}

/** Applies a hand-made order; see src/lib/order.ts. */
export async function reorderProducts(orderedIds: number[]) {
  if (orderedIds.length < 2) return;
  const d = load();
  const values = assignOrder(orderedIds, d.products);
  d.products.forEach((p) => {
    const v = values.get(p.id);
    if (v !== undefined) p.sort_order = v;
  });
  save(d);
}

export async function getProduct(id: number): Promise<Product | null> {
  const p = load().products.find((x) => x.id === id);
  return p
    ? {
        ...p,
        subcategory_id: p.subcategory_id ?? null,
        promo_qty: p.promo_qty ?? null,
        promo_price_cents: p.promo_price_cents ?? null,
      }
    : null;
}

export type ProductInput = Pick<
  Product,
  'name' | 'price_cents' | 'image_uri' | 'group_id' | 'subcategory_id' | 'promo_qty' | 'promo_price_cents'
>;

export async function saveProduct(input: ProductInput, id?: number) {
  const d = load();
  const clean = {
    ...input,
    name: input.name.trim(),
    subcategory_id: input.subcategory_id ?? null,
  };
  const existing = id ? d.products.find((p) => p.id === id) : undefined;
  if (existing) Object.assign(existing, clean);
  else {
    const next = Math.max(0, ...d.products.map((p) => p.sort_order ?? 0)) + 1;
    d.products.push({ id: d.nextProductId++, created_at: Date.now(), sort_order: next, ...clean });
  }
  save(d);
}

export async function moveProductGroup(
  productId: number,
  newGroupId: number | null,
  newSubcategoryId: number | null = null,
) {
  const d = load();
  const prod = d.products.find((p) => p.id === productId);
  if (prod) {
    prod.group_id = newGroupId;
    prod.subcategory_id = newSubcategoryId;
    save(d);
  }
}

export async function addProductsBulk(items: { name: string; price_cents: number }[], groupId: number | null) {
  const d = load();
  let next = Math.max(0, ...d.products.map((p) => p.sort_order ?? 0));
  for (const it of items) {
    d.products.push({
      id: d.nextProductId++,
      created_at: Date.now(),
      sort_order: ++next,
      name: it.name.trim(),
      price_cents: it.price_cents,
      image_uri: null,
      group_id: groupId,
      subcategory_id: null,
      promo_qty: null,
      promo_price_cents: null,
    });
  }
  save(d);
}

export async function deleteProduct(id: number) {
  const d = load();
  d.products = d.products.filter((p) => p.id !== id);
  if (d.frequencies) delete d.frequencies[id];
  save(d);
}

// Ventas frecuentes / Estadísticas
export async function recordSale(cart: Record<number, number>): Promise<void> {
  const d = load();
  if (!d.frequencies) d.frequencies = {};
  for (const [idStr, qty] of Object.entries(cart)) {
    if (qty > 0) {
      const id = Number(idStr);
      d.frequencies[id] = (d.frequencies[id] ?? 0) + qty;
    }
  }
  save(d);
}

export async function getFrequentProductIds(limit = 30): Promise<{ product_id: number; count: number }[]> {
  const d = load();
  const freqs = d.frequencies ?? {};
  return Object.entries(freqs)
    .map(([id, count]) => ({ product_id: Number(id), count }))
    .filter((x) => x.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export async function seedInitialData(force = false) {
  const d = load();
  if (!force && d.products.length > 0) return;
  const fresh = createInitialData();
  save(fresh);
}

export async function exportAllData(): Promise<BackupPayload> {
  const d = load();
  return {
    version: 1,
    exported_at: Date.now(),
    exported_at_readable: new Date().toLocaleString('es-CO'),
    groups: d.groups,
    subcategories: d.subcategories,
    products: d.products,
    frequencies: d.frequencies ?? {},
  };
}

export async function importAllData(payload: BackupPayload): Promise<void> {
  const maxGroupId = payload.groups.reduce((max, g) => Math.max(max, g.id), 0) + 1;
  const maxSubId = payload.subcategories.reduce((max, s) => Math.max(max, s.id), 0) + 1;
  const maxProdId = payload.products.reduce((max, p) => Math.max(max, p.id), 0) + 1;

  // Backups made before custom order existed have no sort_order: keep the order they were exported in.
  const fallback = alphabeticalOrder(payload.products);
  const data: Data = {
    groups: payload.groups,
    subcategories: payload.subcategories,
    products: payload.products.map((p) => ({ ...p, sort_order: p.sort_order ?? fallback.get(p.id) ?? 0 })),
    nextGroupId: Math.max(100, maxGroupId),
    nextSubcategoryId: Math.max(100, maxSubId),
    nextProductId: Math.max(1000, maxProdId),
    frequencies: payload.frequencies ?? {},
  };
  save(data);
}

