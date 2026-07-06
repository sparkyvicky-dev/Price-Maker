/**
 * JSON import / restore functionality
 */

import { importAllData, saveAllProducts } from './db.js';
import { saveSettings } from './settings.js';
import { showToast, showLoading } from './utils.js';

export async function importJsonFile(file) {
  showLoading(true, 'Importing backup...');
  try {
    const text = await file.text();
    const data = JSON.parse(text);

    if (!data.products && !data.snapshots) {
      throw new Error('Invalid backup file format.');
    }

    await importAllData(data);

    if (data.settings) {
      saveSettings(data.settings);
    }

    showLoading(false);
    showToast('Backup restored successfully', 'success');
    return data.products || [];
  } catch (err) {
    showLoading(false);
    if (err instanceof SyntaxError) {
      showToast('Invalid JSON file', 'error');
    } else {
      showToast('Import failed: ' + err.message, 'error');
    }
    throw err;
  }
}

export async function importProductsOnly(file) {
  const products = await importJsonFile(file);
  if (products.length) {
    await saveAllProducts(products);
  }
  return products;
}
