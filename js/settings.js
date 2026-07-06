/**
 * Settings management via LocalStorage
 */

import { formatDate } from './utils.js';

const SETTINGS_KEY = 'sparky_settings';

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
  collapsedBrands: {},
  autosaveEnabled: true
};

let settingsCache = null;

export function loadSettings() {
  if (settingsCache) return settingsCache;
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    settingsCache = stored ? { ...DEFAULT_SETTINGS, ...JSON.parse(stored) } : { ...DEFAULT_SETTINGS };
  } catch {
    settingsCache = { ...DEFAULT_SETTINGS };
  }
  return settingsCache;
}

export function saveSettings(updates) {
  const current = loadSettings();
  settingsCache = { ...current, ...updates };
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
}

export { DEFAULT_SETTINGS };
