import type { AppSettings, DisplayGroup, Product } from '../types';

export const KNOWN_BRANDS = [
  'Apple', 'Samsung', 'Vivo', 'Oppo', 'Realme', 'OnePlus', 'Motorola',
  'Nothing', 'Xiaomi', 'Redmi', 'Poco', 'Honor', 'Huawei', 'Google',
  'Nokia', 'Sony', 'LG', 'Asus', 'IQOO', 'Infinix', 'Tecno', 'Lava',
  'Micromax', 'Itel', 'Lenovo', 'ZTE', 'HTC', 'BlackBerry', 'Meizu',
] as const;

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export function debounce<T extends (...args: never[]) => void>(
  fn: T,
  delay = 300,
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

export function formatDate(date: Date | string | number, format = 'dd/mm/yyyy'): string {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  if (format === 'dd/mm/yyyy') return `${day}/${month}/${year}`;
  return d.toLocaleDateString();
}

export function parsePrice(value: unknown): number {
  if (typeof value === 'number') return Math.round(value);
  if (!value) return 0;
  const cleaned = String(value).replace(/[₹Rs.,\s]/gi, '').trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : Math.round(num);
}

export function hasProductPrice(price: unknown): boolean {
  return parsePrice(price) > 0;
}

export function formatPrice(price: unknown, currency = '₹'): string {
  const num = parsePrice(price);
  if (num <= 0) return '';
  if (currency === '₹') return `₹${num.toLocaleString('en-IN')}`;
  return `Rs.${num.toLocaleString('en-IN')}`;
}

export function formatPriceWhatsApp(price: unknown, currency = '₹'): string {
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
  'ceramic white', 'obsidian black', 'titanium blue', 'brilliant green', 'brilliant blue',
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
  'phantom', 'marine', 'pronto', 'cyber', 'transorange', 'lavender', 'moonknight',
]);

export function detectBrand(brandField: string, modelField = ''): string {
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

export function capitalizeWords(str: string): string {
  return str.replace(/\b\w/g, (c) => c.toUpperCase());
}

export function normalizeHeader(header: unknown): string {
  return String(header || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function findColumn(headers: string[], ...names: string[]): number {
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

export function stripTrailingColor(model: string): string {
  let words = String(model || '').trim().split(/\s+/).filter(Boolean);
  if (words.length <= 1) return model;

  while (words.length > 1) {
    const lastTwo = words.slice(-2).join(' ').toLowerCase();
    const last = words[words.length - 1].toLowerCase();

    if (/^\d+[a-z]?$/i.test(words[words.length - 1])) break;
    if (/^iphone$/i.test(words[words.length - 1])) break;
    if (/^pixel$/i.test(words[words.length - 1])) break;
    if (/^(plus|pro|max|mini|ultra)$/i.test(words[words.length - 1])) break;

    if (COLOR_PHRASES.some((p) => lastTwo === p || lastTwo.endsWith(p))) {
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

function capitalizeModelWord(word: string): string {
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

export function ensureBrandModelPrefix(product: Pick<Product, 'brand' | 'model'>): string {
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

export function formatModelForCopy(model: string): string {
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

export function formatSpecForCopy(product: Pick<Product, 'ram' | 'storage'>): string {
  const norm = (v: string) =>
    String(v || '').replace(/\s/g, '').replace(/(\d+)(gb|tb)/gi, (_, n, u) => n + u.toUpperCase());
  const ram = norm(product.ram);
  const storage = norm(product.storage);
  if (!ram && !storage) return '';
  return [ram, storage].filter(Boolean).join('/');
}

export function productDisplayName(product: Pick<Product, 'brand' | 'model' | 'ram' | 'storage'>): string {
  const model = ensureBrandModelPrefix(product);
  const spec = formatSpecForCopy(product);
  return spec ? `${model} ${spec}` : model;
}

export function formatProductCopyLine(
  product: Pick<Product, 'brand' | 'model' | 'ram' | 'storage' | 'price'>,
  currency = '₹',
): string {
  const name = productDisplayName(product);
  const priceStr = formatPriceWhatsApp(product.price, currency);
  if (!priceStr) return name;
  return `${name} · *${priceStr}*`;
}

export function productKey(product: Pick<Product, 'brand' | 'model' | 'ram' | 'storage'>): string {
  return `${product.brand}|${product.model}|${product.ram}|${product.storage}`.toLowerCase();
}

export function groupByBrand(
  products: Product[],
  brandOrder: string[] = [],
): { brand: string; products: Product[] }[] {
  const groups: Record<string, Product[]> = {};
  for (const p of products) {
    const brand = p.brand || 'Other';
    if (!groups[brand]) groups[brand] = [];
    groups[brand].push(p);
  }

  const brands = Object.keys(groups);
  const ordered: string[] = [];

  for (const b of brandOrder) {
    if (groups[b]) {
      ordered.push(b);
      delete groups[b];
    }
  }

  const remaining = brands.filter((b) => !ordered.includes(b)).sort((a, b) => a.localeCompare(b));
  ordered.push(...remaining);

  return ordered.map((brand) => ({ brand, products: groups[brand] || [] }));
}

export function groupProductsForDisplay(
  products: Product[],
  settings: Partial<
    Pick<
      AppSettings,
      'customSections' | 'sectionOrder' | 'brandOrder' | 'collapsedSections' | 'collapsedBrands'
    >
  > = {},
): DisplayGroup[] {
  const sections = settings.customSections || [];
  const sectionOrder = settings.sectionOrder || [];
  const sectionMap = new Map(sections.map((sec) => [sec.id, sec]));
  const groups: DisplayGroup[] = [];

  const orderedSectionIds = [...sectionOrder];
  for (const sec of sections) {
    if (!orderedSectionIds.includes(sec.id)) orderedSectionIds.push(sec.id);
  }

  for (const id of orderedSectionIds) {
    const section = sectionMap.get(id);
    if (!section) continue;
    groups.push({
      key: id,
      title: section.title,
      products: products.filter((p) => p.sectionId === id),
      isCustom: true,
      sectionId: id,
      collapsed: !!settings.collapsedSections?.[id],
    });
  }

  const unsectioned = products.filter((p) => !p.sectionId || !sectionMap.has(p.sectionId));
  for (const { brand, products: brandProducts } of groupByBrand(unsectioned, settings.brandOrder || [])) {
    groups.push({
      key: `brand:${brand}`,
      title: brand,
      products: brandProducts,
      isCustom: false,
      brand,
      collapsed: !!settings.collapsedBrands?.[brand],
    });
  }

  return groups;
}

export function localDateKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Local calendar day (not UTC) — important for IST. */
export function todayKey(): string {
  return localDateKey();
}

export function yesterdayKey(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return localDateKey(d);
}

export function parseRamStorage(value: unknown): { ram: string; storage: string } {
  if (!value) return { ram: '', storage: '' };
  const str = String(value).trim();
  const match = str.match(/(\d+\s*GB)\s*[/\\]\s*(\d+\s*GB)/i);
  if (match) return { ram: match[1], storage: match[2] };
  const shortMatch = str.match(/^(\d+)\s*[/\\]\s*(\d+)$/);
  if (shortMatch) return { ram: `${shortMatch[1]}GB`, storage: `${shortMatch[2]}GB` };
  const parts = str.split(/[/\\]/);
  if (parts.length === 2) {
    const ram =
      /\d/i.test(parts[0]) && !/gb/i.test(parts[0]) ? `${parts[0].trim()}GB` : parts[0].trim();
    const storage =
      /\d/i.test(parts[1]) && !/gb/i.test(parts[1]) ? `${parts[1].trim()}GB` : parts[1].trim();
    return { ram, storage };
  }
  return { ram: str, storage: '' };
}

function normalizeSpecGb(value: string): string {
  if (!value) return '';
  const match = String(value).match(/(\d+)/);
  return match ? `${match[1]}GB` : String(value).replace(/\s/g, '').toUpperCase();
}

function stripBrandPrefixFromModel(name: string, brand: string): string {
  let result = String(name || '').trim();
  if (!result) return result;

  if (brand) {
    result = result.replace(new RegExp(`^${brand}\\s+`, 'i'), '').trim();
  }

  const aliases = [
    /^vivo\s+/i, /^(moto|motorola)\s+/i, /^(iphone|apple)\s+/i, /^(samsung|galaxy)\s+/i,
    /^(google\s+)?pixel\s+/i, /^iqoo\s+/i, /^nothing\s+/i, /^oppo\s+/i, /^realme\s+/i,
    /^oneplus\s+/i, /^poco\s+/i, /^redmi\s+/i, /^xiaomi\s+/i, /^nokia\s+/i,
  ];
  for (const pattern of aliases) {
    if (pattern.test(result)) {
      result = result.replace(pattern, '').trim();
      break;
    }
  }

  return result || String(name || '').trim();
}

export function parseProductDisplayEdit(
  text: string,
  brand = '',
): { model: string; ram: string; storage: string } | null {
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

export function sortProducts(products: Product[]): Product[] {
  return [...products].sort((a, b) => {
    const modelCmp = (a.model || '').localeCompare(b.model || '');
    if (modelCmp !== 0) return modelCmp;
    return (a.ram || '').localeCompare(b.ram || '');
  });
}

export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj)) as T;
}

const utils = {
  KNOWN_BRANDS,
  generateId,
  debounce,
  formatDate,
  parsePrice,
  hasProductPrice,
  formatPrice,
  formatPriceWhatsApp,
  detectBrand,
  capitalizeWords,
  normalizeHeader,
  findColumn,
  stripTrailingColor,
  ensureBrandModelPrefix,
  formatModelForCopy,
  formatSpecForCopy,
  productDisplayName,
  formatProductCopyLine,
  productKey,
  groupByBrand,
  groupProductsForDisplay,
  todayKey,
  parseRamStorage,
  parseProductDisplayEdit,
  sortProducts,
  deepClone,
};

export default utils;
