import { DUPLICATE_NAME, normalizeName } from '@/lib/names';
import { alphabeticalOrder, assignOrder } from '@/lib/order';
import type { BackupPayload, Group, Product, Subcategory } from '@/types';
import { getDb, RENUMBER_PRODUCTS_ALPHABETICALLY } from './client';
import { INITIAL_CATALOG } from './initialData';
import { seedImageUri } from './seedImages';

export async function listGroups(): Promise<Group[]> {
  const db = await getDb();
  return db.getAllAsync<Group>('SELECT * FROM groups ORDER BY sort_order, id');
}

/** Adds a group; if one with the same name already exists (ignoring case/accents) returns that one. */
export async function addGroup(name: string): Promise<number> {
  const db = await getDb();
  const same = (await listGroups()).find((g) => normalizeName(g.name) === normalizeName(name));
  if (same) return same.id;
  const res = await db.runAsync(
    'INSERT INTO groups (name, sort_order) VALUES (?, (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM groups))',
    name.trim(),
  );
  return res.lastInsertRowId;
}

export async function renameGroup(id: number, name: string) {
  const db = await getDb();
  const clash = (await listGroups()).find((g) => g.id !== id && normalizeName(g.name) === normalizeName(name));
  if (clash) throw new Error(DUPLICATE_NAME);
  await db.runAsync('UPDATE groups SET name = ? WHERE id = ?', name.trim(), id);
}

export async function deleteGroup(id: number) {
  const db = await getDb();
  await db.runAsync('DELETE FROM groups WHERE id = ?', id);
}

export async function reorderGroups(orderedIds: number[]) {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    for (let i = 0; i < orderedIds.length; i++) {
      await db.runAsync('UPDATE groups SET sort_order = ? WHERE id = ?', i, orderedIds[i]);
    }
  });
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
  const db = await getDb();
  if (groupId !== undefined) {
    return db.getAllAsync<Subcategory>(
      'SELECT * FROM subcategories WHERE group_id = ? ORDER BY sort_order, id',
      groupId,
    );
  }
  return db.getAllAsync<Subcategory>('SELECT * FROM subcategories ORDER BY group_id, sort_order, id');
}

export async function addSubcategory(groupId: number, name: string): Promise<number> {
  const db = await getDb();
  const same = (await listSubcategories(groupId)).find((s) => normalizeName(s.name) === normalizeName(name));
  if (same) return same.id;
  const res = await db.runAsync(
    'INSERT INTO subcategories (group_id, name, sort_order) VALUES (?, ?, (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM subcategories WHERE group_id = ?))',
    groupId,
    name.trim(),
    groupId,
  );
  return res.lastInsertRowId;
}

export async function renameSubcategory(id: number, name: string) {
  const db = await getDb();
  const current = (await listSubcategories()).find((s) => s.id === id);
  const clash = (await listSubcategories(current?.group_id)).find(
    (s) => s.id !== id && normalizeName(s.name) === normalizeName(name),
  );
  if (clash) throw new Error(DUPLICATE_NAME);
  await db.runAsync('UPDATE subcategories SET name = ? WHERE id = ?', name.trim(), id);
}

export async function deleteSubcategory(id: number) {
  const db = await getDb();
  await db.runAsync('DELETE FROM subcategories WHERE id = ?', id);
}

// Products
export async function listProducts(): Promise<Product[]> {
  const db = await getDb();
  return db.getAllAsync<Product>('SELECT * FROM products ORDER BY sort_order, name COLLATE NOCASE, id');
}

/**
 * Applies a hand-made order. `orderedIds` is the desired order of (some) products; they swap
 * the positions they already hold, so products not in the list do not move relative to each other.
 */
export async function reorderProducts(orderedIds: number[]) {
  if (orderedIds.length < 2) return;
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    const marks = orderedIds.map(() => '?').join(',');
    const rows = await db.getAllAsync<{ id: number; sort_order: number }>(
      `SELECT id, sort_order FROM products WHERE id IN (${marks})`,
      ...orderedIds,
    );
    for (const [id, value] of assignOrder(orderedIds, rows)) {
      await db.runAsync('UPDATE products SET sort_order = ? WHERE id = ?', value, id);
    }
  });
}

export async function getProduct(id: number): Promise<Product | null> {
  const db = await getDb();
  return db.getFirstAsync<Product>('SELECT * FROM products WHERE id = ?', id);
}

export type ProductInput = Pick<
  Product,
  'name' | 'price_cents' | 'image_uri' | 'group_id' | 'subcategory_id' | 'promo_qty' | 'promo_price_cents'
>;

export async function saveProduct(input: ProductInput, id?: number) {
  const db = await getDb();
  if (id) {
    await db.runAsync(
      'UPDATE products SET name = ?, price_cents = ?, image_uri = ?, group_id = ?, subcategory_id = ?, promo_qty = ?, promo_price_cents = ? WHERE id = ?',
      input.name.trim(),
      input.price_cents,
      input.image_uri,
      input.group_id,
      input.subcategory_id ?? null,
      input.promo_qty,
      input.promo_price_cents,
      id,
    );
  } else {
    await db.runAsync(
      'INSERT INTO products (name, price_cents, image_uri, group_id, subcategory_id, promo_qty, promo_price_cents, created_at, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM products))',
      input.name.trim(),
      input.price_cents,
      input.image_uri,
      input.group_id,
      input.subcategory_id ?? null,
      input.promo_qty,
      input.promo_price_cents,
      Date.now(),
    );
  }
}

export async function moveProductGroup(productId: number, newGroupId: number | null, newSubcategoryId: number | null = null) {
  const db = await getDb();
  await db.runAsync('UPDATE products SET group_id = ?, subcategory_id = ? WHERE id = ?', newGroupId, newSubcategoryId, productId);
}

export async function addProductsBulk(items: { name: string; price_cents: number }[], groupId: number | null) {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    for (const it of items) {
      await db.runAsync(
        'INSERT INTO products (name, price_cents, image_uri, group_id, subcategory_id, created_at, sort_order) VALUES (?, ?, NULL, ?, NULL, ?, (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM products))',
        it.name.trim(),
        it.price_cents,
        groupId,
        Date.now(),
      );
    }
  });
}

export async function deleteProduct(id: number) {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM product_stats WHERE product_id = ?', id);
    await db.runAsync('DELETE FROM products WHERE id = ?', id);
  });
}

// Ventas frecuentes / Estadísticas
export async function recordSale(cart: Record<number, number>): Promise<void> {
  const db = await getDb();
  const entries = Object.entries(cart).filter(([_, qty]) => qty > 0);
  if (entries.length === 0) return;
  await db.withTransactionAsync(async () => {
    for (const [idStr, qty] of entries) {
      const id = Number(idStr);
      await db.runAsync(
        `INSERT INTO product_stats (product_id, count, last_sold_at)
         VALUES (?, ?, ?)
         ON CONFLICT(product_id) DO UPDATE SET
           count = count + ?,
           last_sold_at = ?`,
        id,
        qty,
        Date.now(),
        qty,
        Date.now(),
      );
    }
  });
}

export async function getFrequentProductIds(limit = 30): Promise<{ product_id: number; count: number }[]> {
  const db = await getDb();
  return db.getAllAsync<{ product_id: number; count: number }>(
    'SELECT product_id, count FROM product_stats WHERE count > 0 ORDER BY count DESC, last_sold_at DESC LIMIT ?',
    limit,
  );
}

/** One seeding at a time: two quick reloads on a fresh phone must not both insert the catalog. */
let seeding: Promise<void> = Promise.resolve();

export function seedInitialData(force = false): Promise<void> {
  const run = seeding.then(
    () => seedNow(force),
    () => seedNow(force),
  );
  seeding = run.catch(() => undefined);
  return run;
}

async function seedNow(force: boolean) {
  const db = await getDb();
  const currentProds = await listProducts();
  if (!force && currentProds.length > 0) return;

  // Photos go to disk before the transaction so a failed write never leaves half a catalog.
  const photos = new Map<string, string | null>();
  for (const cat of INITIAL_CATALOG) for (const p of cat.products) if (p.image) photos.set(p.image, seedImageUri(p.image));

  const now = Date.now();
  let hasOrder = true;
  await db.withTransactionAsync(async () => {
    if (force) {
      await db.runAsync('DELETE FROM product_stats');
      await db.runAsync('DELETE FROM products');
      await db.runAsync('DELETE FROM subcategories');
      await db.runAsync('DELETE FROM groups');
    }
    for (const cat of INITIAL_CATALOG) {
      const gRes = await db.runAsync(
        'INSERT INTO groups (name, sort_order) VALUES (?, ?)',
        cat.name,
        cat.sort_order,
      );
      const gid = gRes.lastInsertRowId;

      // Seed subcategories
      const subcategoryMap = new Map<string, number>();
      for (let sIdx = 0; sIdx < cat.subcategories.length; sIdx++) {
        const sName = cat.subcategories[sIdx];
        const sRes = await db.runAsync(
          'INSERT INTO subcategories (group_id, name, sort_order) VALUES (?, ?, ?)',
          gid,
          sName,
          sIdx + 1,
        );
        subcategoryMap.set(sName, sRes.lastInsertRowId);
      }

      // Seed products with subcategory links
      for (const p of cat.products) {
        const subId = p.subcategory ? subcategoryMap.get(p.subcategory) ?? null : null;
        if (p.sort_order == null) hasOrder = false;
        await db.runAsync(
          'INSERT INTO products (name, price_cents, image_uri, group_id, subcategory_id, promo_qty, promo_price_cents, created_at, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          p.name,
          p.price_cents,
          (p.image ? photos.get(p.image) : null) ?? null,
          gid,
          subId,
          p.promo_qty ?? null,
          p.promo_price_cents ?? null,
          p.created_at ?? now,
          p.sort_order ?? 0,
        );
      }
    }
    // Catalog without its own order: alphabetical (the order users already see).
    if (!hasOrder) await db.execAsync(RENUMBER_PRODUCTS_ALPHABETICALLY);
  });
}

export async function exportAllData(): Promise<BackupPayload> {
  const groups = await listGroups();
  const subcategories = await listSubcategories();
  const products = await listProducts();
  const db = await getDb();
  const statsRows = await db.getAllAsync<{ product_id: number; count: number }>(
    'SELECT product_id, count FROM product_stats',
  );
  const frequencies: Record<number, number> = {};
  for (const r of statsRows) {
    frequencies[r.product_id] = r.count;
  }
  return {
    version: 1,
    exported_at: Date.now(),
    exported_at_readable: new Date().toLocaleString('es-CO'),
    groups,
    subcategories,
    products,
    frequencies,
  };
}

export async function importAllData(payload: BackupPayload): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM product_stats');
    await db.runAsync('DELETE FROM products');
    await db.runAsync('DELETE FROM subcategories');
    await db.runAsync('DELETE FROM groups');

    for (const g of payload.groups) {
      await db.runAsync(
        'INSERT INTO groups (id, name, sort_order) VALUES (?, ?, ?)',
        g.id,
        g.name,
        g.sort_order,
      );
    }

    for (const s of payload.subcategories) {
      await db.runAsync(
        'INSERT INTO subcategories (id, group_id, name, sort_order) VALUES (?, ?, ?, ?)',
        s.id,
        s.group_id,
        s.name,
        s.sort_order,
      );
    }

    // Backups made before custom order existed have no sort_order: keep the order they were exported in.
    const fallback = alphabeticalOrder(payload.products);
    for (const p of payload.products) {
      await db.runAsync(
        'INSERT INTO products (id, name, price_cents, image_uri, group_id, subcategory_id, promo_qty, promo_price_cents, created_at, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        p.id,
        p.name,
        p.price_cents,
        p.image_uri ?? null,
        p.group_id ?? null,
        p.subcategory_id ?? null,
        p.promo_qty ?? null,
        p.promo_price_cents ?? null,
        p.created_at || Date.now(),
        p.sort_order ?? fallback.get(p.id) ?? 0,
      );
    }

    if (payload.frequencies) {
      for (const [pIdStr, count] of Object.entries(payload.frequencies)) {
        await db.runAsync(
          'INSERT INTO product_stats (product_id, count, last_sold_at) VALUES (?, ?, ?)',
          Number(pIdStr),
          count,
          Date.now(),
        );
      }
    }
  });
}

