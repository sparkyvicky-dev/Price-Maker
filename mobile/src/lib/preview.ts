import type { AppSettings, HeaderData, Product } from '../types';
import {
  formatProductCopyLine,
  groupProductsForDisplay,
  sortProducts,
} from './utils';

const HEADER_EMOJIS = {
  storeName: '📱',
  location: '📍',
  dateTitle: '📅',
  validity: '⏳',
};

const BRAND_EMOJIS: Record<string, string> = {
  Apple: '🍎',
  Samsung: '📱',
  Vivo: '🔵',
  Oppo: '🟢',
  Realme: '🟡',
  OnePlus: '🔴',
  Motorola: '🟣',
  Nothing: '⬛',
  Xiaomi: '🟠',
  Redmi: '🟠',
  Poco: '🟠',
  Google: '🔍',
  IQOO: '⚡',
  Honor: '💠',
  Television: '📺',
  Sony: '🎮',
  LG: '📺',
};

function bold(text: string) {
  return `*${String(text).trim()}*`;
}

function brandHeading(brand: string) {
  const emoji = BRAND_EMOJIS[brand] || '📲';
  return bold(`${emoji} ${brand}`);
}

function sectionHeading(title: string) {
  return bold(`📋 ${title}`);
}

export function buildHeaderText(header: HeaderData) {
  return [
    bold(`${HEADER_EMOJIS.storeName} ${header.storeName}`),
    bold(`${HEADER_EMOJIS.location} ${header.location}`),
    bold(`${HEADER_EMOJIS.dateTitle} ${header.date} ${header.title}`),
    bold(`${HEADER_EMOJIS.validity} ${header.validity}`),
  ]
    .filter(Boolean)
    .join('\n');
}

export function buildFooterText(footer: AppSettings['footer']) {
  return [footer.line1, footer.line2, footer.line3].filter(Boolean).join('\n');
}

export function getHeaderFromSettings(settings: AppSettings, date: string): HeaderData {
  return {
    storeName: settings.storeName,
    location: settings.location,
    date,
    title: settings.header.title,
    validity: settings.header.validity,
  };
}

function appendGroupProducts(
  lines: string[],
  group: { title: string; products: Product[]; isCustom: boolean },
  currency: string,
) {
  if (!group.products?.length) return false;
  lines.push(group.isCustom ? sectionHeading(group.title) : brandHeading(group.title));
  for (const p of sortProducts(group.products)) {
    lines.push(formatProductCopyLine(p, currency));
  }
  return true;
}

export function buildBrandMessage(
  brand: string,
  products: Product[],
  settings: AppSettings,
  options: {
    date: string;
    includeHeader?: boolean;
    includeFooter?: boolean;
    productList?: Product[];
  },
) {
  const currency = settings.currency;
  const header = getHeaderFromSettings(settings, options.date);
  const includeHeader = options.includeHeader !== false;
  const includeFooter = options.includeFooter !== false;
  const list = options.productList || products.filter((p) => p.brand === brand && !p.sectionId);
  if (!list.length) return '';

  const lines: string[] = [];
  if (includeHeader) lines.push(buildHeaderText(header), '');
  if (!appendGroupProducts(lines, { title: brand, products: list, isCustom: false }, currency)) return '';
  if (includeFooter) {
    lines.push('', buildFooterText(settings.footer));
  }
  return lines.join('\n');
}

export function buildSectionMessage(
  sectionId: string,
  products: Product[],
  settings: AppSettings,
  options: { date: string; includeHeader?: boolean; includeFooter?: boolean } = { date: '' },
) {
  const section = settings.customSections.find((s) => s.id === sectionId);
  if (!section) return '';
  const list = products.filter((p) => p.sectionId === sectionId);
  return buildProductsMessage(list, settings, options);
}

export function buildProductsMessage(
  productList: Product[],
  settings: AppSettings,
  options: {
    date: string;
    includeHeader?: boolean;
    includeFooter?: boolean;
  },
) {
  const currency = settings.currency;
  const header = getHeaderFromSettings(settings, options.date);
  const includeHeader = options.includeHeader !== false;
  const includeFooter = options.includeFooter !== false;
  if (!productList.length) return '';

  const groups = groupProductsForDisplay(productList, settings);
  const lines: string[] = [];
  if (includeHeader) lines.push(buildHeaderText(header), '');

  let groupsAdded = 0;
  for (const group of groups) {
    if (appendGroupProducts(lines, group, currency)) {
      lines.push('');
      groupsAdded++;
    }
  }
  if (!groupsAdded) return '';
  if (lines.length && lines[lines.length - 1] === '') lines.pop();
  if (includeFooter) lines.push('', buildFooterText(settings.footer));
  return lines.join('\n');
}

export function buildFullMessage(products: Product[], settings: AppSettings, date: string) {
  return buildProductsMessage(products, settings, { date, includeHeader: true, includeFooter: true });
}

export function buildSelectedMessage(
  products: Product[],
  selectedIds: Set<string>,
  settings: AppSettings,
  date: string,
  options: { includeHeader?: boolean; includeFooter?: boolean } = {},
) {
  const selected = products.filter((p) => selectedIds.has(p.id));
  if (!selected.length) return '';
  return buildProductsMessage(selected, settings, { date, ...options });
}

export function buildCustomGroupMessage(
  group: { title: string; products: Product[]; isCustom: boolean },
  settings: AppSettings,
  date: string,
  includeHeader = false,
  includeFooter = false,
) {
  if (!group.products.length) return '';
  const lines: string[] = [];
  if (includeHeader) lines.push(buildHeaderText(getHeaderFromSettings(settings, date)), '');
  appendGroupProducts(lines, group, settings.currency);
  if (includeFooter) lines.push('', buildFooterText(settings.footer));
  return lines.join('\n');
}
