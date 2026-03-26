// ============================================================
// Mugiwara Database - SQLite Singleton via sql.js (WASM)
// Location: ~/.mugiwara/mugiwara.db
// Pure JS, no native deps — works on Windows without node-gyp
// ============================================================

import initSqlJs, { type Database as SqlJsDatabase } from 'sql.js';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { homedir } from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const MUGIWARA_DIR = path.join(homedir(), '.mugiwara');
const DB_PATH = path.join(MUGIWARA_DIR, 'mugiwara.db');

// Resolve schema.sql relative to this file
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

let instance: SqlJsDatabase | null = null;
let SQL: Awaited<ReturnType<typeof initSqlJs>> | null = null;

/**
 * Initializes sql.js WASM engine (once).
 */
async function initEngine(): Promise<void> {
  if (SQL) return;
  SQL = await initSqlJs();
}

/**
 * Opens (or creates) the SQLite database and runs schema migration.
 * Must be called with await before any DB operations.
 */
export async function openDb(): Promise<SqlJsDatabase> {
  if (instance) return instance;

  await initEngine();

  // Ensure directory exists
  mkdirSync(MUGIWARA_DIR, { recursive: true });

  // Load existing database or create new one
  if (existsSync(DB_PATH)) {
    const buffer = readFileSync(DB_PATH);
    instance = new SQL!.Database(buffer);
  } else {
    instance = new SQL!.Database();
  }

  // Run schema migration
  if (existsSync(SCHEMA_PATH)) {
    const schema = readFileSync(SCHEMA_PATH, 'utf-8');
    instance.run(schema);
  }

  // Incremental migrations for existing databases
  runMigrations(instance);

  saveDb();
  return instance;
}

/**
 * Returns the current database instance.
 * Throws if openDb() hasn't been called yet.
 */
export function getDb(): SqlJsDatabase {
  if (!instance) {
    throw new Error('Database not initialized. Call openDb() first.');
  }
  return instance;
}

/**
 * Run incremental migrations for columns/tables added after initial schema.
 * Each migration is idempotent — safe to re-run.
 */
function runMigrations(db: SqlJsDatabase): void {
  const migrations = [
    // v3: Add project column to invocations
    `ALTER TABLE invocations ADD COLUMN project TEXT DEFAULT NULL`,
    // v3: Add project column to sessions
    `ALTER TABLE sessions ADD COLUMN project TEXT DEFAULT NULL`,
    // v3: Index on project column
    `CREATE INDEX IF NOT EXISTS idx_inv_project ON invocations(project)`,
  ];

  for (const sql of migrations) {
    try {
      db.run(sql);
    } catch {
      // Column/table already exists — ignore
    }
  }
}

/**
 * Persists the in-memory database to disk.
 * Must be called after write operations.
 */
export function saveDb(): void {
  if (!instance) return;
  const data = instance.export();
  const buffer = Buffer.from(data);
  mkdirSync(MUGIWARA_DIR, { recursive: true });
  writeFileSync(DB_PATH, buffer);
}

/**
 * Closes the database connection and resets the singleton.
 */
export function closeDb(): void {
  if (instance) {
    saveDb(); // Flush before close
    instance.close();
    instance = null;
  }
}

/**
 * Returns the database file path.
 */
export function getDbPath(): string {
  return DB_PATH;
}

export { DB_PATH, MUGIWARA_DIR };
