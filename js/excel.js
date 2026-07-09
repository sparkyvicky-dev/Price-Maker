/**
 * Excel file parsing using SheetJS
 * Supports: Sparky Stock Report, PakkaBill Stock Summary, Stock Summary Report, generic formats
 */

import { generateId, detectBrand, parsePrice, findColumn, parseRamStorage, capitalizeWords, stripTrailingColor } from './utils.js';

const SECTION_BRAND_MAP = {
  vivo: 'Vivo',
  iqoo: 'IQOO',
  nothing: 'Nothing',
  moto: 'Motorola',
  motorola: 'Motorola',
  poco: 'Poco',
  redmi: 'Redmi',
  oppo: 'Oppo',
  realme: 'Realme',
  samsung: 'Samsung',
  oneplus: 'OnePlus',
  iphone: 'Apple',
  apple: 'Apple',
  pixel: 'Google',
  google: 'Google',
  't v': 'Television',
  tv: 'Television',
  xiaomi: 'Xiaomi',
  honor: 'Honor',
  nokia: 'Nokia',
  sony: 'Sony',
  lg: 'LG'
};

export async function parseExcelFile(file) {
  if (typeof XLSX === 'undefined') {
    throw new Error('SheetJS library not loaded. Check internet connection for first load.');
  }

  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  const products = [];
  const meta = { format: 'generic', missingPrices: 0 };

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    if (!rows.length) continue;

    const cleaned = rows.map(row => row.map(cleanCell));
    const format = detectFormat(cleaned);

    if (format === 'sparky-stock') {
      const { items, missingPrices } = parseSparkyStockReport(cleaned);
      products.push(...items);
      meta.missingPrices += missingPrices;
      meta.format = 'sparky-stock';
    } else if (format === 'stock-summary') {
      const { items, missingPrices } = parseStockSummaryReport(cleaned);
      products.push(...items);
      meta.missingPrices += missingPrices;
      meta.format = 'stock-summary';
    } else if (format === 'pakkabill') {
      products.push(...parsePakkaBillExport(cleaned));
      meta.format = 'pakkabill';
    } else {
      products.push(...parseGenericSheet(cleaned, sheetName));
    }
  }

  if (!products.length) {
    throw new Error('No products found in Excel file.');
  }

  const deduped = deduplicateProducts(products);
  return { products: deduped, meta };
}

function cleanCell(value) {
  if (value == null) return '';
  return String(value).replace(/\u00a0/g, ' ').trim();
}

/**
 * Detect Excel format from first rows
 */
function detectFormat(rows) {
  for (const row of rows.slice(0, 15)) {
    if (isStockSummaryHeader(row)) return 'stock-summary';
  }

  const flat = rows.slice(0, 8).flat().join(' ').toLowerCase();

  if (flat.includes('stock summary') && flat.includes('pakkabill') === false) {
    if (rows.some(r => findColumn(r.map(String), 'item') >= 0 && findColumn(r.map(String), 'purchase') >= 0)) {
      return 'pakkabill';
    }
  }

  if (rows.some(isSparkySectionHeader)) return 'sparky-stock';

  const firstRow = (rows[0] || []).map(c => String(c).toUpperCase());
  if (firstRow[0] === 'S.NO' && firstRow.length >= 2 && SECTION_BRAND_MAP[firstRow[1].toLowerCase()]) {
    return 'sparky-stock';
  }

  return 'generic';
}

function isStockSummaryHeader(row) {
  if (!row?.length) return false;
  const headers = row.map(c => String(c).trim());
  const itemCol = findColumn(headers, 'item name', 'item', 'product name');
  if (itemCol < 0) return false;

  const hasPrice = findColumn(headers, 'purchase price', 'purchase', 'sale price', 'sale') >= 0;
  const hasStock = findColumn(headers, 'stock quantity', 'available quantity', 'quantity', 'qty') >= 0;
  return hasPrice || hasStock;
}

function isSparkySectionHeader(row) {
  if (!row || !row.length) return false;
  const col0 = String(row[0]).toUpperCase().replace('.', '');
  if (col0 !== 'SNO' && col0 !== 'S NO') return false;
  const brandCell = String(row[1] || '').trim();
  if (!brandCell) return false;
  const key = brandCell.toLowerCase();
  return !!SECTION_BRAND_MAP[key] || key === 't v' || key === 'iphone';
}

/**
 * Parse Sparky Stock Report format
 * Sections: S.NO | BRAND | Colour | QTY | PRICE?
 */
function parseSparkyStockReport(rows) {
  const products = [];
  let currentBrand = '';
  let hasPriceColumn = false;
  let missingPrices = 0;

  for (const row of rows) {
    if (isSparkySectionHeader(row)) {
      currentBrand = normalizeSectionBrand(String(row[1]));
      hasPriceColumn = row.some((cell, i) => i > 2 && /^price$/i.test(String(cell).trim()));
      continue;
    }

    if (!currentBrand) continue;

    const serial = String(row[0] || '').trim();
    if (!/^\d+$/.test(serial)) continue;

    const productName = String(row[1] || '').trim();
    if (!productName) continue;

    const price = extractSparkyPrice(row, hasPriceColumn);
    const parsed = parseEmbeddedProductName(productName, currentBrand);

    if (price <= 0) missingPrices++;

    products.push({
      id: generateId(),
      brand: parsed.brand,
      model: parsed.model,
      ram: parsed.ram,
      storage: parsed.storage,
      price,
      previousPrice: null,
      updatedAt: Date.now()
    });
  }

  return { items: products, missingPrices };
}

/**
 * Parse Stock Summary Report exports
 * Columns: Item Name, Sale Price, Purchase Price, Stock Quantity, ...
 * Imports product names only — prices are left empty for manual entry.
 */
function parseStockSummaryReport(rows) {
  let headerIdx = -1;
  let headers = [];

  for (let i = 0; i < Math.min(20, rows.length); i++) {
    if (isStockSummaryHeader(rows[i])) {
      headerIdx = i;
      headers = rows[i].map(c => String(c).trim());
      break;
    }
  }

  if (headerIdx < 0) return { items: [], missingPrices: 0 };

  const itemCol = findColumn(headers, 'item name', 'item', 'product name');
  const products = [];
  let missingPrices = 0;

  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.every(c => !c && c !== 0)) continue;

    const itemName = String(row[itemCol] || '').trim();
    if (!itemName || /^item name$/i.test(itemName)) continue;

    const parsed = parsePakkaBillItem(itemName, '');
    if (!parsed.model) continue;

    missingPrices++;
    products.push({
      id: generateId(),
      brand: parsed.brand,
      model: parsed.model,
      ram: parsed.ram,
      storage: parsed.storage,
      price: 0,
      previousPrice: null,
      updatedAt: Date.now()
    });
  }

  return { items: products, missingPrices };
}

/**
 * Parse PakkaBill Stock Summary export
 * Columns: #, Item, SKU, Cat, Sale, Purchase, Qty, Value, Margin
 */
function parsePakkaBillExport(rows) {
  let headerIdx = -1;
  let headers = [];

  for (let i = 0; i < Math.min(15, rows.length); i++) {
    const h = rows[i].map(c => String(c).trim());
    if (findColumn(h, 'item') >= 0 && (findColumn(h, 'purchase') >= 0 || findColumn(h, 'sale') >= 0)) {
      headerIdx = i;
      headers = h;
      break;
    }
  }

  if (headerIdx < 0) return [];

  const itemCol = findColumn(headers, 'item', 'product', 'name');
  const catCol = findColumn(headers, 'cat', 'category');
  const saleCol = findColumn(headers, 'sale', 'salerate', 'sellingprice');
  const purchaseCol = findColumn(headers, 'purchase', 'purchaseprice', 'cost', 'dealer');

  const products = [];

  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.every(c => !c && c !== 0)) continue;

    const itemName = String(row[itemCol] || '').trim();
    if (!itemName) continue;

    const category = catCol >= 0 ? String(row[catCol] || '').trim() : '';
    const sale = saleCol >= 0 ? parsePrice(row[saleCol]) : 0;
    const purchase = purchaseCol >= 0 ? parsePrice(row[purchaseCol]) : 0;
    const price = sale > 0 ? sale : purchase;

    const parsed = parsePakkaBillItem(itemName, category);
    if (!parsed.model) continue;

    products.push({
      id: generateId(),
      brand: parsed.brand,
      model: parsed.model,
      ram: parsed.ram,
      storage: parsed.storage,
      price,
      previousPrice: null,
      updatedAt: Date.now()
    });
  }

  return products;
}

/**
 * Parse PakkaBill item string e.g. "Vivo T5x (8gb/256gb) Cyber Green"
 */
function parsePakkaBillItem(itemName, category) {
  let name = itemName.replace(/\u00a0/g, ' ').trim();
  let brand = detectBrand('', name);
  let ram = '';
  let storage = '';

  const parenSpec = name.match(/\(([^)]+)\)/i);
  if (parenSpec) {
    const inner = parenSpec[1];
    if (/\d+\s*gb/i.test(inner) || /\d+\s*\/\s*\d+/i.test(inner) || /gb\/gb/i.test(inner)) {
      const parsed = parseRamStorage(inner);
      const isSingleStorage = parsed.ram && !parsed.storage && /^\d+\s*gb$/i.test(String(parsed.ram).trim());
      if (isSingleStorage && /iphone|apple|pixel|pro max|pro\b/i.test(name)) {
        storage = normalizeSpec(parsed.ram);
        ram = '';
      } else {
        ram = normalizeSpec(parsed.ram);
        storage = normalizeSpec(parsed.storage);
      }
      name = name.replace(parenSpec[0], '').trim();
    }
  }

  const inlineSpec = name.match(/\b(\d+\s*gb)\s*\/\s*(\d+\s*gb)\b/i);
  if (inlineSpec && !ram) {
    ram = normalizeSpec(inlineSpec[1]);
    storage = normalizeSpec(inlineSpec[2]);
    name = name.replace(inlineSpec[0], '').trim();
  }

  const storageOnly = name.match(/\b(\d+)\s*gb\b(?!\s*\/)/i);
  if (storageOnly && !ram && !storage) {
    storage = normalizeSpec(storageOnly[0]);
    name = name.replace(storageOnly[0], '').trim();
  }

  const shortStorage = name.match(/\b(\d{2,4})\s*$/);
  if (shortStorage && !ram && !storage) {
    storage = `${shortStorage[1]}GB`;
    name = name.replace(shortStorage[0], '').trim();
  }

  brand = stripBrandFromModel(name, brand);
  let model = stripBrandPrefix(name, brand) || name;
  model = stripTrailingColor(model.trim());
  if (brand === 'Apple' && !/^iphone\b/i.test(model)) model = `iPhone ${model}`;
  if (brand === 'Google' && !/^pixel\b/i.test(model)) model = `Pixel ${model}`;

  if (category && /television|tv/i.test(category)) {
    brand = 'Television';
  } else if (category && category !== 'Mobiles' && brand === 'Other') {
    brand = capitalizeWords(category) || brand;
  }

  return {
    brand: normalizeSectionBrand(brand),
    model: model.trim(),
    ram,
    storage
  };
}

/**
 * Parse product name with embedded specs e.g. "VIVO T5X 5G (8GB/256GB)"
 */
function parseEmbeddedProductName(productName, sectionBrand) {
  let name = productName.replace(/\u00a0/g, ' ').trim();
  let ram = '';
  let storage = '';
  let brand = normalizeSectionBrand(sectionBrand);

  const parenMatch = name.match(/\(([^)]+)\)\s*$/);
  if (parenMatch) {
    const parsed = parseRamStorage(parenMatch[1]);
    ram = normalizeSpec(parsed.ram);
    storage = normalizeSpec(parsed.storage);
    name = name.slice(0, parenMatch.index).trim();
  }

  const inlineSpec = name.match(/\b(\d+\s*GB)\s*\/\s*(\d+\s*GB)\b/i);
  if (inlineSpec && !ram) {
    ram = normalizeSpec(inlineSpec[1]);
    storage = normalizeSpec(inlineSpec[2]);
    name = name.replace(inlineSpec[0], '').trim();
  }

  const storageOnly = name.match(/\b(\d+)\s*GB\b(?!\s*\/)/i);
  if (storageOnly && !ram && !storage) {
    storage = normalizeSpec(storageOnly[0]);
    name = name.replace(storageOnly[0], '').trim();
  }

  name = stripBrandPrefix(name, brand);
  const detected = detectBrand(name.split(' ')[0], name);
  if (detected !== 'Other' && brand === 'Other') brand = detected;

  let model = name.trim();
  if (brand === 'Apple' && !/^iphone\b/i.test(model)) model = `iPhone ${model}`;
  if (brand === 'Google' && !/^pixel\b/i.test(model)) model = `Pixel ${model}`;

  return { brand, model: stripTrailingColor(model), ram, storage };
}

function normalizeSectionBrand(raw) {
  const key = String(raw || '').trim().toLowerCase();
  if (SECTION_BRAND_MAP[key]) return SECTION_BRAND_MAP[key];
  if (key.includes('iphone')) return 'Apple';
  if (key.includes('pixel')) return 'Google';
  if (key === 't v' || key === 'tv') return 'Television';
  return detectBrand(raw, '') !== 'Other' ? detectBrand(raw, '') : capitalizeWords(raw);
}

function stripBrandPrefix(name, brand) {
  if (!name || !brand) return name;
  const pattern = new RegExp(`^${brand}\\s+`, 'i');
  let result = name.replace(pattern, '').trim();
  const aliases = {
    Vivo: /^vivo\s+/i,
    Motorola: /^(moto|motorola)\s+/i,
    Apple: /^(iphone|apple)\s+/i,
    Samsung: /^(samsung|galaxy)\s+/i,
    Google: /^(google\s+)?pixel\s+/i,
    IQOO: /^iqoo\s+/i,
    Nothing: /^nothing\s+/i,
    Oppo: /^oppo\s+/i,
    Realme: /^realme\s+/i,
    OnePlus: /^oneplus\s+/i,
    Poco: /^poco\s+/i,
    Redmi: /^redmi\s+/i
  };
  if (aliases[brand]) result = result.replace(aliases[brand], '').trim();
  return result || name;
}

function stripBrandFromModel(name, brand) {
  const detected = detectBrand(name.split(' ')[0], name);
  return detected !== 'Other' ? detected : brand;
}

function extractSparkyPrice(row, hasPriceColumn) {
  if (hasPriceColumn && row.length >= 5) {
    return parsePrice(row[4]);
  }
  if (row.length >= 5) {
    const candidate = parsePrice(row[4]);
    if (candidate >= 1000) return candidate;
  }
  return 0;
}

function extractPriceFromRow(row) {
  for (let i = row.length - 1; i >= 0; i--) {
    const val = parsePrice(row[i]);
    if (val > 0 && val < 500000) return val;
  }
  return 0;
}

function parseGenericSheet(rows, sheetName) {
  let headerRowIdx = 0;
  let headers = rows[0].map(h => String(h).trim());

  for (let i = 0; i < Math.min(10, rows.length); i++) {
    const rowStr = rows[i].join(' ').toLowerCase();
    if (rowStr.includes('model') || rowStr.includes('price') || rowStr.includes('item')) {
      headerRowIdx = i;
      headers = rows[i].map(h => String(h).trim());
      break;
    }
  }

  if (isSparkySectionHeader(rows[headerRowIdx])) {
    return parseSparkyStockReport(rows).items;
  }

  const brandCol = findColumn(headers, 'brand', 'company', 'make');
  const modelCol = findColumn(headers, 'model', 'product', 'name', 'device', 'item');
  const ramCol = findColumn(headers, 'ram', 'memory');
  const storageCol = findColumn(headers, 'storage', 'rom', 'internal');
  const priceCol = findColumn(headers, 'price', 'mrp', 'rate', 'amount', 'dealer', 'dp', 'purchase', 'sale');
  const specCol = findColumn(headers, 'spec', 'variant', 'configuration', 'ram/storage');

  const products = [];

  for (let i = headerRowIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.every(c => !c && c !== 0)) continue;

    let brand = brandCol >= 0 ? String(row[brandCol] || '').trim() : '';
    let model = modelCol >= 0 ? String(row[modelCol] || '').trim() : '';
    let ram = ramCol >= 0 ? String(row[ramCol] || '').trim() : '';
    let storage = storageCol >= 0 ? String(row[storageCol] || '').trim() : '';
    const price = priceCol >= 0 ? parsePrice(row[priceCol]) : extractPriceFromRow(row);

    if (!model && brand) { model = brand; brand = ''; }
    if (specCol >= 0 && row[specCol]) {
      const parsed = parseRamStorage(row[specCol]);
      if (!ram) ram = parsed.ram;
      if (!storage) storage = parsed.storage;
    }
    if (!model) {
      const first = row.find(c => c !== '' && c != null);
      if (first) model = String(first).trim();
    }
    if (!model) continue;

    if (brand) {
      brand = detectBrand(brand, model);
    } else {
      const parsed = parseEmbeddedProductName(model, '');
      brand = parsed.brand;
      model = parsed.model;
      if (!ram) ram = parsed.ram;
      if (!storage) storage = parsed.storage;
    }

    if (!brand || brand === 'Other') brand = detectBrand(sheetName, model);

    products.push({
      id: generateId(),
      brand,
      model,
      ram: normalizeSpec(ram),
      storage: normalizeSpec(storage),
      price,
      previousPrice: null,
      updatedAt: Date.now()
    });
  }
  return products;
}

function normalizeSpec(val) {
  if (!val) return '';
  return String(val).replace(/\s+/g, '').replace(/(\d+)(gb|tb)/gi, '$1GB').replace(/GBGB/gi, 'GB');
}

/**
 * Deduplicate by brand+model+ram+storage; keep lowest non-zero price
 */
function deduplicateProducts(products) {
  const map = new Map();
  for (const p of products) {
    const model = stripTrailingColor(p.model);
    const key = `${p.brand}|${model}|${p.ram}|${p.storage}`.toLowerCase();
    const normalized = { ...p, model };
    const existing = map.get(key);
    if (!existing) {
      map.set(key, normalized);
    } else if (p.price > 0 && (existing.price === 0 || p.price < existing.price)) {
      map.set(key, { ...existing, price: p.price });
    }
  }
  return Array.from(map.values());
}

export function productsToWorkbook(products, header = {}) {
  if (typeof XLSX === 'undefined') throw new Error('SheetJS not loaded.');

  const rows = [
    [header.storeName || 'Sparky Mobiles', header.location || '', header.date || ''],
    [header.title || 'Price List', header.validity || ''],
    [],
    ['S.NO', 'Model', 'RAM/Storage', 'Price']
  ];

  const grouped = {};
  for (const p of products) {
    if (!grouped[p.brand]) grouped[p.brand] = [];
    grouped[p.brand].push(p);
  }

  let serial = 1;
  for (const brand of Object.keys(grouped).sort()) {
    rows.push(['', brand.toUpperCase(), '', '']);
    const sorted = grouped[brand].sort((a, b) => a.model.localeCompare(b.model));
    for (const p of sorted) {
      const spec = [p.ram, p.storage].filter(Boolean).join('/');
      rows.push([serial++, `${p.model}${spec ? ` (${spec})` : ''}`, '', p.price]);
    }
    rows.push([]);
  }

  if (header.footer) {
    rows.push([header.footer.line1, header.footer.line2, header.footer.line3].filter(Boolean));
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Price List');
  return wb;
}

export function workbookToBuffer(wb) {
  return XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
}
