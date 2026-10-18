import * as SQLite from 'expo-sqlite';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function getDb() {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync('bakery.db').then(async (db) => {
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
        PRAGMA foreign_keys = ON;
        CREATE TABLE IF NOT EXISTS groups (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          sort_order INTEGER NOT NULL DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS subcategories (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          sort_order INTEGER NOT NULL DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS products (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          price_cents INTEGER NOT NULL DEFAULT 0,
          image_uri TEXT,
          group_id INTEGER REFERENCES groups(id) ON DELETE SET NULL,
          subcategory_id INTEGER REFERENCES subcategories(id) ON DELETE SET NULL,
          created_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS product_stats (
          product_id INTEGER PRIMARY KEY,
          count INTEGER NOT NULL DEFAULT 0,
          last_sold_at INTEGER NOT NULL
        );
      `);
      const cols = await db.getAllAsync<{ name: string }>('PRAGMA table_info(products)');
      if (!cols.some((c) => c.name === 'promo_qty')) {
        await db.execAsync(`
          ALTER TABLE products ADD COLUMN promo_qty INTEGER;
          ALTER TABLE products ADD COLUMN promo_price_cents INTEGER;
        `);
      }
      if (!cols.some((c) => c.name === 'subcategory_id')) {
        await db.execAsync(`
          ALTER TABLE products ADD COLUMN subcategory_id INTEGER REFERENCES subcategories(id) ON DELETE SET NULL;
        `);
      }
      return db;
    });
  }
  return dbPromise;
}
