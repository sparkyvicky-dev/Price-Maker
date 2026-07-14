import type { AppSettings, FooterTemplate } from '../types';
import { formatDate } from './utils';

const SETTINGS_KEY = '@price_maker_settings';

export const DEFAULT_TITLE_TEMPLATES = [
  'Price List',
  'Daily Mobile Price List',
  'Dealer Price Sheet',
  'Wholesale Rate List',
  'Today Special Offers',
];

export const DEFAULT_VALIDITY_TEMPLATES = [
  'Valid For Today Only',
  'Valid Till Stock Lasts',
  'Prices Subject to Change',
  'One Day Only Offer',
  'Valid Until 6 PM Today',
];

export const DEFAULT_FOOTER_TEMPLATES: FooterTemplate[] = [
  { line1: 'No DOA Support', line2: 'Payment Always Prepaid', line3: 'Call or WhatsApp for Orders' },
  { line1: 'No Return No Exchange', line2: '100% Advance Payment', line3: 'WhatsApp for Orders' },
  { line1: 'GST Extra If Applicable', line2: 'Delivery Charges Extra', line3: 'Contact for Bulk Orders' },
  { line1: 'Warranty As Per Company', line2: 'No Credit', line3: 'Shop Timings 10 AM - 9 PM' },
  { line1: 'All Prices Ex-Shop', line2: 'Minimum Order May Apply', line3: 'Thank You For Your Business' },
];

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  currency: '₹',
  dateFormat: 'dd/mm/yyyy',
  storeName: 'Sparky Mobiles',
  location: 'Kumbakonam',
  logo: null,
  favoriteBrands: [],
  brandOrder: [],
  header: { title: 'Price List', validity: 'Valid For Today Only' },
  footer: { ...DEFAULT_FOOTER_TEMPLATES[0] },
  titleTemplates: [...DEFAULT_TITLE_TEMPLATES],
  validityTemplates: [...DEFAULT_VALIDITY_TEMPLATES],
  footerTemplates: DEFAULT_FOOTER_TEMPLATES.map((t) => ({ ...t })),
  customSections: [],
  sectionOrder: [],
  collapsedSections: {},
  collapsedBrands: {},
  autosaveEnabled: true,
};

let cachedSettings: AppSettings | null = null;

function mergeUniqueStrings(defaults: string[], extra?: unknown): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of [...defaults, ...(Array.isArray(extra) ? extra : [])]) {
    const value = String(item || '').trim();
    if (!value) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(value);
  }
  return out;
}

export function footerKey(footer: FooterTemplate) {
  return [footer.line1, footer.line2, footer.line3]
    .map((v) => String(v || '').trim().toLowerCase())
    .join('|');
}

function mergeFooterTemplates(defaults: FooterTemplate[], extra?: unknown): FooterTemplate[] {
  const out: FooterTemplate[] = [];
  const seen = new Set<string>();
  const list = [...defaults, ...(Array.isArray(extra) ? (extra as FooterTemplate[]) : [])];
  for (const item of list) {
    if (!item || (!item.line1 && !item.line2 && !item.line3)) continue;
    const template = {
      line1: String(item.line1 || '').trim(),
      line2: String(item.line2 || '').trim(),
      line3: String(item.line3 || '').trim(),
    };
    const key = footerKey(template);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(template);
  }
  return out;
}

export function getTodayFormatted(settings: AppSettings = DEFAULT_SETTINGS) {
  return formatDate(new Date(), settings.dateFormat);
}

export async function loadSettings(storage: {
  getItem: (k: string) => Promise<string | null>;
}): Promise<AppSettings> {
  if (cachedSettings) return cachedSettings;
  try {
    const raw = await storage.getItem(SETTINGS_KEY);
    if (!raw) {
      cachedSettings = { ...DEFAULT_SETTINGS };
      return cachedSettings;
    }
    const parsed = JSON.parse(raw);
    const merged: AppSettings = {
      ...DEFAULT_SETTINGS,
      ...parsed,
      header: { ...DEFAULT_SETTINGS.header, ...parsed.header },
      footer: { ...DEFAULT_SETTINGS.footer, ...parsed.footer },
      customSections: Array.isArray(parsed.customSections) ? parsed.customSections : [],
      brandOrder: Array.isArray(parsed.brandOrder) ? parsed.brandOrder : [],
      favoriteBrands: Array.isArray(parsed.favoriteBrands) ? parsed.favoriteBrands : [],
      titleTemplates: mergeUniqueStrings(DEFAULT_TITLE_TEMPLATES, parsed.titleTemplates),
      validityTemplates: mergeUniqueStrings(DEFAULT_VALIDITY_TEMPLATES, parsed.validityTemplates),
      footerTemplates: mergeFooterTemplates(DEFAULT_FOOTER_TEMPLATES, parsed.footerTemplates),
    };
    cachedSettings = merged;
    return cachedSettings;
  } catch {
    cachedSettings = { ...DEFAULT_SETTINGS };
    return cachedSettings;
  }
}

export async function saveSettings(
  storage: { setItem: (k: string, v: string) => Promise<void> },
  patch: Partial<AppSettings>,
) {
  const current = cachedSettings || { ...DEFAULT_SETTINGS };
  cachedSettings = {
    ...current,
    ...patch,
    header: { ...current.header, ...patch.header },
    footer: { ...current.footer, ...patch.footer },
    titleTemplates: patch.titleTemplates || current.titleTemplates,
    validityTemplates: patch.validityTemplates || current.validityTemplates,
    footerTemplates: patch.footerTemplates || current.footerTemplates,
  };
  await storage.setItem(SETTINGS_KEY, JSON.stringify(cachedSettings));
  return cachedSettings;
}

export function invalidateSettingsCache() {
  cachedSettings = null;
}

export function addTitleTemplate(settings: AppSettings, title: string): AppSettings | null {
  const trimmed = title.trim();
  if (!trimmed) return null;
  if (settings.titleTemplates.some((t) => t.toLowerCase() === trimmed.toLowerCase())) return null;
  return { ...settings, titleTemplates: [...settings.titleTemplates, trimmed] };
}

export function addValidityTemplate(settings: AppSettings, validity: string): AppSettings | null {
  const trimmed = validity.trim();
  if (!trimmed) return null;
  if (settings.validityTemplates.some((t) => t.toLowerCase() === trimmed.toLowerCase())) return null;
  return { ...settings, validityTemplates: [...settings.validityTemplates, trimmed] };
}

export function addFooterTemplate(settings: AppSettings, footer: FooterTemplate): AppSettings | null {
  const template = {
    line1: footer.line1.trim(),
    line2: footer.line2.trim(),
    line3: footer.line3.trim(),
  };
  if (!template.line1 && !template.line2 && !template.line3) return null;
  if (settings.footerTemplates.some((t) => footerKey(t) === footerKey(template))) return null;
  return { ...settings, footerTemplates: [...settings.footerTemplates, template] };
}

export function toggleFavoriteBrand(settings: AppSettings, brand: string): AppSettings {
  const favorites = [...settings.favoriteBrands];
  const idx = favorites.indexOf(brand);
  if (idx >= 0) favorites.splice(idx, 1);
  else favorites.push(brand);
  return { ...settings, favoriteBrands: favorites };
}

export function toggleBrandCollapsed(settings: AppSettings, brand: string): AppSettings {
  const collapsed = { ...settings.collapsedBrands };
  collapsed[brand] = !collapsed[brand];
  return { ...settings, collapsedBrands: collapsed };
}

export function toggleSectionCollapsed(settings: AppSettings, sectionId: string): AppSettings {
  const collapsed = { ...settings.collapsedSections };
  collapsed[sectionId] = !collapsed[sectionId];
  return { ...settings, collapsedSections: collapsed };
}

export function addCustomSection(settings: AppSettings, title: string, id: string): AppSettings {
  const customSections = [...settings.customSections, { id, title }];
  const sectionOrder = [...settings.sectionOrder, id];
  return { ...settings, customSections, sectionOrder };
}

export function deleteCustomSection(settings: AppSettings, id: string): AppSettings {
  return {
    ...settings,
    customSections: settings.customSections.filter((s) => s.id !== id),
    sectionOrder: settings.sectionOrder.filter((sid) => sid !== id),
  };
}

export function updateBrandOrder(settings: AppSettings, order: string[]): AppSettings {
  return { ...settings, brandOrder: order };
}
