/**
 * Sparky Mobiles Price Manager - Main Application
 */

import {
  debounce, generateId, groupByBrand, groupProductsForDisplay, sortProducts, productDisplayName,
  formatPrice, parsePrice, parseProductDisplayEdit, showToast, showLoading, escapeHtml, getVisibleSlice, todayKey, hasProductPrice
} from './utils.js';

import {
  openDB, getAllProducts, saveAllProducts, updateProduct, deleteProduct, saveSnapshot,
  getHistoryCount, setMeta, getMeta, getYesterdaySnapshot, getSnapshotsByDate,
  getAllSnapshots, resetDatabase
} from './db.js';

import {
  loadSettings, saveSettings, initTheme, syncHeaderFooterToUI,
  saveHeaderFooterFromUI, toggleFavoriteBrand, updateBrandOrder,
  toggleBrandCollapsed, populateSettingsForm, readSettingsForm, applyTheme, getTodayFormatted,
  initTemplateControls, addCustomSection, updateCustomSectionTitle, deleteCustomSection,
  toggleSectionCollapsed, updateSectionOrder
} from './settings.js';

import { parseExcelFile } from './excel.js';
import { parsePdfFile } from './pdf.js';
import { buildBrandMessage, buildFullMessage, showPreviewModal, previewSelected } from './preview.js';
import { copyBrand, copyFullList, copyToClipboard, copySelected } from './clipboard.js';
import { renderHistoryList, initHistorySearch, populateCompareDates, showSnapshotDetail } from './history.js';
import { runComparison, searchModelHistory } from './compare.js';
import { exportCurrentExcel, exportCurrentPdf, exportCurrentJson, printPriceList } from './export.js';
import { importJsonFile } from './import.js';

const ITEM_HEIGHT = 40;
const VIRTUAL_THRESHOLD = 50;

let products = [];
let undoStack = [];
let recentlyEdited = [];
let selectedProducts = new Set();
let currentFilter = 'all';
let searchQuery = '';
let autosaveTimer = null;
let calendarMonth = new Date().getMonth();
let calendarYear = new Date().getFullYear();
let activePriceEditor = null;

const UNDO_STORAGE_KEY = 'sparky_price_undo';
const PRICE_PERSIST_DELAY_MS = 300;

function persistUndoStack() {
  try {
    sessionStorage.setItem(UNDO_STORAGE_KEY, JSON.stringify(undoStack));
  } catch { /* quota / private mode */ }
}

function loadUndoStack() {
  try {
    const raw = sessionStorage.getItem(UNDO_STORAGE_KEY);
    undoStack = raw ? JSON.parse(raw) : [];
  } catch {
    undoStack = [];
  }
}

const app = {
  async init() {
    showLoading(true, 'Initializing...');
    try {
      await openDB();
      initTheme();
      products = await getAllProducts();

      const yesterday = await getYesterdaySnapshot();
      if (yesterday) {
        applyYesterdayPrices(yesterday.products || []);
      }

      loadUndoStack();

      syncHeaderFooterToUI();
      this.bindEvents();
      initTemplateControls((type, message) => {
        if (type && message) showToast(message, type);
      });
      this.initNetworkStatus();
      this.initKeyboardShortcuts();
      this.startAutosave();
      this.bindPageLifecycle();
      await this.refreshDashboard();
      populateSettingsForm();
      showLoading(false);
    } catch (err) {
      showLoading(false);
      showToast('Failed to initialize: ' + err.message, 'error');
      console.error(err);
    }
  },

  bindEvents() {
    document.getElementById('upload-excel')?.addEventListener('change', (e) => this.handleExcelUpload(e));
    document.getElementById('upload-pdf')?.addEventListener('change', (e) => this.handlePdfUpload(e));
    document.getElementById('btn-save-snapshot')?.addEventListener('click', () => this.saveSnapshot());
    document.getElementById('fab-save')?.addEventListener('click', () => this.saveSnapshot());
    document.getElementById('btn-export-pdf')?.addEventListener('click', () => exportCurrentPdf(products));
    document.getElementById('btn-export-excel')?.addEventListener('click', () => exportCurrentExcel(products));
    document.getElementById('btn-export-json')?.addEventListener('click', () => exportCurrentJson());
    document.getElementById('import-json')?.addEventListener('change', (e) => this.handleJsonImport(e));
    document.getElementById('btn-print')?.addEventListener('click', () => printPriceList(products));
    document.getElementById('btn-copy-full')?.addEventListener('click', () => copyFullList(products));
    document.getElementById('btn-copy-selected')?.addEventListener('click', () => copySelected(products, selectedProducts));
    document.getElementById('btn-preview-selected')?.addEventListener('click', () => previewSelected(products, selectedProducts));
    document.getElementById('btn-duplicate-today')?.addEventListener('click', () => this.duplicateList());

    document.getElementById('search-input')?.addEventListener('input', debounce((e) => {
      searchQuery = e.target.value.trim().toLowerCase();
      this.renderBrandCards();
    }, 250));

    document.querySelectorAll('.chip[data-filter]').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('.chip').forEach(c => c.setAttribute('aria-pressed', 'false'));
        chip.setAttribute('aria-pressed', 'true');
        currentFilter = chip.dataset.filter;
        this.renderBrandCards();
      });
    });

    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', () => this.switchView(btn.dataset.view));
    });

    document.getElementById('menu-toggle')?.addEventListener('click', () => {
      this.toggleSidebar();
    });

    document.getElementById('sidebar-overlay')?.addEventListener('click', () => {
      this.closeSidebar();
    });

    this.bindProductNameEdit();

    ['edit-title', 'edit-validity', 'edit-footer-1', 'edit-footer-2', 'edit-footer-3'].forEach(id => {
      document.getElementById(id)?.addEventListener('change', () => saveHeaderFooterFromUI());
    });

    document.querySelectorAll('.editable-header').forEach(el => {
      el.addEventListener('blur', () => saveHeaderFooterFromUI());
    });

    document.getElementById('btn-add-heading')?.addEventListener('click', () => this.openHeadingNameDialog());
    document.getElementById('heading-name-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.submitHeadingNameForm();
    });
    document.getElementById('move-to-section')?.addEventListener('change', (e) => this.moveSelectedToSection(e.target.value));

    document.getElementById('btn-select-all')?.addEventListener('click', () => this.toggleSelectAll());
    document.getElementById('btn-clear-prices')?.addEventListener('click', () => this.clearPrices());
    document.getElementById('btn-undo-price')?.addEventListener('click', () => this.undoLastEdit());
    document.getElementById('btn-bulk-edit')?.addEventListener('click', () => this.openBulkEdit());
    document.getElementById('bulk-edit-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.applyBulkEdit();
    });

    document.getElementById('btn-preview-copy')?.addEventListener('click', () => {
      const text = document.getElementById('preview-modal')?.dataset.previewText || '';
      copyToClipboard(text);
    });

    document.querySelectorAll('[data-close-modal]').forEach(btn => {
      btn.addEventListener('click', () => btn.closest('dialog')?.close());
    });

    document.getElementById('settings-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveSettingsForm();
    });

    document.getElementById('setting-logo')?.addEventListener('change', (e) => this.handleLogoUpload(e));
    document.getElementById('btn-reset-data')?.addEventListener('click', () => this.resetAllData());

    document.getElementById('btn-run-compare')?.addEventListener('click', () => {
      const a = document.getElementById('compare-date-a')?.value;
      const b = document.getElementById('compare-date-b')?.value;
      runComparison(a, b);
    });

    document.getElementById('btn-model-search')?.addEventListener('click', () => {
      const q = document.getElementById('model-search-input')?.value;
      searchModelHistory(q);
    });

    document.getElementById('model-search-input')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') searchModelHistory(e.target.value);
    });

    document.getElementById('cal-prev')?.addEventListener('click', () => {
      calendarMonth--;
      if (calendarMonth < 0) { calendarMonth = 11; calendarYear--; }
      this.renderCalendar();
    });

    document.getElementById('cal-next')?.addEventListener('click', () => {
      calendarMonth++;
      if (calendarMonth > 11) { calendarMonth = 0; calendarYear++; }
      this.renderCalendar();
    });

    initHistorySearch();
  },

  async refreshDashboard() {
    await this.updateStats();
    this.renderBrandCards();
    this.renderRecentlyEdited();
    this.populateBulkBrands();
    this.updateSelectionUI();
    this.updatePriceActionUI();
    this.populateMoveToSectionDropdown();
  },

  updateSelectionUI() {
    const count = selectedProducts.size;
    const copyBtn = document.getElementById('btn-copy-selected');
    const previewBtn = document.getElementById('btn-preview-selected');
    const selectAllBtn = document.getElementById('btn-select-all');

    if (copyBtn) {
      copyBtn.textContent = count ? `✓ Copy Selected (${count})` : '✓ Copy Selected';
      copyBtn.disabled = count === 0;
    }
    if (previewBtn) {
      previewBtn.textContent = count ? `👁 Preview Selected (${count})` : '👁 Preview Selected';
      previewBtn.disabled = count === 0;
    }

    const filtered = this.getFilteredProducts();
    const allSelected = filtered.length > 0 && filtered.every(p => selectedProducts.has(p.id));
    if (selectAllBtn) {
      selectAllBtn.textContent = allSelected ? 'Deselect All' : 'Select All';
      selectAllBtn.setAttribute('aria-label', allSelected ? 'Deselect all visible models' : 'Select all visible models');
      selectAllBtn.disabled = filtered.length === 0;
    }

    this.populateMoveToSectionDropdown();
  },

  populateMoveToSectionDropdown() {
    const select = document.getElementById('move-to-section');
    if (!select) return;
    const s = loadSettings();
    const count = selectedProducts.size;
    select.innerHTML = `<option value="">${count ? `Move Selected (${count}) to…` : 'Move Selected to…'}</option>` +
      `<option value="__brand__">Back to Brand Groups</option>` +
      s.customSections.map(sec => `<option value="${escapeHtml(sec.id)}">${escapeHtml(sec.title)}</option>`).join('');
    select.disabled = count === 0;
  },

  deselectAll() {
    if (!selectedProducts.size) return;
    selectedProducts.clear();
    this.updateSelectionUI();
    this.renderBrandCards();
  },

  toggleSelectAll() {
    const filtered = this.getFilteredProducts();
    if (!filtered.length) return;

    const allSelected = filtered.every(p => selectedProducts.has(p.id));
    for (const p of filtered) {
      if (allSelected) selectedProducts.delete(p.id);
      else selectedProducts.add(p.id);
    }
    this.updateSelectionUI();
    this.renderBrandCards();
  },

  createPriceSnapshot() {
    return products.map(p => ({ id: p.id, oldPrice: p.price }));
  },

  pushPriceUndoSnapshot(snapshot) {
    undoStack = undoStack.filter(entry => entry.kind !== 'prices');
    undoStack.push({ batch: true, items: snapshot, kind: 'prices' });
    persistUndoStack();
    this.updatePriceActionUI();
  },

  pushSinglePriceUndo(entry) {
    undoStack.push({ ...entry, kind: 'prices' });
    persistUndoStack();
    this.updatePriceActionUI();
  },

  flushActivePriceEditor({ awaitDb = false } = {}) {
    const editor = activePriceEditor;
    if (!editor?.input?.isConnected) return Promise.resolve(false);

    if (editor.clearPersistTimer) editor.clearPersistTimer();

    const newPrice = parsePrice(editor.input.value);
    if (newPrice < 0) return Promise.resolve(false);

    editor.product.price = newPrice;
    editor.product.updatedAt = Date.now();
    activePriceEditor = null;

    const write = updateProduct(editor.product);
    if (awaitDb) return write.then(() => true);
    write.catch(err => console.error('Price save failed:', err));
    return Promise.resolve(true);
  },

  bindPageLifecycle() {
    window.addEventListener('pagehide', () => {
      this.flushActivePriceEditor();
    });
  },

  getPriceEditTargets() {
    if (selectedProducts.size > 0) {
      return products.filter(p => selectedProducts.has(p.id));
    }
    return this.getFilteredProducts();
  },

  async clearPrices() {
    const targets = this.getPriceEditTargets().filter(p => p.price > 0);
    if (!targets.length) {
      showToast('No prices to clear', 'info');
      return;
    }

    const snapshot = this.createPriceSnapshot();
    this.pushPriceUndoSnapshot(snapshot);

    for (const p of targets) {
      if (p.previousPrice == null) p.previousPrice = p.price;
      p.price = 0;
      p.updatedAt = Date.now();
    }

    await saveAllProducts(products);
    await this.refreshDashboard();
    showToast(`Cleared ${targets.length} price(s)`, 'success');
  },

  updatePriceActionUI() {
    const undoBtn = document.getElementById('btn-undo-price');
    if (!undoBtn) return;

    const count = undoStack.length;
    undoBtn.disabled = count === 0;
    undoBtn.textContent = count > 1 ? `↩ Undo Price (${count})` : '↩ Undo Price';
  },

  formatPriceLabel(price, currency) {
    return formatPrice(price, currency);
  },

  async updateStats() {
    const brands = new Set(products.map(p => p.brand));
    const historyCount = await getHistoryCount();
    const lastSaved = await getMeta('lastSaved');

    document.getElementById('stat-brands').textContent = brands.size;
    document.getElementById('stat-models').textContent = products.length;
    document.getElementById('stat-history').textContent = historyCount;

    const changes = products.filter(p => p.previousPrice != null && p.previousPrice !== p.price).length;
    document.getElementById('stat-changes').textContent = changes;

    const lastSavedEl = document.getElementById('last-saved-time');
    if (lastSavedEl) {
      lastSavedEl.textContent = lastSaved
        ? `Last saved: ${new Date(lastSaved).toLocaleString()}`
        : 'Not saved yet';
    }
  },

  getFilteredProducts() {
    let filtered = [...products];
    const s = loadSettings();

    if (searchQuery) {
      filtered = filtered.filter(p => {
        const text = `${p.brand} ${p.model} ${p.ram} ${p.storage} ${p.price}`.toLowerCase();
        return text.includes(searchQuery);
      });
    }

    if (currentFilter === 'changed') {
      filtered = filtered.filter(p => p.previousPrice != null && p.previousPrice !== p.price);
    } else if (currentFilter === 'increased') {
      filtered = filtered.filter(p => p.previousPrice != null && p.price > p.previousPrice);
    } else if (currentFilter === 'decreased') {
      filtered = filtered.filter(p => p.previousPrice != null && p.price < p.previousPrice);
    } else if (currentFilter === 'favorites') {
      filtered = filtered.filter(p => s.favoriteBrands.includes(p.brand));
    }

    if (s.alertThreshold > 0) {
      filtered = filtered.filter(p => p.price <= s.alertThreshold);
    }

    return filtered;
  },

  renderBrandCards() {
    this.flushActivePriceEditor();

    const container = document.getElementById('brand-cards');
    const empty = document.getElementById('empty-state');
    if (!container) return;

    const filtered = this.getFilteredProducts();
    const s = loadSettings();
    const hasCustomSections = (s.customSections || []).length > 0;

    if (!products.length && !hasCustomSections) {
      container.innerHTML = '';
      empty?.classList.remove('hidden');
      if (empty) empty.querySelector('p').textContent = '📱 No products yet. Upload an Excel or PDF file to get started.';
      this.populateMoveToSectionDropdown();
      return;
    }

    const groups = groupProductsForDisplay(filtered, s);
    const hasVisibleGroups = groups.some(g => g.products.length > 0 || g.isCustom);

    if (!hasVisibleGroups) {
      container.innerHTML = '';
      empty?.classList.remove('hidden');
      if (empty) empty.querySelector('p').textContent = 'No products match your search.';
      this.populateMoveToSectionDropdown();
      return;
    }

    empty?.classList.add('hidden');

    const customGroups = groups.filter(g => g.isCustom);
    const brandGroups = groups.filter(g => !g.isCustom);
    container.innerHTML = [
      ...brandGroups.map(group => this.renderGroupCard(group, s)),
      ...customGroups.map(group => this.renderGroupCard(group, s)),
      this.renderAddHeadingCard()
    ].join('');

    this.bindBrandCardEvents(container);
    this.bindInlineAddProductRows(container);
    this.initDragReorder(container);
    this.updateSelectionUI();
  },

  renderAddHeadingCard() {
    return `
      <div class="brand-card custom-section-card add-heading-card" role="listitem">
        <div class="brand-card-header">
          <div class="brand-title-row">
            <span class="drag-handle drag-handle-inert" aria-hidden="true">⠿</span>
            <h3 class="section-name add-heading-title">Add Heading</h3>
            <span class="heading-spacer" aria-hidden="true"></span>
          </div>
        </div>
        <div class="brand-products">
          <form class="add-heading-form" aria-label="Add new heading">
            <ul class="product-list" role="list">
              <li class="product-row add-heading-row" role="listitem">
                <span class="add-row-spacer" aria-hidden="true"></span>
                <input type="text" class="inline-heading-name form-input" placeholder="Heading name… e.g. Smart TV, Accessories" aria-label="New heading name">
                <span class="add-row-delete-spacer" aria-hidden="true"></span>
                <div class="add-row-price-col">
                  <button type="submit" class="btn btn-sm btn-primary btn-inline-add-submit">+ Add Heading</button>
                </div>
              </li>
            </ul>
          </form>
        </div>
      </div>`;
  },

  renderInlineAddRow(context) {
    const dataAttrs = context.sectionId
      ? `data-add-section="${escapeHtml(context.sectionId)}"`
      : `data-add-brand="${escapeHtml(context.brand)}"`;

    return `
      <li class="product-row add-product-row" role="listitem" ${dataAttrs}>
        <span class="add-row-spacer" aria-hidden="true"></span>
        <input type="text" class="inline-add-name form-input" placeholder="Add product… e.g. iPhone 15 128GB" aria-label="New product name">
        <span class="add-row-delete-spacer" aria-hidden="true"></span>
        <div class="add-row-price-col">
          <input type="number" class="inline-add-price form-input" placeholder="Price" min="0" step="1" aria-label="New product price">
          <button type="button" class="btn btn-sm btn-primary btn-inline-add-submit">Add</button>
        </div>
      </li>`;
  },

  renderProductListWithAdd(productList, addContext) {
    const s = loadSettings();
    const rows = productList.map(p => this.renderProductRow(p, s)).join('');
    const addRow = this.renderInlineAddRow(addContext);
    return `<ul class="product-list" role="list">${rows}${addRow}</ul>`;
  },

  renderVirtualProductListWithAdd(productList, addContext) {
    const s = loadSettings();
    const visible = productList.slice(0, 100);
    const label = addContext.brand || addContext.sectionId || '';
    const addRow = this.renderInlineAddRow(addContext);
    return `
      <ul class="product-list" role="list" data-total="${productList.length}" data-brand="${escapeHtml(label)}">
        ${visible.map(p => this.renderProductRow(p, s)).join('')}
        ${productList.length > 100 ? `<li class="product-more">... and ${productList.length - 100} more (use search to narrow)</li>` : ''}
        ${addRow}
      </ul>
    `;
  },

  renderGroupCard(group, s) {
    const sorted = sortProducts(group.products);
    const useVirtual = sorted.length > VIRTUAL_THRESHOLD;
    const collapsed = group.collapsed;
    const count = sorted.length;

    if (group.isCustom) {
      const addContext = { sectionId: group.sectionId };
      const listHtml = useVirtual
        ? this.renderVirtualProductListWithAdd(sorted, addContext)
        : this.renderProductListWithAdd(sorted, addContext);

      return `
        <div class="brand-card custom-section-card ${collapsed ? 'collapsed' : ''}" data-section-id="${escapeHtml(group.sectionId)}" role="listitem">
          <div class="brand-card-header">
            <div class="brand-title-row">
              <span class="drag-handle" draggable="true" title="Drag to reorder heading" aria-label="Drag to reorder ${escapeHtml(group.title)}">⠿</span>
              <h3 class="section-name" data-section-title="${escapeHtml(group.sectionId)}" title="Double-click to rename heading">${escapeHtml(group.title)}</h3>
              <span class="brand-count">${count}</span>
              <button class="btn-icon btn-delete-section" data-delete-section="${escapeHtml(group.sectionId)}" aria-label="Delete heading ${escapeHtml(group.title)}" title="Delete heading">🗑</button>
            </div>
            <div class="brand-actions">
              <button class="btn btn-sm btn-secondary btn-select-group" data-group-key="${escapeHtml(group.sectionId)}" data-group-type="section" aria-label="Select all in ${escapeHtml(group.title)}">Select All</button>
              <button class="btn btn-sm btn-secondary btn-add-to-section" data-section-id="${escapeHtml(group.sectionId)}" aria-label="Add selected to ${escapeHtml(group.title)}">Add Selected</button>
              <button class="btn btn-sm btn-secondary" data-preview-section="${escapeHtml(group.sectionId)}" aria-label="Preview ${escapeHtml(group.title)}">Preview</button>
              <button class="btn btn-sm btn-primary" data-copy-section="${escapeHtml(group.sectionId)}" aria-label="Copy ${escapeHtml(group.title)}">Copy</button>
              <button class="btn btn-sm btn-secondary collapse-btn" data-collapse-section="${escapeHtml(group.sectionId)}" aria-label="${collapsed ? 'Expand' : 'Collapse'} ${escapeHtml(group.title)}">${collapsed ? 'Expand' : 'Collapse'}</button>
            </div>
          </div>
          <div class="brand-products ${useVirtual ? 'virtual-scroll' : ''}" ${useVirtual ? 'style="max-height:400px;overflow-y:auto"' : ''}>
            ${listHtml}
          </div>
        </div>
      `;
    }

    const brand = group.brand;
    const isFavorite = s.favoriteBrands.includes(brand);

    return `
      <div class="brand-card ${collapsed ? 'collapsed' : ''}" data-brand="${escapeHtml(brand)}" role="listitem">
        <div class="brand-card-header">
          <div class="brand-title-row">
            <span class="drag-handle" draggable="true" title="Drag to reorder brand" aria-label="Drag to reorder ${escapeHtml(brand)}">⠿</span>
            <h3 class="brand-name">${escapeHtml(brand)}</h3>
            <span class="brand-count">${count}</span>
            <button class="btn-icon favorite-btn ${isFavorite ? 'active' : ''}" data-fav="${escapeHtml(brand)}" aria-label="${isFavorite ? 'Remove from favorites' : 'Add to favorites'}" title="Favorite">★</button>
          </div>
          <div class="brand-actions">
            <button class="btn btn-sm btn-secondary btn-select-group" data-group-key="${escapeHtml(brand)}" data-group-type="brand" aria-label="Select all ${escapeHtml(brand)}">Select All</button>
            <button class="btn btn-sm btn-secondary" data-preview="${escapeHtml(brand)}" aria-label="Preview ${escapeHtml(brand)}">Preview</button>
            <button class="btn btn-sm btn-primary" data-copy="${escapeHtml(brand)}" aria-label="Copy ${escapeHtml(brand)}">Copy ${escapeHtml(brand)}</button>
            <button class="btn btn-sm btn-secondary collapse-btn" data-collapse="${escapeHtml(brand)}" aria-label="${collapsed ? 'Expand' : 'Collapse'} ${escapeHtml(brand)}">${collapsed ? 'Expand' : 'Collapse'}</button>
          </div>
        </div>
        <div class="brand-products ${useVirtual ? 'virtual-scroll' : ''}" data-brand-products="${escapeHtml(brand)}" ${useVirtual ? `style="max-height:400px;overflow-y:auto"` : ''}>
          ${useVirtual ? this.renderVirtualProductListWithAdd(sorted, { brand }) : this.renderProductListWithAdd(sorted, { brand })}
        </div>
      </div>
    `;
  },

  renderProductRow(p, s) {
    const changed = p.previousPrice != null && p.previousPrice !== p.price;
    const changeClass = changed
      ? (p.price > p.previousPrice ? 'price-increased' : 'price-decreased')
      : '';
    const displayName = productDisplayName(p);
    const isSelected = selectedProducts.has(p.id);

    return `
      <li class="product-row ${changeClass} ${isSelected ? 'selected' : ''}" data-id="${p.id}" role="listitem" title="Double-click to edit name">
        <label class="product-select" title="Select for copy">
          <input type="checkbox" class="product-checkbox" data-select-id="${p.id}" ${isSelected ? 'checked' : ''} aria-label="Select ${escapeHtml(displayName)}">
          <span class="checkmark" aria-hidden="true">✓</span>
        </label>
        <span class="product-name" data-name-id="${p.id}" title="Double-click to edit name">${escapeHtml(displayName)}</span>
        <button class="btn-icon btn-delete-product" data-delete-id="${p.id}" aria-label="Delete ${escapeHtml(displayName)}" title="Delete product">🗑</button>
        <button class="price-btn ${p.price === 0 ? 'price-empty' : ''}" data-price-id="${p.id}" aria-label="${hasProductPrice(p.price) ? `Edit price for ${escapeHtml(displayName)}` : `Add price for ${escapeHtml(displayName)}`}">${this.formatPriceLabel(p.price, s.currency)}</button>
        ${changed && hasProductPrice(p.previousPrice) ? `<span class="price-change-badge" title="Was ${formatPrice(p.previousPrice, s.currency)}">${p.price > p.previousPrice ? '▲' : '▼'}</span>` : ''}
      </li>
    `;
  },

  bindBrandCardEvents(container) {
    container.querySelectorAll('[data-preview]').forEach(btn => {
      btn.addEventListener('click', () => {
        const brand = btn.dataset.preview;
        const text = buildBrandMessage(brand, products);
        showPreviewModal(text, `Preview: ${brand}`);
      });
    });

    container.querySelectorAll('[data-preview-section]').forEach(btn => {
      btn.addEventListener('click', () => {
        const sectionId = btn.dataset.previewSection;
        const list = products.filter(p => p.sectionId === sectionId);
        const text = buildFullMessage(list, { includeHeader: true, includeFooter: true });
        const title = loadSettings().customSections.find(s => s.id === sectionId)?.title || 'Section';
        showPreviewModal(text, `Preview: ${title}`);
      });
    });

    container.querySelectorAll('[data-copy]').forEach(btn => {
      btn.addEventListener('click', () => {
        const brand = btn.dataset.copy;
        const brandItems = products.filter(p => p.brand === brand && !p.sectionId);
        const selectedInBrand = brandItems.filter(p => selectedProducts.has(p.id));
        if (selectedInBrand.length) {
          copySelected(products, new Set(selectedInBrand.map(p => p.id)));
        } else {
          copyBrand(brand, products);
        }
      });
    });

    container.querySelectorAll('[data-copy-section]').forEach(btn => {
      btn.addEventListener('click', () => {
        const sectionId = btn.dataset.copySection;
        const ids = new Set(products.filter(p => p.sectionId === sectionId).map(p => p.id));
        copySelected(products, ids);
      });
    });

    container.querySelectorAll('.btn-select-group').forEach(btn => {
      btn.addEventListener('click', () => {
        const type = btn.dataset.groupType;
        const key = btn.dataset.groupKey;
        let groupItems = [];

        if (type === 'section') {
          groupItems = products.filter(p => p.sectionId === key);
        } else {
          groupItems = products.filter(p => p.brand === key && !p.sectionId);
        }

        const allSelected = groupItems.length > 0 && groupItems.every(p => selectedProducts.has(p.id));
        for (const p of groupItems) {
          if (allSelected) selectedProducts.delete(p.id);
          else selectedProducts.add(p.id);
        }
        this.updateSelectionUI();
        this.renderBrandCards();
      });
    });

    container.querySelectorAll('.btn-add-to-section').forEach(btn => {
      btn.addEventListener('click', () => this.assignProductsToSection(btn.dataset.sectionId, [...selectedProducts]));
    });

    container.querySelectorAll('.add-heading-form').forEach(form => {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = form.querySelector('.inline-heading-name');
        const title = input?.value?.trim();
        if (!title) {
          showToast('Heading name cannot be empty', 'warning');
          input?.focus();
          return;
        }
        this.createCustomHeading(title);
        if (input) input.value = '';
      });
    });

    container.querySelectorAll('[data-delete-section]').forEach(btn => {
      btn.addEventListener('click', () => this.removeCustomHeading(btn.dataset.deleteSection));
    });

    container.querySelectorAll('[data-collapse-section]').forEach(btn => {
      btn.addEventListener('click', () => {
        const sectionId = btn.dataset.collapseSection;
        const collapsed = toggleSectionCollapsed(sectionId);
        const card = btn.closest('.brand-card');
        card?.classList.toggle('collapsed', collapsed);
        btn.textContent = collapsed ? 'Expand' : 'Collapse';
      });
    });

    container.querySelectorAll('.section-name[data-section-title]').forEach(el => {
      el.addEventListener('dblclick', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.startSectionTitleEdit(el);
      });
    });

    container.querySelectorAll('.btn-delete-product').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.deleteProductById(btn.dataset.deleteId);
      });
    });

    container.querySelectorAll('.product-checkbox').forEach(cb => {
      cb.addEventListener('change', (e) => {
        const id = e.target.dataset.selectId;
        if (e.target.checked) selectedProducts.add(id);
        else selectedProducts.delete(id);
        e.target.closest('.product-row')?.classList.toggle('selected', e.target.checked);
        this.updateSelectionUI();
      });
    });

    container.querySelectorAll('[data-collapse]').forEach(btn => {
      btn.addEventListener('click', () => {
        const brand = btn.dataset.collapse;
        const collapsed = toggleBrandCollapsed(brand);
        const card = btn.closest('.brand-card');
        card?.classList.toggle('collapsed', collapsed);
        btn.textContent = collapsed ? 'Expand' : 'Collapse';
      });
    });

    container.querySelectorAll('.favorite-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        toggleFavoriteBrand(btn.dataset.fav);
        btn.classList.toggle('active');
        this.renderBrandCards();
      });
    });

    container.querySelectorAll('.price-btn').forEach(btn => {
      btn.addEventListener('click', (e) => this.startPriceEdit(e.target));
    });
  },

  bindProductNameEdit() {
    const cards = document.getElementById('brand-cards');
    if (!cards || cards.dataset.nameEditBound) return;
    cards.dataset.nameEditBound = 'true';

    cards.addEventListener('mousedown', (e) => {
      if (e.detail < 2) return;
      if (e.target.closest('button, input, label, .price-change-badge, .section-name, .btn-delete-product, .add-product-row')) return;
      const row = e.target.closest('.product-row');
      if (!row) return;
      e.preventDefault();
    });

    cards.addEventListener('dblclick', (e) => {
      if (e.target.closest('button, input, label, .price-change-badge, .section-name, .btn-delete-product, .add-product-row')) return;
      const row = e.target.closest('.product-row');
      if (!row) return;
      const nameEl = row.querySelector('.product-name[data-name-id]');
      if (!nameEl) return;
      e.preventDefault();
      e.stopPropagation();
      this.startNameEdit(nameEl);
    });
  },

  bindInlineAddProductRows(container) {
    container.querySelectorAll('.add-product-row').forEach(row => {
      const nameInput = row.querySelector('.inline-add-name');
      const priceInput = row.querySelector('.inline-add-price');
      const submitBtn = row.querySelector('.btn-inline-add-submit');
      if (!nameInput || !submitBtn) return;

      const submit = async () => {
        const name = nameInput.value.trim();
        if (!name) {
          showToast('Enter a product name', 'warning');
          nameInput.focus();
          return;
        }

        const price = priceInput?.value?.trim() ? parsePrice(priceInput.value) : 0;
        const sectionId = row.dataset.addSection || undefined;
        const brand = row.dataset.addBrand || undefined;

        await this.addProductRecord({ name, price, sectionId, brand });

        nameInput.value = '';
        if (priceInput) priceInput.value = '';
        nameInput.focus();
      };

      submitBtn.addEventListener('click', submit);
      nameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); submit(); }
      });
      priceInput?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); submit(); }
      });
      nameInput.addEventListener('mousedown', (e) => e.stopPropagation());
      priceInput?.addEventListener('mousedown', (e) => e.stopPropagation());
    });
  },

  openHeadingNameDialog() {
    const dialog = document.getElementById('heading-name-dialog');
    const input = document.getElementById('heading-name-input');
    if (!dialog) return;
    if (input) input.value = '';
    dialog.showModal();
    requestAnimationFrame(() => input?.focus());
  },

  submitHeadingNameForm() {
    const input = document.getElementById('heading-name-input');
    const title = input?.value?.trim();
    if (!title) {
      showToast('Heading name cannot be empty', 'warning');
      input?.focus();
      return;
    }
    document.getElementById('heading-name-dialog')?.close();
    this.createCustomHeading(title);
  },

  createCustomHeading(title) {
    const trimmed = String(title || '').trim();
    if (!trimmed) {
      showToast('Heading name cannot be empty', 'warning');
      return;
    }

    const section = addCustomSection(trimmed);
    this.renderBrandCards();
    showToast(`Heading "${trimmed}" created`, 'success');
    requestAnimationFrame(() => {
      document.querySelector(`.custom-section-card[data-section-id="${section.id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      document.querySelector(`.custom-section-card[data-section-id="${section.id}"] .inline-add-name`)?.focus();
    });
  },

  async addProductRecord({ name, price = 0, sectionId, brand }) {
    const defaultBrand = brand || 'Other';
    const parsed = parseProductDisplayEdit(name, defaultBrand);
    if (!parsed?.model) {
      showToast('Could not parse name. Try: Model Name 8GB/256GB', 'error');
      return;
    }

    const product = {
      id: generateId(),
      brand: brand || parsed.brand || 'Other',
      model: parsed.model,
      ram: parsed.ram || '',
      storage: parsed.storage || '',
      price: price || 0,
      previousPrice: null,
      updatedAt: Date.now()
    };

    if (sectionId) product.sectionId = sectionId;

    products.push(product);
    await updateProduct(product);
    await this.refreshDashboard();
    showToast('Product added', 'success');
  },

  async assignProductsToSection(sectionId, ids = []) {
    if (!sectionId || !ids.length) {
      showToast('Select products first', 'warning');
      return;
    }

    for (const id of ids) {
      const product = products.find(p => p.id === id);
      if (!product) continue;
      product.sectionId = sectionId;
      product.updatedAt = Date.now();
      await updateProduct(product);
    }

    selectedProducts.clear();
    await this.refreshDashboard();
    showToast(`Moved ${ids.length} product(s) to heading`, 'success');
  },

  async moveSelectedToSection(sectionId) {
    const select = document.getElementById('move-to-section');
    if (!sectionId) {
      if (select) select.value = '';
      return;
    }

    if (!selectedProducts.size) {
      showToast('Select products first', 'warning');
      if (select) select.value = '';
      return;
    }

    if (sectionId === '__brand__') {
      for (const id of selectedProducts) {
        const product = products.find(p => p.id === id);
        if (!product) continue;
        delete product.sectionId;
        product.updatedAt = Date.now();
        await updateProduct(product);
      }
      const count = selectedProducts.size;
      selectedProducts.clear();
      await this.refreshDashboard();
      showToast(`Moved ${count} product(s) back to brand groups`, 'success');
    } else {
      await this.assignProductsToSection(sectionId, [...selectedProducts]);
    }

    if (select) select.value = '';
  },

  async deleteProductById(id) {
    const product = products.find(p => p.id === id);
    if (!product) return;

    const name = productDisplayName(product);
    if (!confirm(`Delete "${name}"?`)) return;

    await deleteProduct(id);
    products = products.filter(p => p.id !== id);
    selectedProducts.delete(id);
    await this.refreshDashboard();
    showToast('Product deleted', 'success');
  },

  async removeCustomHeading(sectionId) {
    const section = loadSettings().customSections.find(s => s.id === sectionId);
    if (!section) return;

    if (!confirm(`Delete heading "${section.title}"? Products will move back to brand groups.`)) return;

    for (const p of products.filter(prod => prod.sectionId === sectionId)) {
      delete p.sectionId;
      p.updatedAt = Date.now();
      await updateProduct(p);
    }

    deleteCustomSection(sectionId);
    await this.refreshDashboard();
    showToast('Heading deleted', 'success');
  },

  startSectionTitleEdit(titleEl) {
    if (this.getActiveFieldEditor()?.isConnected) return;

    const sectionId = titleEl.dataset.sectionTitle;
    const originalTitle = titleEl.textContent.trim();
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'name-input section-title-input';
    input.value = originalTitle;
    input.setAttribute('aria-label', 'Edit heading title');

    let cancelled = false;

    const finish = (save) => {
      if (cancelled) return;
      const trimmed = input.value.trim();
      if (save && trimmed && trimmed !== originalTitle) {
        updateCustomSectionTitle(sectionId, trimmed);
        this.renderBrandCards();
        showToast('Heading renamed', 'success');
      } else if (titleEl.isConnected) {
        titleEl.textContent = originalTitle;
      } else {
        input.replaceWith(titleEl);
        titleEl.textContent = originalTitle;
      }
    };

    input.addEventListener('blur', () => finish(true));
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        input.blur();
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        cancelled = true;
        if (input.isConnected) {
          input.replaceWith(titleEl);
          titleEl.textContent = originalTitle;
        }
      }
    });

    titleEl.replaceWith(input);
    input.focus();
    input.select();
  },

  getActiveFieldEditor() {
    return document.querySelector('.name-input, .price-input');
  },

  startNameEdit(span) {
    const activeEditor = this.getActiveFieldEditor();
    if (activeEditor?.isConnected) return;

    const id = span.dataset.nameId;
    const product = products.find(p => p.id === id);
    if (!product) return;

    const originalDisplay = productDisplayName(product);
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'name-input';
    input.value = originalDisplay;
    input.setAttribute('aria-label', 'Edit product name');

    let cancelled = false;
    let saving = false;

    const restore = () => {
      if (span.isConnected) span.textContent = originalDisplay;
      else if (!cancelled && !saving) input.replaceWith(span);
    };

    const save = async () => {
      if (cancelled || saving || !input.isConnected) return;

      const trimmed = input.value.replace(/\u00a0/g, ' ').trim();
      if (!trimmed) {
        showToast('Name cannot be empty', 'warning');
        input.focus();
        return;
      }

      if (trimmed === originalDisplay) {
        input.replaceWith(span);
        span.textContent = originalDisplay;
        return;
      }

      const parsed = parseProductDisplayEdit(trimmed, product.brand);
      if (!parsed?.model) {
        showToast('Could not parse name. Try: Model Name 8GB/256GB', 'error');
        input.focus();
        input.select();
        return;
      }

      saving = true;
      product.model = parsed.model;
      product.ram = parsed.ram || '';
      product.storage = parsed.storage || '';
      product.updatedAt = Date.now();

      try {
        await updateProduct(product);
        this.addRecentlyEdited(product);
        await this.refreshDashboard();
        showToast('Name updated', 'success');
      } catch (err) {
        saving = false;
        showToast('Failed to save name: ' + err.message, 'error');
        restore();
      }
    };

    input.addEventListener('blur', () => {
      if (!cancelled) save();
    });

    input.addEventListener('mousedown', (e) => e.stopPropagation());
    input.addEventListener('dragstart', (e) => e.preventDefault());

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        input.blur();
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        cancelled = true;
        if (input.isConnected) {
          input.replaceWith(span);
          span.textContent = originalDisplay;
        }
      }
    });

    span.replaceWith(input);
    requestAnimationFrame(() => {
      if (!input.isConnected) return;
      input.focus({ preventScroll: true });
      input.select();
    });
  },

  startPriceEdit(btn) {
    this.flushActivePriceEditor();

    const id = btn.dataset.priceId;
    const product = products.find(p => p.id === id);
    if (!product) return;

    const priceAtEditStart = product.price;
    const input = document.createElement('input');
    input.type = 'number';
    input.className = 'price-input';
    input.value = hasProductPrice(product.price) ? product.price : '';
    input.min = 0;
    input.setAttribute('aria-label', 'Edit price');

    let cancelled = false;
    let finishing = false;
    let persistTimer = null;

    const clearPersistTimer = () => {
      if (persistTimer) {
        clearTimeout(persistTimer);
        persistTimer = null;
      }
    };

    const persistToDb = async () => {
      product.updatedAt = Date.now();
      await updateProduct(product);
    };

    const schedulePersist = () => {
      clearPersistTimer();
      persistTimer = setTimeout(() => {
        persistTimer = null;
        persistToDb().catch(err => {
          console.error('Price save failed:', err);
          showToast('Failed to save price', 'error');
        });
      }, PRICE_PERSIST_DELAY_MS);
    };

    const applyInputPrice = () => {
      const newPrice = parsePrice(input.value);
      if (newPrice < 0) return null;
      if (product.previousPrice == null && priceAtEditStart > 0 && newPrice !== priceAtEditStart) {
        product.previousPrice = priceAtEditStart;
      }
      product.price = newPrice;
      return newPrice;
    };

    const finishEdit = async () => {
      if (cancelled || finishing || !input.isConnected) return;
      finishing = true;
      activePriceEditor = null;

      if (persistTimer) {
        clearPersistTimer();
      }

      const newPrice = applyInputPrice();
      if (newPrice == null) {
        finishing = false;
        return;
      }

      try {
        await persistToDb();

        if (newPrice !== priceAtEditStart) {
          this.pushSinglePriceUndo({ id, oldPrice: priceAtEditStart });
          this.addRecentlyEdited(product);
          showToast(newPrice === 0 ? 'Price cleared' : 'Price updated', 'success');
          if (newPrice > 0) this.checkPriceAlert(product);
        }

        await this.refreshDashboard();
      } catch (err) {
        finishing = false;
        showToast('Failed to save price: ' + err.message, 'error');
        if (input.isConnected) {
          input.replaceWith(btn);
          btn.textContent = this.formatPriceLabel(product.price, loadSettings().currency);
        }
      }
    };

    activePriceEditor = { input, product, clearPersistTimer, finishEdit };

    input.addEventListener('input', () => {
      if (applyInputPrice() != null) schedulePersist();
    });

    input.addEventListener('blur', () => {
      if (!cancelled) finishEdit();
    });

    input.addEventListener('mousedown', (e) => e.stopPropagation());
    input.addEventListener('dragstart', (e) => e.preventDefault());
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        cancelled = true;
        activePriceEditor = null;
        clearPersistTimer();
        product.price = priceAtEditStart;
        updateProduct(product).catch(err => console.error('Price revert failed:', err));
        input.replaceWith(btn);
        btn.textContent = this.formatPriceLabel(priceAtEditStart, loadSettings().currency);
      }
    });

    btn.replaceWith(input);
    input.focus();
    input.select();
  },

  addRecentlyEdited(product) {
    recentlyEdited = recentlyEdited.filter(r => r.id !== product.id);
    recentlyEdited.unshift({ ...product });
    if (recentlyEdited.length > 5) recentlyEdited.pop();
    this.renderRecentlyEdited();
  },

  renderRecentlyEdited() {
    const section = document.getElementById('recently-edited');
    const list = document.getElementById('recent-list');
    if (!section || !list) return;

    if (!recentlyEdited.length) {
      section.classList.add('hidden');
      return;
    }

    section.classList.remove('hidden');
    const s = loadSettings();
    list.innerHTML = recentlyEdited.map(p => {
      const priceLabel = formatPrice(p.price, s.currency);
      return `<li>${escapeHtml(productDisplayName(p))}${priceLabel ? ` — ${priceLabel}` : ''}</li>`;
    }).join('');
  },

  checkPriceAlert(product) {
    const threshold = loadSettings().alertThreshold;
    if (threshold > 0 && product.price <= threshold) {
      showToast(`Alert: ${product.model} dropped to ${formatPrice(product.price)}`, 'warning', 5000);
    }
  },

  initDragReorder(container) {
    let dragBrand = null;
    let dragSectionId = null;

    container.querySelectorAll('.custom-section-card').forEach(card => {
      const handle = card.querySelector('.drag-handle');
      if (!handle) return;

      handle.addEventListener('dragstart', (e) => {
        dragSectionId = card.dataset.sectionId;
        dragBrand = null;
        card.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', dragSectionId);
      });

      handle.addEventListener('dragend', () => {
        card.classList.remove('dragging');
        dragSectionId = null;
      });

      card.addEventListener('dragover', (e) => {
        if (!dragSectionId) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
      });

      card.addEventListener('drop', (e) => {
        e.preventDefault();
        const targetId = card.dataset.sectionId;
        if (!dragSectionId || dragSectionId === targetId) return;

        const s = loadSettings();
        const order = [...s.sectionOrder];
        for (const sec of s.customSections) {
          if (!order.includes(sec.id)) order.push(sec.id);
        }

        const fromIdx = order.indexOf(dragSectionId);
        const toIdx = order.indexOf(targetId);
        if (fromIdx < 0 || toIdx < 0) return;

        order.splice(fromIdx, 1);
        order.splice(toIdx, 0, dragSectionId);
        updateSectionOrder(order);
        dragSectionId = null;
        this.renderBrandCards();
      });
    });

    container.querySelectorAll('.brand-card[data-brand]').forEach(card => {
      const handle = card.querySelector('.drag-handle');
      if (!handle) return;

      handle.addEventListener('dragstart', (e) => {
        dragBrand = card.dataset.brand;
        dragSectionId = null;
        card.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', dragBrand);
      });

      handle.addEventListener('dragend', () => {
        card.classList.remove('dragging');
        dragBrand = null;
      });

      card.addEventListener('dragover', (e) => {
        if (!dragBrand) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
      });

      card.addEventListener('drop', (e) => {
        e.preventDefault();
        const targetBrand = card.dataset.brand;
        if (!dragBrand || dragBrand === targetBrand) return;

        const s = loadSettings();
        const brands = groupByBrand(products, s.brandOrder).map(g => g.brand);
        const fromIdx = brands.indexOf(dragBrand);
        const toIdx = brands.indexOf(targetBrand);
        if (fromIdx < 0 || toIdx < 0) return;

        brands.splice(fromIdx, 1);
        brands.splice(toIdx, 0, dragBrand);
        updateBrandOrder(brands);
        dragBrand = null;
        this.renderBrandCards();
      });
    });
  },

  async handleExcelUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    showLoading(true, 'Parsing Excel...');
    try {
      const { products: parsed, meta } = await parseExcelFile(file);
      products = parsed;
      selectedProducts.clear();
      await saveAllProducts(products);
      await this.refreshDashboard();
      let msg = `Loaded ${products.length} products`;
      if (meta.format === 'sparky-stock') msg += ' (Sparky Stock Report format)';
      else if (meta.format === 'stock-summary') msg += ' (Stock Summary — names imported, enter prices manually)';
      else if (meta.format === 'pakkabill') msg += ' (PakkaBill export)';
      if (meta.missingPrices > 0) msg += ` — ${meta.missingPrices} items need price entry`;
      showToast(msg, 'success', 5000);
    } catch (err) {
      showToast(err.message, 'error');
    }
    showLoading(false);
  },

  async handlePdfUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    showLoading(true, 'Parsing PDF...');
    try {
      const parsed = await parsePdfFile(file);
      products = parsed;
      await saveAllProducts(products);
      await this.refreshDashboard();
      showToast(`Loaded ${parsed.length} products from PDF`, 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
    showLoading(false);
  },

  async handleJsonImport(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    try {
      await importJsonFile(file);
      products = await getAllProducts();
      syncHeaderFooterToUI();
      await this.refreshDashboard();
    } catch { /* toast shown in import */ }
  },

  async saveSnapshot() {
    saveHeaderFooterFromUI();
    const s = loadSettings();

    const snapshot = {
      id: generateId(),
      date: document.getElementById('header-date')?.textContent || getTodayFormatted(),
      dateKey: todayKey(),
      savedAt: Date.now(),
      header: {
        storeName: s.storeName,
        location: s.location,
        date: document.getElementById('header-date')?.textContent || getTodayFormatted(),
        title: s.header.title,
        validity: s.header.validity
      },
      footer: { ...s.footer },
      products: products.map(p => ({ ...p })),
      settings: { brandOrder: s.brandOrder, currency: s.currency }
    };

    showLoading(true, 'Saving snapshot...');
    try {
      await saveSnapshot(snapshot);
      await setMeta('lastSaved', Date.now());
      await this.updateStats();
      showToast('Snapshot saved successfully', 'success');
    } catch (err) {
      showToast('Save failed: ' + err.message, 'error');
    }
    showLoading(false);
  },

  toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    const toggle = document.getElementById('menu-toggle');
    const open = !sidebar?.classList.contains('open');
    sidebar?.classList.toggle('open', open);
    overlay?.classList.toggle('open', open);
    if (overlay) overlay.hidden = !open;
    toggle?.setAttribute('aria-expanded', String(open));
  },

  closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    const toggle = document.getElementById('menu-toggle');
    sidebar?.classList.remove('open');
    overlay?.classList.remove('open');
    if (overlay) overlay.hidden = true;
    toggle?.setAttribute('aria-expanded', 'false');
  },

  async switchView(view) {
    document.querySelectorAll('.view').forEach(v => {
      v.classList.remove('active');
      v.hidden = true;
    });

    const target = document.getElementById(`view-${view}`);
    if (target) {
      target.classList.add('active');
      target.hidden = false;
    }

    document.querySelectorAll('.nav-btn').forEach(btn => {
      const active = btn.dataset.view === view;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-current', active ? 'page' : 'false');
    });

    this.closeSidebar();

    if (view === 'history') await renderHistoryList();
    if (view === 'compare') await populateCompareDates();
    if (view === 'calendar') await this.renderCalendar();
    if (view === 'settings') {
      populateSettingsForm();
      this.renderFavoriteBrandsSettings();
    }
  },

  async renderCalendar() {
    const grid = document.getElementById('calendar-grid');
    const label = document.getElementById('cal-month-year');
    if (!grid) return;

    const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    label.textContent = `${months[calendarMonth]} ${calendarYear}`;

    const snapshots = await getAllSnapshots();
    const dateMap = new Map();
    for (const s of snapshots) dateMap.set(s.dateKey, s);

    const firstDay = new Date(calendarYear, calendarMonth, 1).getDay();
    const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();

    const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    let html = dayNames.map(d => `<div class="cal-day-name" role="columnheader">${d}</div>`).join('');

    for (let i = 0; i < firstDay; i++) html += '<div class="cal-day empty"></div>';

    for (let d = 1; d <= daysInMonth; d++) {
      const dateKey = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const hasSnap = dateMap.has(dateKey);
      html += `
        <button class="cal-day ${hasSnap ? 'has-snapshot' : ''}" data-date-key="${dateKey}" ${hasSnap ? '' : 'disabled'}
          aria-label="${d} ${months[calendarMonth]} ${calendarYear}${hasSnap ? ' — has snapshot' : ''}">
          ${d}
        </button>
      `;
    }

    grid.innerHTML = html;

    grid.querySelectorAll('.cal-day.has-snapshot').forEach(btn => {
      btn.addEventListener('click', async () => {
        const snaps = await getSnapshotsByDate(btn.dataset.dateKey);
        if (snaps.length) {
          await showSnapshotDetail(
            snaps.sort((a, b) => b.savedAt - a.savedAt)[0],
            'calendar-snapshot'
          );
        }
      });
    });
  },

  openBulkEdit() {
    const modal = document.getElementById('bulk-edit-modal');
    this.populateBulkBrands();
    modal?.showModal();
  },

  populateBulkBrands() {
    const select = document.getElementById('bulk-brand');
    if (!select) return;
    const brands = [...new Set(products.map(p => p.brand))].sort();
    select.innerHTML = '<option value="">All Brands</option>' +
      brands.map(b => `<option value="${escapeHtml(b)}">${escapeHtml(b)}</option>`).join('');
  },

  async applyBulkEdit() {
    const brand = document.getElementById('bulk-brand')?.value;
    const type = document.getElementById('bulk-type')?.value;
    const value = parseFloat(document.getElementById('bulk-value')?.value);

    if (!value || value <= 0) {
      showToast('Enter a valid adjustment value', 'error');
      return;
    }

    let targets = brand ? products.filter(p => p.brand === brand) : products;
    const snapshot = this.createPriceSnapshot();
    this.pushPriceUndoSnapshot(snapshot);

    for (const p of targets) {
      if (p.previousPrice == null) p.previousPrice = p.price;

      switch (type) {
        case 'percent-increase': p.price = Math.round(p.price * (1 + value / 100)); break;
        case 'percent-decrease': p.price = Math.round(p.price * (1 - value / 100)); break;
        case 'fixed-increase': p.price = p.price + value; break;
        case 'fixed-decrease': p.price = Math.max(0, p.price - value); break;
      }
      p.updatedAt = Date.now();
    }

    await saveAllProducts(products);

    document.getElementById('bulk-edit-modal')?.close();
    await this.refreshDashboard();
    showToast(`Updated ${targets.length} products`, 'success');
  },

  async duplicateList() {
    const copies = products.map(p => ({
      ...p,
      id: generateId(),
      previousPrice: p.price,
      updatedAt: Date.now()
    }));
    products = copies;
    await saveAllProducts(products);
    await this.refreshDashboard();
    showToast('List duplicated', 'success');
  },

  async undoLastEdit() {
    const last = undoStack.pop();
    persistUndoStack();
    if (!last) {
      showToast('Nothing to undo', 'info');
      this.updatePriceActionUI();
      return;
    }

    if (last.batch && last.items?.length) {
      const priceMap = new Map(last.items.map(entry => [entry.id, entry.oldPrice]));
      let restored = 0;

      for (const product of products) {
        if (!priceMap.has(product.id)) continue;
        product.price = priceMap.get(product.id);
        product.updatedAt = Date.now();
        restored++;
      }

      await saveAllProducts(products);
      await this.refreshDashboard();
      showToast(`Restored ${restored} price(s)`, 'success');
      return;
    }

    if (last.id != null) {
      const product = products.find(p => p.id === last.id);
      if (product) {
        product.price = last.oldPrice;
        product.updatedAt = Date.now();
        await updateProduct(product);
        await this.refreshDashboard();
        showToast('Price restored', 'success');
        return;
      }
    }

    this.updatePriceActionUI();
    showToast('Nothing to undo', 'info');
  },

  saveSettingsForm() {
    const formData = readSettingsForm();
    const s = loadSettings();
    saveSettings({ ...formData, logo: s.logo });
    applyTheme(formData.theme);
    syncHeaderFooterToUI();
    this.renderBrandCards();
    showToast('Settings saved', 'success');
  },

  async handleLogoUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      saveSettings({ logo: reader.result });
      const logo = document.getElementById('store-logo');
      const preview = document.getElementById('setting-logo-preview');
      if (logo) { logo.src = reader.result; logo.classList.remove('hidden'); }
      if (preview) { preview.src = reader.result; preview.classList.remove('hidden'); }
      showToast('Logo updated', 'success');
    };
    reader.readAsDataURL(file);
  },

  renderFavoriteBrandsSettings() {
    const container = document.getElementById('favorite-brands-list');
    if (!container) return;
    const brands = [...new Set(products.map(p => p.brand))].sort();
    const favorites = loadSettings().favoriteBrands;

    container.innerHTML = brands.map(b => `
      <label class="fav-brand-label">
        <input type="checkbox" data-brand="${escapeHtml(b)}" ${favorites.includes(b) ? 'checked' : ''}>
        ${escapeHtml(b)}
      </label>
    `).join('');

    container.querySelectorAll('input').forEach(cb => {
      cb.addEventListener('change', () => toggleFavoriteBrand(cb.dataset.brand));
    });
  },

  async resetAllData() {
    if (!confirm('This will delete ALL products, snapshots, and history. Are you sure?')) return;
    await resetDatabase();
    products = [];
    recentlyEdited = [];
    undoStack = [];
    try { sessionStorage.removeItem(UNDO_STORAGE_KEY); } catch { /* ignore */ }
    localStorage.removeItem('sparky_settings');
    location.reload();
  },

  startAutosave() {
    if (autosaveTimer) clearInterval(autosaveTimer);
    autosaveTimer = setInterval(async () => {
      if (!loadSettings().autosaveEnabled || !products.length) return;
      await this.flushActivePriceEditor({ awaitDb: true });
      saveHeaderFooterFromUI();
      await saveAllProducts(products);
      await setMeta('lastSaved', Date.now());
    }, 60000);
  },

  initNetworkStatus() {
    const update = () => {
      const el = document.getElementById('network-status');
      const label = document.getElementById('network-label');
      const online = navigator.onLine;
      el?.classList.toggle('online', online);
      el?.classList.toggle('offline', !online);
      if (label) label.textContent = online ? 'Online' : 'Offline';
    };
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    update();
  },

  initKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      if (e.target.matches('input, textarea, [contenteditable]') && !e.ctrlKey && e.key !== 'Escape') return;

      if (e.ctrlKey && e.key === 's') { e.preventDefault(); this.saveSnapshot(); }
      if (e.ctrlKey && e.key === 'z') { e.preventDefault(); this.undoLastEdit(); }
      if (e.ctrlKey && e.key === 'f') { e.preventDefault(); document.getElementById('search-input')?.focus(); }
      if (e.ctrlKey && e.key === 'k') { e.preventDefault(); copyFullList(products); }
      if (e.ctrlKey && e.shiftKey && (e.key === 'C' || e.key === 'c')) {
        e.preventDefault();
        copySelected(products, selectedProducts);
      }
      if (e.ctrlKey && e.shiftKey && (e.key === 'P' || e.key === 'p')) {
        e.preventDefault();
        previewSelected(products, selectedProducts);
      }
      if (e.key === '?' && !e.ctrlKey) { document.getElementById('shortcuts-modal')?.showModal(); }
      if (e.key === 'Escape') {
        const openDialogs = document.querySelectorAll('dialog[open]');
        if (openDialogs.length) {
          openDialogs.forEach(d => d.close());
          return;
        }
        if (e.target.matches('.name-input, .price-input')) return;
        if (selectedProducts.size > 0) {
          e.preventDefault();
          this.deselectAll();
        }
      }
    });
  }
};

function applyYesterdayPrices(yesterdayProducts) {
  const map = new Map();
  for (const p of yesterdayProducts) {
    map.set(`${p.brand}|${p.model}|${p.ram}|${p.storage}`.toLowerCase(), p.price);
  }
  for (const p of products) {
    const key = `${p.brand}|${p.model}|${p.ram}|${p.storage}`.toLowerCase();
    if (map.has(key)) p.previousPrice = map.get(key);
  }
}

document.addEventListener('DOMContentLoaded', () => app.init());

export default app;
