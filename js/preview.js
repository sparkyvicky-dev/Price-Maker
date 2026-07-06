/**
 * WhatsApp preview message generation
 */

import { loadSettings, getTodayFormatted } from './settings.js';
import { formatProductCopyLine, sortProducts, groupByBrand, showToast } from './utils.js';

const HEADER_EMOJIS = {
  storeName: '📱',
  location: '📍',
  dateTitle: '📅',
  validity: '⏳'
};

const BRAND_EMOJIS = {
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
  LG: '📺'
};

function bold(text) {
  return `*${String(text).trim()}*`;
}

function brandHeading(brand) {
  const emoji = BRAND_EMOJIS[brand] || '📲';
  return bold(`${emoji} ${brand}`);
}

export function getHeaderData() {
  const s = loadSettings();
  const dateEl = document.getElementById('header-date');
  return {
    storeName: document.getElementById('header-store-name')?.textContent?.trim() || s.storeName,
    location: document.getElementById('header-location')?.textContent?.trim() || s.location,
    date: dateEl?.textContent?.trim() || getTodayFormatted(),
    title: document.getElementById('edit-title')?.value || s.header.title,
    validity: document.getElementById('edit-validity')?.value || s.header.validity
  };
}

export function getFooterData() {
  const s = loadSettings();
  return {
    line1: document.getElementById('edit-footer-1')?.value || s.footer.line1,
    line2: document.getElementById('edit-footer-2')?.value || s.footer.line2,
    line3: document.getElementById('edit-footer-3')?.value || s.footer.line3
  };
}

export function buildHeaderText(header = null) {
  const h = header || getHeaderData();
  return [
    bold(`${HEADER_EMOJIS.storeName} ${h.storeName}`),
    bold(`${HEADER_EMOJIS.location} ${h.location}`),
    bold(`${HEADER_EMOJIS.dateTitle} ${h.date} ${h.title}`),
    bold(`${HEADER_EMOJIS.validity} ${h.validity}`)
  ].filter(Boolean).join('\n');
}

export function buildFooterText(footer = null) {
  const f = footer || getFooterData();
  return [f.line1, f.line2, f.line3].filter(Boolean).join('\n');
}

function appendBrandProducts(lines, brand, brandProducts, currency) {
  if (!brandProducts.length) return false;

  lines.push(brandHeading(brand));
  for (const p of sortProducts(brandProducts)) {
    lines.push(formatProductCopyLine(p, currency));
  }
  return true;
}

export function buildBrandMessage(brand, products, options = {}) {
  const s = loadSettings();
  const currency = options.currency || s.currency;
  const header = options.header || getHeaderData();
  const footer = options.footer || getFooterData();
  const includeHeader = options.includeHeader !== false;
  const includeFooter = options.includeFooter !== false;
  const list = options.productList || products.filter(p => p.brand === brand);

  if (!list.length) return '';

  const lines = [];
  if (includeHeader) lines.push(buildHeaderText(header), '');

  if (!appendBrandProducts(lines, brand, list, currency)) return '';

  if (includeFooter) {
    lines.push('');
    lines.push(buildFooterText(footer));
  }

  return lines.join('\n');
}

export function buildProductsMessage(productList, options = {}) {
  const s = loadSettings();
  const currency = options.currency || s.currency;
  const header = options.header || getHeaderData();
  const footer = options.footer || getFooterData();
  const brandOrder = options.brandOrder || s.brandOrder;
  const includeHeader = options.includeHeader !== false;
  const includeFooter = options.includeFooter !== false;

  if (!productList.length) return '';

  const groups = groupByBrand(productList, brandOrder);
  const lines = [];

  if (includeHeader) lines.push(buildHeaderText(header), '');

  let brandsAdded = 0;
  for (const { brand, products: brandProducts } of groups) {
    if (appendBrandProducts(lines, brand, brandProducts, currency)) {
      lines.push('');
      brandsAdded++;
    }
  }

  if (!brandsAdded) return '';

  if (lines.length && lines[lines.length - 1] === '') lines.pop();

  if (includeFooter) {
    lines.push('', buildFooterText(footer));
  }

  return lines.join('\n');
}

export function buildFullMessage(products, options = {}) {
  return buildProductsMessage(products, {
    includeHeader: true,
    includeFooter: true,
    ...options
  });
}

export function buildSelectedMessage(products, selectedIds, options = {}) {
  const selected = products.filter(p => selectedIds.has(p.id));
  if (!selected.length) return '';

  return buildProductsMessage(selected, {
    includeHeader: options.includeHeader !== false,
    includeFooter: options.includeFooter !== false,
    ...options
  });
}

export function previewSelected(products, selectedIds, options = {}) {
  if (!selectedIds?.size) {
    showToast('Tick at least one model to preview', 'warning');
    return;
  }
  const text = buildSelectedMessage(products, selectedIds, {
    includeHeader: false,
    includeFooter: false,
    ...options
  });
  showPreviewModal(text, `Preview Selected (${selectedIds.size})`);
}

export function showPreviewModal(content, title = 'WhatsApp Preview') {
  const text = typeof content === 'string' ? content : '';
  const modal = document.getElementById('preview-modal');
  const previewContent = document.getElementById('preview-content');
  const modalTitle = document.getElementById('preview-modal-title');
  const waLink = document.getElementById('btn-whatsapp-link');

  if (!modal) return;

  if (!text.trim()) {
    showToast('Nothing to preview', 'warning');
    return;
  }

  if (modalTitle) modalTitle.textContent = title;
  if (previewContent) previewContent.textContent = text;
  modal.dataset.previewText = text;

  const s = loadSettings();
  if (waLink) {
    if (s.whatsapp) {
      const phone = s.whatsapp.replace(/\D/g, '');
      waLink.href = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
    } else {
      waLink.href = `https://wa.me/?text=${encodeURIComponent(text)}`;
    }
    waLink.classList.remove('hidden');
  }

  if (typeof modal.showModal === 'function') {
    modal.showModal();
  } else {
    modal.setAttribute('open', 'open');
  }
}
