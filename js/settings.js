/**
 * Settings management via LocalStorage
 */

import { formatDate, escapeHtml } from './utils.js';

const SETTINGS_KEY = 'sparky_settings';

export const DEFAULT_TITLE_TEMPLATES = [
  'Price List',
  'Daily Mobile Price List',
  'Dealer Price Sheet',
  'Wholesale Rate List',
  'Today Special Offers'
];

export const DEFAULT_VALIDITY_TEMPLATES = [
  'Valid For Today Only',
  'Valid Till Stock Lasts',
  'Prices Subject to Change',
  'One Day Only Offer',
  'Valid Until 6 PM Today'
];

export const DEFAULT_FOOTER_TEMPLATES = [
  {
    line1: 'No DOA Support',
    line2: 'Payment Always Prepaid',
    line3: 'Call or WhatsApp for Orders'
  },
  {
    line1: 'No Return No Exchange',
    line2: '100% Advance Payment',
    line3: 'WhatsApp for Orders'
  },
  {
    line1: 'GST Extra If Applicable',
    line2: 'Delivery Charges Extra',
    line3: 'Contact for Bulk Orders'
  },
  {
    line1: 'Warranty As Per Company',
    line2: 'No Credit',
    line3: 'Shop Timings 10 AM - 9 PM'
  },
  {
    line1: 'All Prices Ex-Shop',
    line2: 'Minimum Order May Apply',
    line3: 'Thank You For Your Business'
  }
];

const DEFAULT_SETTINGS = {
  theme: 'dark',
  currency: '₹',
  dateFormat: 'dd/mm/yyyy',
  storeName: 'Sparky Mobiles',
  location: 'Kumbakonam',
  logo: null,
  whatsapp: '',
  alertThreshold: 0,
  favoriteBrands: [],
  brandOrder: [],
  header: {
    title: 'Price List',
    validity: 'Valid For Today Only'
  },
  footer: {
    line1: 'No DOA Support',
    line2: 'Payment Always Prepaid',
    line3: 'Call or WhatsApp for Orders'
  },
  titleTemplates: [...DEFAULT_TITLE_TEMPLATES],
  validityTemplates: [...DEFAULT_VALIDITY_TEMPLATES],
  footerTemplates: DEFAULT_FOOTER_TEMPLATES.map(t => ({ ...t })),
  customSections: [],
  sectionOrder: [],
  collapsedSections: {},
  collapsedBrands: {},
  autosaveEnabled: true
};

let settingsCache = null;

function mergeUniqueStrings(defaults, stored) {
  const merged = [...defaults];
  for (const item of stored || []) {
    const text = String(item || '').trim();
    if (!text) continue;
    if (!merged.some(v => v.toLowerCase() === text.toLowerCase())) merged.push(text);
  }
  return merged;
}

function footerKey(footer) {
  return [footer.line1, footer.line2, footer.line3].map(v => String(v || '').trim().toLowerCase()).join('|');
}

function mergeFooterTemplates(defaults, stored) {
  const merged = defaults.map(t => ({ ...t }));
  for (const item of stored || []) {
    if (!item) continue;
    const footer = {
      line1: String(item.line1 || '').trim(),
      line2: String(item.line2 || '').trim(),
      line3: String(item.line3 || '').trim()
    };
    if (!footer.line1 && !footer.line2 && !footer.line3) continue;
    if (!merged.some(t => footerKey(t) === footerKey(footer))) merged.push(footer);
  }
  return merged;
}

function normalizeSettings(raw) {
  const settings = { ...DEFAULT_SETTINGS, ...raw };
  settings.header = { ...DEFAULT_SETTINGS.header, ...(raw?.header || {}) };
  settings.footer = { ...DEFAULT_SETTINGS.footer, ...(raw?.footer || {}) };
  settings.titleTemplates = mergeUniqueStrings(DEFAULT_TITLE_TEMPLATES, raw?.titleTemplates);
  settings.validityTemplates = mergeUniqueStrings(DEFAULT_VALIDITY_TEMPLATES, raw?.validityTemplates);
  settings.footerTemplates = mergeFooterTemplates(
    DEFAULT_FOOTER_TEMPLATES.map(t => ({ ...t })),
    raw?.footerTemplates
  );
  settings.customSections = Array.isArray(raw?.customSections) ? raw.customSections : [];
  settings.sectionOrder = Array.isArray(raw?.sectionOrder) ? raw.sectionOrder : [];
  settings.collapsedSections = raw?.collapsedSections || {};
  return settings;
}

export function loadSettings() {
  if (settingsCache) return settingsCache;
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    settingsCache = stored ? normalizeSettings(JSON.parse(stored)) : normalizeSettings({});
  } catch {
    settingsCache = normalizeSettings({});
  }
  return settingsCache;
}

export function saveSettings(updates) {
  const current = loadSettings();
  settingsCache = normalizeSettings({ ...current, ...updates });
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settingsCache));
  } catch (e) {
    throw new Error('Could not save settings. Storage may be full.');
  }
  return settingsCache;
}

export function getSetting(key) {
  return loadSettings()[key];
}

export function applyTheme(theme) {
  const resolved = theme === 'auto'
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : theme;
  document.documentElement.setAttribute('data-theme', resolved);
  return resolved;
}

export function initTheme() {
  const settings = loadSettings();
  applyTheme(settings.theme);
  if (settings.theme === 'auto') {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => applyTheme('auto'));
  }
}

export function getTodayFormatted() {
  return formatDate(new Date(), loadSettings().dateFormat);
}

export function toggleFavoriteBrand(brand) {
  const favorites = [...loadSettings().favoriteBrands];
  const idx = favorites.indexOf(brand);
  if (idx >= 0) favorites.splice(idx, 1);
  else favorites.push(brand);
  saveSettings({ favoriteBrands: favorites });
  return favorites;
}

export function updateBrandOrder(order) {
  saveSettings({ brandOrder: order });
}

export function toggleBrandCollapsed(brand) {
  const collapsed = { ...loadSettings().collapsedBrands };
  collapsed[brand] = !collapsed[brand];
  saveSettings({ collapsedBrands: collapsed });
  return collapsed[brand];
}

export function footerTemplateLabel(footer) {
  const preview = [footer.line1, footer.line2, footer.line3].filter(Boolean).join(' · ');
  if (!preview) return 'Empty footer';
  return preview.length > 72 ? `${preview.slice(0, 69)}...` : preview;
}

export function populateTemplateDropdowns() {
  const s = loadSettings();
  populateStringTemplateSelect('title-template-select', s.titleTemplates, document.getElementById('edit-title')?.value);
  populateStringTemplateSelect('validity-template-select', s.validityTemplates, document.getElementById('edit-validity')?.value);

  const footerSelect = document.getElementById('footer-template-select');
  if (footerSelect) {
    const current = {
      line1: document.getElementById('edit-footer-1')?.value || '',
      line2: document.getElementById('edit-footer-2')?.value || '',
      line3: document.getElementById('edit-footer-3')?.value || ''
    };
    const currentKey = footerKey(current);
    footerSelect.innerHTML = '<option value="">— Footer Templates —</option>' +
      s.footerTemplates.map((template, index) => {
        const selected = footerKey(template) === currentKey ? ' selected' : '';
        return `<option value="${index}"${selected}>${escapeHtml(footerTemplateLabel(template))}</option>`;
      }).join('');
  }
}

function populateStringTemplateSelect(id, templates, currentValue = '') {
  const select = document.getElementById(id);
  if (!select) return;
  const placeholder = id.includes('title') ? '— Title Templates —' : '— Validity Templates —';
  select.innerHTML = `<option value="">${placeholder}</option>` +
    templates.map(template => {
      const selected = template === currentValue ? ' selected' : '';
      return `<option value="${escapeHtml(template)}"${selected}>${escapeHtml(template)}</option>`;
    }).join('');
}

export function addTitleTemplate(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed) return { ok: false, message: 'Enter a title first' };
  const templates = [...loadSettings().titleTemplates];
  if (templates.some(t => t.toLowerCase() === trimmed.toLowerCase())) {
    return { ok: false, message: 'This title template already exists' };
  }
  templates.push(trimmed);
  saveSettings({ titleTemplates: templates });
  return { ok: true, message: 'Title template saved' };
}

export function addValidityTemplate(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed) return { ok: false, message: 'Enter a validity text first' };
  const templates = [...loadSettings().validityTemplates];
  if (templates.some(t => t.toLowerCase() === trimmed.toLowerCase())) {
    return { ok: false, message: 'This validity template already exists' };
  }
  templates.push(trimmed);
  saveSettings({ validityTemplates: templates });
  return { ok: true, message: 'Validity template saved' };
}

export function addFooterTemplate(footer) {
  const template = {
    line1: String(footer?.line1 || '').trim(),
    line2: String(footer?.line2 || '').trim(),
    line3: String(footer?.line3 || '').trim()
  };
  if (!template.line1 && !template.line2 && !template.line3) {
    return { ok: false, message: 'Enter at least one footer line first' };
  }
  const templates = [...loadSettings().footerTemplates];
  if (templates.some(t => footerKey(t) === footerKey(template))) {
    return { ok: false, message: 'This footer template already exists' };
  }
  templates.push(template);
  saveSettings({ footerTemplates: templates });
  return { ok: true, message: 'Footer template saved' };
}

export function applyFooterTemplate(index) {
  const template = loadSettings().footerTemplates[index];
  if (!template) return;
  const set = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val || '';
  };
  set('edit-footer-1', template.line1);
  set('edit-footer-2', template.line2);
  set('edit-footer-3', template.line3);
  saveHeaderFooterFromUI();
}

export function initTemplateControls(onChange) {
  document.getElementById('title-template-select')?.addEventListener('change', (e) => {
    if (!e.target.value) return;
    const input = document.getElementById('edit-title');
    if (input) input.value = e.target.value;
    saveHeaderFooterFromUI();
    populateTemplateDropdowns();
    onChange?.();
  });

  document.getElementById('validity-template-select')?.addEventListener('change', (e) => {
    if (!e.target.value) return;
    const input = document.getElementById('edit-validity');
    if (input) input.value = e.target.value;
    saveHeaderFooterFromUI();
    populateTemplateDropdowns();
    onChange?.();
  });

  document.getElementById('footer-template-select')?.addEventListener('change', (e) => {
    if (e.target.value === '') return;
    applyFooterTemplate(Number(e.target.value));
    populateTemplateDropdowns();
    onChange?.();
  });

  document.getElementById('btn-add-title-template')?.addEventListener('click', () => {
    const result = addTitleTemplate(document.getElementById('edit-title')?.value);
    if (result.ok) {
      populateTemplateDropdowns();
      onChange?.('success', result.message);
    } else {
      onChange?.('warning', result.message);
    }
  });

  document.getElementById('btn-add-validity-template')?.addEventListener('click', () => {
    const result = addValidityTemplate(document.getElementById('edit-validity')?.value);
    if (result.ok) {
      populateTemplateDropdowns();
      onChange?.('success', result.message);
    } else {
      onChange?.('warning', result.message);
    }
  });

  document.getElementById('btn-add-footer-template')?.addEventListener('click', () => {
    const result = addFooterTemplate({
      line1: document.getElementById('edit-footer-1')?.value,
      line2: document.getElementById('edit-footer-2')?.value,
      line3: document.getElementById('edit-footer-3')?.value
    });
    if (result.ok) {
      populateTemplateDropdowns();
      onChange?.('success', result.message);
    } else {
      onChange?.('warning', result.message);
    }
  });
}

export function populateSettingsForm() {
  const s = loadSettings();
  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val ?? '';
  };
  setVal('setting-theme', s.theme);
  setVal('setting-currency', s.currency);
  setVal('setting-date-format', s.dateFormat);
  setVal('setting-store-name', s.storeName);
  setVal('setting-location', s.location);
  setVal('setting-whatsapp', s.whatsapp);
  setVal('setting-alert-threshold', s.alertThreshold || '');
  const logoPreview = document.getElementById('setting-logo-preview');
  if (logoPreview && s.logo) {
    logoPreview.src = s.logo;
    logoPreview.classList.remove('hidden');
  }
}

export function readSettingsForm() {
  const getVal = (id) => document.getElementById(id)?.value ?? '';
  return {
    theme: getVal('setting-theme'),
    currency: getVal('setting-currency'),
    dateFormat: getVal('setting-date-format'),
    storeName: getVal('setting-store-name'),
    location: getVal('setting-location'),
    whatsapp: getVal('setting-whatsapp'),
    alertThreshold: parseInt(getVal('setting-alert-threshold'), 10) || 0
  };
}

export function syncHeaderFooterToUI() {
  const s = loadSettings();
  const set = (id, val, prop = 'textContent') => {
    const el = document.getElementById(id);
    if (el) el[prop] = val;
  };
  set('header-store-name', s.storeName);
  set('header-location', s.location);
  set('header-date', getTodayFormatted());
  set('edit-title', s.header.title, 'value');
  set('edit-validity', s.header.validity, 'value');
  set('edit-footer-1', s.footer.line1, 'value');
  set('edit-footer-2', s.footer.line2, 'value');
  set('edit-footer-3', s.footer.line3, 'value');
  populateTemplateDropdowns();
  const logo = document.getElementById('store-logo');
  if (logo && s.logo) {
    logo.src = s.logo;
    logo.classList.remove('hidden');
  }
}

export function saveHeaderFooterFromUI() {
  const s = loadSettings();
  saveSettings({
    storeName: document.getElementById('header-store-name')?.textContent?.trim() || s.storeName,
    location: document.getElementById('header-location')?.textContent?.trim() || s.location,
    header: {
      title: document.getElementById('edit-title')?.value || s.header.title,
      validity: document.getElementById('edit-validity')?.value || s.header.validity
    },
    footer: {
      line1: document.getElementById('edit-footer-1')?.value || s.footer.line1,
      line2: document.getElementById('edit-footer-2')?.value || s.footer.line2,
      line3: document.getElementById('edit-footer-3')?.value || s.footer.line3
    }
  });
  populateTemplateDropdowns();
}

export function addCustomSection(title = 'New Heading') {
  const s = loadSettings();
  const section = {
    id: `sec-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: String(title || 'New Heading').trim() || 'New Heading'
  };
  const customSections = [...s.customSections, section];
  const sectionOrder = [...s.sectionOrder, section.id];
  saveSettings({ customSections, sectionOrder });
  return section;
}

export function updateCustomSectionTitle(id, title) {
  const trimmed = String(title || '').trim();
  if (!trimmed) return false;
  const s = loadSettings();
  const customSections = s.customSections.map(sec =>
    sec.id === id ? { ...sec, title: trimmed } : sec
  );
  saveSettings({ customSections });
  return true;
}

export function deleteCustomSection(id) {
  const s = loadSettings();
  saveSettings({
    customSections: s.customSections.filter(sec => sec.id !== id),
    sectionOrder: s.sectionOrder.filter(secId => secId !== id),
    collapsedSections: Object.fromEntries(
      Object.entries(s.collapsedSections || {}).filter(([key]) => key !== id)
    )
  });
}

export function updateSectionOrder(order) {
  saveSettings({ sectionOrder: order });
}

export function toggleSectionCollapsed(id) {
  const collapsed = { ...loadSettings().collapsedSections };
  collapsed[id] = !collapsed[id];
  saveSettings({ collapsedSections: collapsed });
  return collapsed[id];
}

export function getCustomSection(id) {
  return loadSettings().customSections.find(sec => sec.id === id) || null;
}

export { DEFAULT_SETTINGS };
