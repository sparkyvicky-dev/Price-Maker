/**
 * IndexedDB layer for Sparky Mobiles Price Manager
 */

const DB_NAME = 'SparkyMobilesDB';
const DB_VERSION = 1;

let dbInstance = null;

export function openDB() {
  if (dbInstance) return Promise.resolve(dbInstance);

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);

    request.onsuccess = () => {
      dbInstance = request.result;
      dbInstance.onclose = () => { dbInstance = null; };
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains('products')) {
        const productStore = db.createObjectStore('products', { keyPath: 'id' });
        productStore.createIndex('brand', 'brand', { unique: false });
        productStore.createIndex('model', 'model', { unique: false });
      }

      if (!db.objectStoreNames.contains('snapshots')) {
        const snapStore = db.createObjectStore('snapshots', { keyPath: 'id' });
        snapStore.createIndex('date', 'date', { unique: false });
        snapStore.createIndex('savedAt', 'savedAt', { unique: false });
        snapStore.createIndex('dateKey', 'dateKey', { unique: false });
      }

      if (!db.objectStoreNames.contains('history')) {
        const histStore = db.createObjectStore('history', { keyPath: 'id', autoIncrement: true });
        histStore.createIndex('dateKey', 'dateKey', { unique: false });
        histStore.createIndex('timestamp', 'timestamp', { unique: false });
      }

      if (!db.objectStoreNames.contains('meta')) {
        db.createObjectStore('meta', { keyPath: 'key' });
      }
    };
  });
}

async function tx(storeNames, mode, callback) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeNames, mode);
    const names = Array.isArray(storeNames) ? storeNames : [storeNames];
    const stores = {};
    for (const name of names) {
      stores[name] = transaction.objectStore(name);
    }

    let callbackResult;
    try {
      callbackResult = callback(stores, transaction);
    } catch (err) {
      reject(err);
      return;
    }

    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error || new Error('Transaction aborted'));
    transaction.oncomplete = () => {
      Promise.resolve(callbackResult).then(resolve, reject);
    };
  });
}

export async function getAllProducts() {
  return tx('products', 'readonly', ({ products }) => {
    return new Promise((resolve, reject) => {
      const req = products.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  });
}

export async function saveAllProducts(productList) {
  await tx('products', 'readwrite', ({ products }) => {
    products.clear();
    for (const p of productList) {
      products.put(p);
    }
  });
}

export async function updateProduct(product) {
  return tx('products', 'readwrite', ({ products }) => {
    products.put(product);
  });
}

export async function deleteProduct(id) {
  return tx('products', 'readwrite', ({ products }) => {
    products.delete(id);
  });
}

export async function clearProducts() {
  return tx('products', 'readwrite', ({ products }) => {
    products.clear();
  });
}

export async function saveSnapshot(snapshot) {
  return tx(['snapshots', 'history'], 'readwrite', ({ snapshots, history }) => {
    snapshots.add(snapshot);
    history.add({
      dateKey: snapshot.dateKey,
      snapshotId: snapshot.id,
      timestamp: snapshot.savedAt,
      label: snapshot.date
    });
  });
}

export async function getAllSnapshots() {
  return tx('snapshots', 'readonly', ({ snapshots }) => {
    return new Promise((resolve, reject) => {
      const req = snapshots.getAll();
      req.onsuccess = () => {
        const result = (req.result || []).sort((a, b) => b.savedAt - a.savedAt);
        resolve(result);
      };
      req.onerror = () => reject(req.error);
    });
  });
}

export async function getSnapshotsPaginated(page = 1, pageSize = 20) {
  const all = await getAllSnapshots();
  const start = (page - 1) * pageSize;
  return {
    items: all.slice(start, start + pageSize),
    total: all.length,
    page,
    pageSize,
    totalPages: Math.ceil(all.length / pageSize)
  };
}

export async function getSnapshotById(id) {
  return tx('snapshots', 'readonly', ({ snapshots }) => {
    return new Promise((resolve, reject) => {
      const req = snapshots.get(id);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  });
}

export async function getSnapshotsByDate(dateKey) {
  return tx('snapshots', 'readonly', ({ snapshots }) => {
    return new Promise((resolve, reject) => {
      const index = snapshots.index('dateKey');
      const req = index.getAll(dateKey);
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  });
}

export async function getLatestSnapshotForDate(dateKey) {
  const snaps = await getSnapshotsByDate(dateKey);
  if (!snaps.length) return null;
  return snaps.sort((a, b) => b.savedAt - a.savedAt)[0];
}

export async function getYesterdaySnapshot() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const dateKey = yesterday.toISOString().split('T')[0];
  return getLatestSnapshotForDate(dateKey);
}

export async function searchModelHistory(modelQuery) {
  const snapshots = await getAllSnapshots();
  const query = modelQuery.toLowerCase();
  const results = [];

  for (const snap of snapshots) {
    const matches = (snap.products || []).filter(p => {
      const full = `${p.brand} ${p.model} ${p.ram} ${p.storage}`.toLowerCase();
      return full.includes(query);
    });
    for (const p of matches) {
      results.push({
        date: snap.date,
        dateKey: snap.dateKey,
        price: p.price,
        product: p,
        snapshotId: snap.id
      });
    }
  }

  return results.sort((a, b) => new Date(b.dateKey) - new Date(a.dateKey));
}

export async function getMeta(key) {
  return tx('meta', 'readonly', ({ meta }) => {
    return new Promise((resolve, reject) => {
      const req = meta.get(key);
      req.onsuccess = () => resolve(req.result?.value ?? null);
      req.onerror = () => reject(req.error);
    });
  });
}

export async function setMeta(key, value) {
  return tx('meta', 'readwrite', ({ meta }) => {
    meta.put({ key, value });
  });
}

export async function getHistoryCount() {
  return tx('history', 'readonly', ({ history }) => {
    return new Promise((resolve, reject) => {
      const req = history.count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  });
}

export async function exportAllData() {
  const [products, snapshots] = await Promise.all([
    getAllProducts(),
    getAllSnapshots()
  ]);
  return { products, snapshots, exportedAt: Date.now(), version: DB_VERSION };
}

export async function importAllData(data) {
  await tx(['products', 'snapshots', 'history'], 'readwrite', ({ products, snapshots, history }) => {
    products.clear();
    snapshots.clear();
    history.clear();

    for (const p of data.products || []) {
      products.put(p);
    }
    for (const s of data.snapshots || []) {
      snapshots.put(s);
      history.add({
        dateKey: s.dateKey,
        snapshotId: s.id,
        timestamp: s.savedAt,
        label: s.date
      });
    }
  });
}

export async function resetDatabase() {
  const stores = ['products', 'snapshots', 'history', 'meta'];
  return tx(stores, 'readwrite', (storeMap) => {
    for (const name of stores) {
      storeMap[name].clear();
    }
  });
}

export async function recoverDatabase() {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
  return openDB();
}

export async function getSnapshotDateKeys() {
  const snapshots = await getAllSnapshots();
  const keys = [...new Set(snapshots.map(s => s.dateKey))];
  return keys.sort((a, b) => b.localeCompare(a));
}
