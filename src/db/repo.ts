import type { Group, Product } from '@/types';
import { getDb } from './client';

export async function listGroups(): Promise<Group[]> {
  const db = await getDb();
  return db.getAllAsync<Group>('SELECT * FROM groups ORDER BY sort_order, id');
}

export async function addGroup(name: string): Promise<number> {
  const db = await getDb();
  const res = await db.runAsync(
    'INSERT INTO groups (name, sort_order) VALUES (?, (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM groups))',
    name.trim(),
  );
  return res.lastInsertRowId;
}

export async function renameGroup(id: number, name: string) {
  const db = await getDb();
  await db.runAsync('UPDATE groups SET name = ? WHERE id = ?', name.trim(), id);
}

export async function deleteGroup(id: number) {
  const db = await getDb();
  await db.runAsync('DELETE FROM groups WHERE id = ?', id);
}

export async function listProducts(): Promise<Product[]> {
  const db = await getDb();
  return db.getAllAsync<Product>('SELECT * FROM products ORDER BY name COLLATE NOCASE');
}

export async function getProduct(id: number): Promise<Product | null> {
  const db = await getDb();
  return db.getFirstAsync<Product>('SELECT * FROM products WHERE id = ?', id);
}

export type ProductInput = Pick<
  Product,
  'name' | 'price_cents' | 'image_uri' | 'group_id' | 'promo_qty' | 'promo_price_cents'
>;

export async function saveProduct(input: ProductInput, id?: number) {
  const db = await getDb();
  if (id) {
    await db.runAsync(
      'UPDATE products SET name = ?, price_cents = ?, image_uri = ?, group_id = ?, promo_qty = ?, promo_price_cents = ? WHERE id = ?',
      input.name.trim(), input.price_cents, input.image_uri, input.group_id, input.promo_qty, input.promo_price_cents, id,
    );
  } else {
    await db.runAsync(
      'INSERT INTO products (name, price_cents, image_uri, group_id, promo_qty, promo_price_cents, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      input.name.trim(), input.price_cents, input.image_uri, input.group_id, input.promo_qty, input.promo_price_cents, Date.now(),
    );
  }
}

export async function addProductsBulk(items: { name: string; price_cents: number }[], groupId: number | null) {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    for (const it of items) {
      await db.runAsync(
        'INSERT INTO products (name, price_cents, image_uri, group_id, created_at) VALUES (?, ?, NULL, ?, ?)',
        it.name.trim(), it.price_cents, groupId, Date.now(),
      );
    }
  });
}

export async function deleteProduct(id: number) {
  const db = await getDb();
  await db.runAsync('DELETE FROM products WHERE id = ?', id);
}
