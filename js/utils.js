/**
 * Utility functions for Sparky Mobiles Price Manager
 */

export const KNOWN_BRANDS = [
  'Apple', 'Samsung', 'Vivo', 'Oppo', 'Realme', 'OnePlus', 'Motorola',
  'Nothing', 'Xiaomi', 'Redmi', 'Poco', 'Honor', 'Huawei', 'Google',
  'Nokia', 'Sony', 'LG', 'Asus', 'IQOO', 'Infinix', 'Tecno', 'Lava',
  'Micromax', 'Itel', 'Lenovo', 'ZTE', 'HTC', 'BlackBerry', 'Meizu'
];

/**
 * Generate a unique ID
 */
export function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * Debounce function calls
 */
export function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Format date according to settings
 */
export function formatDate(date, format = 'dd/mm/yyyy') {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  if (format === 'dd/mm/yyyy') return `${day}/${month}/${year}`;
  return d.toLocaleDateString();
}

/**
 * Parse price from string
 */
export function parsePrice(value) {
  if (typeof value === 'number') return Math.round(value);
  if (!value) return 0;
  const cleaned = String(value).replace(/[₹Rs.,\s]/gi, '').trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : Math.round(num);
}

/**
 * Whether a product has a usable price
 */
export function hasProductPrice(price) {
  return parsePrice(price) > 0;
}

/**
 * Format price with currency — returns empty string when price is cleared/zero
 */
export function formatPrice(price, currency = '₹') {
  const num = parsePrice(price);
  if (num <= 0) return '';
  if (currency === '₹') return `₹${num.toLocaleString('en-IN')}`;
  return `Rs.${num.toLocaleString('en-IN')}`;
}

/**
 * Format price for WhatsApp (Rs. style) — empty when no price
 */
export function formatPriceWhatsApp(price, currency = '₹') {
  const num = parsePrice(price);
  if (num <= 0) return '';
  if (currency === '₹' || currency === 'Rs') return `Rs.${num}`;
  return `${currency}.${num}`;
}

const COLOR_PHRASES = [
  'cyber green', 'star silver', 'titanium gold', 'prism blue', 'marine blue',
  'pronto purple', 'emerald blaze', 'phantom grey', 'twilight blue', 'arctic white',
  'phoenix gold', 'nitro blue', 'majestic green', 'auspicious gold', 'fest gold',
  'silk black', 'pitch black', 'moonstone', 'aquamarine', 'stellar black',
  'inferno red', 'raging blue', 'triumph silver', 'prismatic green', 'titan black',
  'pantone cilantro', 'pantone corsair', 'pantone regatta', 'pantone parachute',
  'pantone curacao', 'leaf green', 'guava red', 'midnight black', 'icy blue',
  'prism white', 'prism violet', 'lake green', 'trans orange', 'deep blue',
  'lavender', 'moonknight titanium', 'icy purple', 'midnight violet', 'cool blue',
  'desert gold', 'sunset gold', 'spring green', 'emerald green', 'titanium silver',
  'ceramic white', 'obsidian black', 'titanium blue', 'brilliant green', 'brilliant blue'
];

const COLOR_WORDS = new Set([
  'black', 'white', 'blue', 'green', 'red', 'gold', 'silver', 'grey', 'gray',
  'purple', 'violet', 'orange', 'pink', 'yellow', 'brown', 'bronze', 'titanium',
  'legend', 'grey', 'gray', 'blace', 'blaze', 'chrome', 'fluidity', 'regatta',
  'corsair', 'parachute', 'curacao', 'orchid', 'ashleigh', 'cosmic', 'cypress',
  'amazonite', 'zephyr', 'slipstream', 'syk', 'guava', 'brilliant', 'leaf',
  'midnight', 'prism', 'emerald', 'desert', 'spring', 'sunset', 'cool', 'icy',
  'majestic', 'auspicious', 'fest', 'silk', 'pitch', 'moonstone', 'aquamarine',
  'stellar', 'inferno', 'raging', 'twilight', 'arctic', 'phoenix', 'nitro',
  'phantom', 'marine', 'pronto', 'cyber', 'transorange', 'lavender', 'moonknight'
]);

/**
 * Detect brand from product row or model name
 */
export function detectBrand(brandField, modelField = '') {
  const text = `${brandField || ''} ${modelField || ''}`.trim();
  if (!text) return 'Other';

  const brandLower = (brandField || '').toLowerCase().trim();
  for (const brand of KNOWN_BRANDS) {
    if (brandLower === brand.toLowerCase()) return brand;
    if (brandLower.includes(brand.toLowerCase())) return brand;
  }

  const modelLower = modelField.toLowerCase();
  for (const brand of KNOWN_BRANDS) {
    if (modelLower.startsWith(brand.toLowerCase())) return brand;
  }

  if (brandField && brandField.trim()) {
    return capitalizeWords(brandField.trim());
  }

  const firstWord = text.split(/\s+/)[0];
  return capitalizeWords(firstWord) || 'Other';
}

/**
 * Capitalize words in a string
 */
export function capitalizeWords(str) {
  return str.replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Normalize column header for matching
 */
export function normalizeHeader(header) {
  return String(header || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Find column index from headers
 */
export function findColumn(headers, ...names) {
  const normalized = headers.map(normalizeHeader);
  for (const name of names) {
    const idx = normalized.indexOf(normalizeHeader(name));
    if (idx !== -1) return idx;
  }
  for (let i = 0; i < normalized.length; i++) {
    for (const name of names) {
      if (normalized[i].includes(normalizeHeader(name))) return i;
    }
  }
  return -1;
}

/**
 * Strip trailing colour names from model string
 */
export function stripTrailingColor(model) {
  let words = String(model || '').trim().split(/\s+/).filter(Boolean);
  if (words.length <= 1) return model;

  while (words.length > 1) {
    const lastTwo = words.slice(-2).join(' ').toLowerCase();
    const last = words[words.length - 1].toLowerCase();

    // Never strip iPhone/Pixel model numbers (10, 11, 12, 14, 15, 16, 17, 10a, etc.)
    if (/^\d+[a-z]?$/i.test(words[words.length - 1])) break;
    if (/^iphone$/i.test(words[words.length - 1])) break;
    if (/^pixel$/i.test(words[words.length - 1])) break;
    if (/^(plus|pro|max|mini|ultra)$/i.test(words[words.length - 1])) break;

    if (COLOR_PHRASES.some(p => lastTwo === p || lastTwo.endsWith(p))) {
      words = words.slice(0, -2);
      continue;
    }
    if (COLOR_WORDS.has(last) && !/\d/.test(last)) {
      words.pop();
      continue;
    }
    break;
  }
  return words.join(' ');
}

/**
 * Capitalize a single model word (Neo, 10R, 5G, Plus, etc.)
 */
function capitalizeModelWord(word) {
  if (!word) return word;
  const w = word.trim();

  if (/^iphone$/i.test(w)) return 'iPhone';
  if (/^iqoo$/i.test(w)) return 'IQOO';
  if (/^5g$/i.test(w)) return '5G';
  if (/^4g$/i.test(w)) return '4G';
  if (/^\d+gb$/i.test(w)) return w.replace(/gb$/i, 'GB');
  if (/^\d+tb$/i.test(w)) return w.replace(/tb$/i, 'TB');
  if (/^\d+[a-z]$/i.test(w)) return w.slice(0, -1) + w.slice(-1).toUpperCase();
  if (/^[a-z]\d+[a-z0-9]*$/i.test(w)) return w.charAt(0).toUpperCase() + w.slice(1);
  if (/^\d+$/.test(w)) return w;

  return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
}

/**
 * Ensure full model name for Apple iPhone / Google Pixel lines
 */
export function ensureBrandModelPrefix(product) {
  let model = formatModelForCopy(stripTrailingColor(product.model));

  if (product.brand === 'Apple') {
    if (!/^iphone\b/i.test(model)) model = `iPhone ${model}`;
    else model = model.replace(/^iphone\b/i, 'iPhone');
  }

  if (product.brand === 'Google') {
    if (/^google\s+pixel\b/i.test(model)) model = model.replace(/^google\s+/i, '');
    else if (!/^pixel\b/i.test(model)) model = `Pixel ${model}`;
    else model = model.replace(/^pixel\b/i, 'Pixel');
  }

  return model;
}

/**
 * Format model name — every word capitalized properly (Neo 10R, Plus, Lite)
 */
export function formatModelForCopy(model) {
  let name = String(model || '').trim();
  let prefix = '';

  if (/^iphone\b/i.test(name)) {
    prefix = 'iPhone';
    name = name.replace(/^iphone\s*/i, '');
  } else if (/^google\s+pixel\b/i.test(name)) {
    prefix = 'Pixel';
    name = name.replace(/^google\s+pixel\s*/i, '');
  } else if (/^pixel\b/i.test(name)) {
    prefix = 'Pixel';
    name = name.replace(/^pixel\s*/i, '');
  } else if (/^iqoo\b/i.test(name)) {
    prefix = 'IQOO';
    name = name.replace(/^iqoo\s*/i, '');
  }

  const formatted = name.split(/\s+/).filter(Boolean).map(capitalizeModelWord).join(' ');
  return prefix ? `${prefix} ${formatted}`.trim() : formatted;
}

/**
 * Build spec string e.g. 8GB/256GB
 */
export function formatSpecForCopy(product) {
  const norm = (v) => String(v || '').replace(/\s/g, '').replace(/(\d+)(gb|tb)/gi, (_, n, u) => n + u.toUpperCase());
  const ram = norm(product.ram);
  const storage = norm(product.storage);
  if (!ram && !storage) return '';
  return [ram, storage].filter(Boolean).join('/');
}

/**
 * Build product display name (no colour, no qty)
 */
export function productDisplayName(product) {
  const model = ensureBrandModelPrefix(product);
  const spec = formatSpecForCopy(product);
  return spec ? `${model} ${spec}` : model;
}

/**
 * WhatsApp copy line — model plain, price bold with dot separator
 * e.g. Neo 10R 8GB/256GB · Rs.38000
 */
export function formatProductCopyLine(product, currency = '₹') {
  const name = productDisplayName(product);
  const priceStr = formatPriceWhatsApp(product.price, currency);
  if (!priceStr) return name;
  return `${name} · *${priceStr}*`;
}

/**
 * Build product key for comparison
 */
export function productKey(product) {
  return `${product.brand}|${product.model}|${product.ram}|${product.storage}`.toLowerCase();
}

/**
 * Group products by brand
 */
export function groupByBrand(products, brandOrder = []) {
  const groups = {};
  for (const p of products) {
    const brand = p.brand || 'Other';
    if (!groups[brand]) groups[brand] = [];
    groups[brand].push(p);
  }

  const brands = Object.keys(groups);
  const ordered = [];

  for (const b of brandOrder) {
    if (groups[b]) {
      ordered.push(b);
      delete groups[b];
    }
  }

  const remaining = brands.filter(b => !ordered.includes(b)).sort((a, b) => a.localeCompare(b));
  ordered.push(...remaining);

  return ordered.map(brand => ({ brand, products: groups[brand] || [] }));
}

/**
 * Show/hide loading overlay
 */
export function showLoading(show = true, text = 'Loading...') {
  const overlay = document.getElementById('loading-overlay');
  const loadingText = document.getElementById('loading-text');
  if (!overlay) return;
  overlay.classList.toggle('hidden', !show);
  if (loadingText) loadingText.textContent = text;
}

/**
 * Show toast notification
 */
export function showToast(message, type = 'success', duration = 3000) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.setAttribute('role', 'alert');
  toast.textContent = message;
  container.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add('show'));

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

/**
 * Escape HTML for safe rendering
 */
export function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Get today's date key (YYYY-MM-DD)
 */
export function todayKey() {
  return new Date().toISOString().split('T')[0];
}

/**
 * Parse RAM/Storage from combined field
 */
export function parseRamStorage(value) {
  if (!value) return { ram: '', storage: '' };
  const str = String(value).trim();
  const match = str.match(/(\d+\s*GB)\s*[/\\]\s*(\d+\s*GB)/i);
  if (match) return { ram: match[1], storage: match[2] };
  const shortMatch = str.match(/^(\d+)\s*[/\\]\s*(\d+)$/);
  if (shortMatch) return { ram: `${shortMatch[1]}GB`, storage: `${shortMatch[2]}GB` };
  const parts = str.split(/[/\\]/);
  if (parts.length === 2) {
    const ram = /\d/i.test(parts[0]) && !/gb/i.test(parts[0]) ? `${parts[0].trim()}GB` : parts[0].trim();
    const storage = /\d/i.test(parts[1]) && !/gb/i.test(parts[1]) ? `${parts[1].trim()}GB` : parts[1].trim();
    return { ram, storage };
  }
  return { ram: str, storage: '' };
}

function normalizeSpecGb(value) {
  if (!value) return '';
  const match = String(value).match(/(\d+)/);
  return match ? `${match[1]}GB` : String(value).replace(/\s/g, '').toUpperCase();
}

function stripBrandPrefixFromModel(name, brand) {
  let result = String(name || '').trim();
  if (!result) return result;

  if (brand) {
    result = result.replace(new RegExp(`^${brand}\\s+`, 'i'), '').trim();
  }

  const aliases = [
    /^vivo\s+/i, /^(moto|motorola)\s+/i, /^(iphone|apple)\s+/i, /^(samsung|galaxy)\s+/i,
    /^(google\s+)?pixel\s+/i, /^iqoo\s+/i, /^nothing\s+/i, /^oppo\s+/i, /^realme\s+/i,
    /^oneplus\s+/i, /^poco\s+/i, /^redmi\s+/i, /^xiaomi\s+/i, /^nokia\s+/i
  ];
  for (const pattern of aliases) {
    if (pattern.test(result)) {
      result = result.replace(pattern, '').trim();
      break;
    }
  }

  return result || String(name || '').trim();
}

/**
 * Parse an edited display name back into model + RAM + storage fields.
 */
export function parseProductDisplayEdit(text, brand = '') {
  let name = String(text || '').replace(/\u00a0/g, ' ').trim();
  if (!name) return null;

  let ram = '';
  let storage = '';

  const parenMatch = name.match(/\(([^)]+)\)\s*$/);
  if (parenMatch) {
    const parsed = parseRamStorage(parenMatch[1]);
    ram = normalizeSpecGb(parsed.ram);
    storage = normalizeSpecGb(parsed.storage);
    name = name.slice(0, parenMatch.index).trim();
  }

  const inlineSpec = name.match(/\s(\d+\s*GB)\s*\/\s*(\d+\s*GB)\s*$/i);
  if (inlineSpec && !ram) {
    ram = normalizeSpecGb(inlineSpec[1]);
    storage = normalizeSpecGb(inlineSpec[2]);
    name = name.slice(0, inlineSpec.index).trim();
  }

  const spacedSpec = name.match(/\s(\d+\s*GB)\s+(\d+\s*GB)\s*$/i);
  if (spacedSpec && !ram) {
    ram = normalizeSpecGb(spacedSpec[1]);
    storage = normalizeSpecGb(spacedSpec[2]);
    name = name.slice(0, spacedSpec.index).trim();
  }

  const storageOnly = name.match(/\s(\d+\s*GB)\s*$/i);
  if (storageOnly && !ram && !storage) {
    storage = normalizeSpecGb(storageOnly[1]);
    name = name.slice(0, storageOnly.index).trim();
  }

  name = stripBrandPrefixFromModel(name, brand);
  let model = stripTrailingColor(name.trim());
  if (!model) return null;

  if (brand === 'Apple' && !/^iphone\b/i.test(model)) model = `iPhone ${model}`;
  else if (brand === 'Apple') model = model.replace(/^iphone\b/i, 'iPhone');
  if (brand === 'Google' && !/^pixel\b/i.test(model)) model = `Pixel ${model}`;
  else if (brand === 'Google') model = model.replace(/^pixel\b/i, 'Pixel');

  return { model, ram, storage };
}

/**
 * Simple virtual scroll helper - returns visible slice
 */
export function getVisibleSlice(items, scrollTop, itemHeight, containerHeight, buffer = 5) {
  const start = Math.max(0, Math.floor(scrollTop / itemHeight) - buffer);
  const visibleCount = Math.ceil(containerHeight / itemHeight) + buffer * 2;
  const end = Math.min(items.length, start + visibleCount);
  return { start, end, items: items.slice(start, end), offsetY: start * itemHeight };
}

/**
 * Download blob as file
 */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Read file as ArrayBuffer
 */
export function readFileAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Read file as text
 */
export function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

/**
 * Deep clone object
 */
export function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Sort products within brand
 */
export function sortProducts(products) {
  return [...products].sort((a, b) => {
    const modelCmp = (a.model || '').localeCompare(b.model || '');
    if (modelCmp !== 0) return modelCmp;
    return (a.ram || '').localeCompare(b.ram || '');
  });
}
