import type { Group, Product } from '@/types';
import { getDb } from './client';

export async function listGroups(): Promise<Group[]> {
  const db = await getDb();
  return db.getAllAsync<Group>('SELECT * FROM groups ORDER BY sort_order, id');
}

export async function addGroup(name: string) {
  const db = await getDb();
  await db.runAsync(
    'INSERT INTO groups (name, sort_order) VALUES (?, (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM groups))',
    name.trim(),
  );
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

export type ProductInput = Pick<Product, 'name' | 'price_cents' | 'image_uri' | 'group_id'>;

export async function saveProduct(input: ProductInput, id?: number) {
  const db = await getDb();
  if (id) {
    await db.runAsync(
      'UPDATE products SET name = ?, price_cents = ?, image_uri = ?, group_id = ? WHERE id = ?',
      input.name.trim(), input.price_cents, input.image_uri, input.group_id, id,
    );
  } else {
    await db.runAsync(
      'INSERT INTO products (name, price_cents, image_uri, group_id, created_at) VALUES (?, ?, ?, ?, ?)',
      input.name.trim(), input.price_cents, input.image_uri, input.group_id, Date.now(),
    );
  }
}

export async function deleteProduct(id: number) {
  const db = await getDb();
  await db.runAsync('DELETE FROM products WHERE id = ?', id);
}

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

export async function applyPriceOp(ids: number[], op: PriceOp, value: number, percent: boolean) {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    for (const id of ids) {
      const row = await db.getFirstAsync<{ price_cents: number }>('SELECT price_cents FROM products WHERE id = ?', id);
      if (!row) continue;
      await db.runAsync('UPDATE products SET price_cents = ? WHERE id = ?', applyOp(row.price_cents, op, value, percent), id);
    }
  });
}

export async function deleteProducts(ids: number[]) {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    for (const id of ids) await db.runAsync('DELETE FROM products WHERE id = ?', id);
  });
}
