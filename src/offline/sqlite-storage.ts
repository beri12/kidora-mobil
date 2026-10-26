import * as SQLite from 'expo-sqlite';
import type { PendingOp, QueueStorage } from './queue';

let db: Promise<SQLite.SQLiteDatabase> | null = null;

function open() {
  if (!db) {
    db = (async () => {
      const conn = await SQLite.openDatabaseAsync('kidora-offline.db');
      await conn.execAsync(`
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS pending_ops (
          id TEXT PRIMARY KEY NOT NULL,
          kind TEXT NOT NULL,
          method TEXT NOT NULL,
          path TEXT NOT NULL,
          body TEXT,
          created_at INTEGER NOT NULL,
          attempts INTEGER NOT NULL DEFAULT 0,
          last_error TEXT
        );
        CREATE TABLE IF NOT EXISTS content_cache (
          key TEXT PRIMARY KEY NOT NULL,
          value TEXT NOT NULL,
          saved_at INTEGER NOT NULL
        );
      `);
      return conn;
    })();
  }
  return db;
}

interface Row {
  id: string;
  kind: string;
  method: PendingOp['method'];
  path: string;
  body: string | null;
  created_at: number;
  attempts: number;
  last_error: string | null;
}

export const sqliteQueueStorage: QueueStorage = {
  async all() {
    const rows = await (await open()).getAllAsync<Row>('SELECT * FROM pending_ops ORDER BY created_at');
    return rows.map((r) => ({
      id: r.id,
      kind: r.kind,
      method: r.method,
      path: r.path,
      body: r.body ? JSON.parse(r.body) : undefined,
      createdAt: r.created_at,
      attempts: r.attempts,
      lastError: r.last_error ?? undefined,
    }));
  },
  async put(op) {
    await (await open()).runAsync(
      `INSERT INTO pending_ops (id, kind, method, path, body, created_at, attempts, last_error)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET attempts = excluded.attempts, last_error = excluded.last_error`,
      op.id, op.kind, op.method, op.path, op.body === undefined ? null : JSON.stringify(op.body), op.createdAt, op.attempts, op.lastError ?? null,
    );
  },
  async remove(id) {
    await (await open()).runAsync('DELETE FROM pending_ops WHERE id = ?', id);
  },
};

/**
 * Read-through cache for lesson payloads the learner already opened, so a
 * lesson can be re-read offline. Access is still checked online: the cache
 * is only used when the request fails for network reasons, never to unlock
 * something the server refused.
 */
export const contentCache = {
  async get<T>(key: string): Promise<{ value: T; savedAt: number } | null> {
    const row = await (await open()).getFirstAsync<{ value: string; saved_at: number }>('SELECT value, saved_at FROM content_cache WHERE key = ?', key);
    return row ? { value: JSON.parse(row.value) as T, savedAt: row.saved_at } : null;
  },
  async set(key: string, value: unknown) {
    await (await open()).runAsync(
      'INSERT INTO content_cache (key, value, saved_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, saved_at = excluded.saved_at',
      key, JSON.stringify(value), Date.now(),
    );
  },
  async remove(key: string) {
    await (await open()).runAsync('DELETE FROM content_cache WHERE key = ?', key);
  },
  /** Called on sign-out: cached lessons belong to that account. */
  async clear() {
    await (await open()).execAsync('DELETE FROM content_cache; DELETE FROM pending_ops;');
  },
};
