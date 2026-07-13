import * as SQLite from 'expo-sqlite';
import type { AppSettings, Contact, Product, Snapshot } from '../types';
import { generateId, todayKey } from '../lib/utils';
import { getTodayFormatted } from '../lib/settings';

let db: SQLite.SQLiteDatabase | null = null;

export async function getDatabase() {
  if (!db) {
    db = await SQLite.openDatabaseAsync('pricemaker.db');
    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY NOT NULL,
        brand TEXT,
        model TEXT,
        ram TEXT,
        storage TEXT,
        price REAL,
        previousPrice REAL,
        updatedAt INTEGER,
        sectionId TEXT
      );
      CREATE TABLE IF NOT EXISTS snapshots (
        id TEXT PRIMARY KEY NOT NULL,
        date TEXT,
        dateKey TEXT,
        savedAt INTEGER,
        data TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS contacts (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT,
        phone TEXT,
        createdAt INTEGER
      );
      CREATE TABLE IF NOT EXISTS kv (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT
      );
    `);
  }
  return db;
}

function rowToProduct(row: Record<string, unknown>): Product {
  return {
    id: String(row.id),
    brand: String(row.brand || ''),
    model: String(row.model || ''),
    ram: String(row.ram || ''),
    storage: String(row.storage || ''),
    price: Number(row.price) || 0,
    previousPrice: row.previousPrice != null ? Number(row.previousPrice) : null,
    updatedAt: Number(row.updatedAt) || Date.now(),
    sectionId: row.sectionId ? String(row.sectionId) : undefined,
  };
}

export async function getAllProducts(): Promise<Product[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<Record<string, unknown>>('SELECT * FROM products');
  return rows.map(rowToProduct);
}

export async function saveAllProducts(products: Product[]) {
  const database = await getDatabase();
  await database.runAsync('DELETE FROM products');
  for (const p of products) {
    await database.runAsync(
      `INSERT INTO products (id, brand, model, ram, storage, price, previousPrice, updatedAt, sectionId)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [p.id, p.brand, p.model, p.ram, p.storage, p.price, p.previousPrice, p.updatedAt, p.sectionId ?? null],
    );
  }
}

export async function updateProduct(product: Product) {
  const database = await getDatabase();
  await database.runAsync(
    `INSERT OR REPLACE INTO products (id, brand, model, ram, storage, price, previousPrice, updatedAt, sectionId)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      product.id,
      product.brand,
      product.model,
      product.ram,
      product.storage,
      product.price,
      product.previousPrice,
      product.updatedAt,
      product.sectionId ?? null,
    ],
  );
}

export async function deleteProduct(id: string) {
  const database = await getDatabase();
  await database.runAsync('DELETE FROM products WHERE id = ?', [id]);
}

export async function saveSnapshot(products: Product[], settings: AppSettings): Promise<Snapshot> {
  const database = await getDatabase();
  const date = getTodayFormatted(settings);
  const snapshot: Snapshot = {
    id: generateId(),
    date,
    dateKey: todayKey(),
    savedAt: Date.now(),
    products: JSON.parse(JSON.stringify(products)),
    settings: JSON.parse(JSON.stringify(settings)),
  };
  await database.runAsync(
    'INSERT INTO snapshots (id, date, dateKey, savedAt, data) VALUES (?, ?, ?, ?, ?)',
    [snapshot.id, snapshot.date, snapshot.dateKey, snapshot.savedAt, JSON.stringify(snapshot)],
  );
  return snapshot;
}

export async function getAllSnapshots(): Promise<Snapshot[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<{ data: string }>('SELECT data FROM snapshots ORDER BY savedAt DESC');
  return rows.map((r) => JSON.parse(r.data) as Snapshot);
}

export async function getSnapshotById(id: string): Promise<Snapshot | null> {
  const database = await getDatabase();
  const row = await database.getFirstAsync<{ data: string }>('SELECT data FROM snapshots WHERE id = ?', [id]);
  return row ? (JSON.parse(row.data) as Snapshot) : null;
}

export async function getYesterdaySnapshot(): Promise<Snapshot | null> {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const dateKey = yesterday.toISOString().split('T')[0];
  const database = await getDatabase();
  const row = await database.getFirstAsync<{ data: string }>(
    'SELECT data FROM snapshots WHERE dateKey = ? ORDER BY savedAt DESC LIMIT 1',
    [dateKey],
  );
  return row ? (JSON.parse(row.data) as Snapshot) : null;
}

export async function getSnapshotDateKeys(): Promise<string[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<{ dateKey: string }>(
    'SELECT DISTINCT dateKey FROM snapshots ORDER BY dateKey DESC',
  );
  return rows.map((r) => r.dateKey);
}

export async function searchModelHistory(query: string) {
  const snapshots = await getAllSnapshots();
  const q = query.toLowerCase();
  const results: Array<{ date: string; dateKey: string; price: number; product: Product; snapshotId: string }> = [];
  for (const snap of snapshots) {
    for (const p of snap.products || []) {
      const full = `${p.brand} ${p.model} ${p.ram} ${p.storage}`.toLowerCase();
      if (full.includes(q)) {
        results.push({ date: snap.date, dateKey: snap.dateKey, price: p.price, product: p, snapshotId: snap.id });
      }
    }
  }
  return results.sort((a, b) => b.dateKey.localeCompare(a.dateKey));
}

export async function getAllContacts(): Promise<Contact[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM contacts ORDER BY name COLLATE NOCASE',
  );
  return rows.map((r) => ({
    id: String(r.id),
    name: String(r.name),
    phone: String(r.phone),
    createdAt: Number(r.createdAt),
  }));
}

export async function saveContact(contact: Contact) {
  const database = await getDatabase();
  await database.runAsync('INSERT OR REPLACE INTO contacts (id, name, phone, createdAt) VALUES (?, ?, ?, ?)', [
    contact.id,
    contact.name,
    contact.phone,
    contact.createdAt,
  ]);
}

export async function deleteContact(id: string) {
  const database = await getDatabase();
  await database.runAsync('DELETE FROM contacts WHERE id = ?', [id]);
}

export async function exportAllData(products: Product[], settings: AppSettings) {
  const snapshots = await getAllSnapshots();
  const contacts = await getAllContacts();
  return {
    products,
    snapshots,
    contacts,
    settings,
    exportedAt: Date.now(),
    version: 1,
    source: 'price-maker-mobile',
  };
}

export async function importAllData(data: {
  products?: Product[];
  snapshots?: Snapshot[];
  contacts?: Contact[];
}) {
  if (data.products) await saveAllProducts(data.products);
  if (data.snapshots?.length) {
    const database = await getDatabase();
    await database.runAsync('DELETE FROM snapshots');
    for (const snap of data.snapshots) {
      await database.runAsync(
        'INSERT INTO snapshots (id, date, dateKey, savedAt, data) VALUES (?, ?, ?, ?, ?)',
        [snap.id, snap.date, snap.dateKey, snap.savedAt, JSON.stringify(snap)],
      );
    }
  }
  if (data.contacts?.length) {
    for (const c of data.contacts) await saveContact(c);
  }
}

export async function resetAllData() {
  const database = await getDatabase();
  await database.execAsync('DELETE FROM products; DELETE FROM snapshots; DELETE FROM contacts;');
}
