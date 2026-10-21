// Test-only stand-in for "expo-sqlite" built on Node's SQLite, so the real Android code
// (src/db/client.ts + src/db/repo.ts) can run in Node. Mirrors the async API we use.
import { DatabaseSync } from 'node:sqlite';

class FakeDb {
  private db: DatabaseSync;
  private txDepth = 0;
  constructor(file: string) {
    this.db = new DatabaseSync(file);
  }
  async execAsync(sql: string) {
    this.db.exec(sql);
  }
  async getAllAsync<T>(sql: string, ...params: any[]): Promise<T[]> {
    return this.db.prepare(sql).all(...flat(params)) as T[];
  }
  async getFirstAsync<T>(sql: string, ...params: any[]): Promise<T | null> {
    return (this.db.prepare(sql).get(...flat(params)) as T) ?? null;
  }
  async runAsync(sql: string, ...params: any[]) {
    const r = this.db.prepare(sql).run(...flat(params));
    return { lastInsertRowId: Number(r.lastInsertRowid), changes: Number(r.changes) };
  }
  async withTransactionAsync(fn: () => Promise<void>) {
    if (this.txDepth > 0) return fn();
    this.db.exec('BEGIN');
    this.txDepth++;
    try {
      await fn();
      this.db.exec('COMMIT');
    } catch (e) {
      this.db.exec('ROLLBACK');
      throw e;
    } finally {
      this.txDepth--;
    }
  }
  close() {
    this.db.close();
  }
}

const flat = (p: any[]) => (p.length === 1 && Array.isArray(p[0]) ? p[0] : p);

export type SQLiteDatabase = FakeDb;
export let DB_FILE = ':memory:';
export function setDbFile(f: string) {
  DB_FILE = f;
}
/** Test hook: make the next N opens fail, like a full disk. */
export const hooks = { failOpens: 0 };

export async function openDatabaseAsync(_name: string) {
  if (hooks.failOpens > 0) {
    hooks.failOpens--;
    throw new Error('disco lleno');
  }
  return new FakeDb(DB_FILE);
}
