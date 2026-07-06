/**
 * Compare dates functionality
 */

import { getLatestSnapshotForDate } from './db.js';
import { productKey, escapeHtml, formatPrice } from './utils.js';
import { loadSettings } from './settings.js';

export async function runComparison(dateKeyA, dateKeyB) {
  const container = document.getElementById('compare-results');
  if (!container) return;

  if (!dateKeyA || !dateKeyB) {
    container.innerHTML = '<p class="empty-message">Please select both dates.</p>';
    return;
  }

  if (dateKeyA === dateKeyB) {
    container.innerHTML = '<p class="empty-message">Please select two different dates.</p>';
    return;
  }

  const [snapA, snapB] = await Promise.all([
    getLatestSnapshotForDate(dateKeyA),
    getLatestSnapshotForDate(dateKeyB)
  ]);

  if (!snapA || !snapB) {
    container.innerHTML = '<p class="empty-message">No snapshot found for one or both dates.</p>';
    return;
  }

  const results = compareSnapshots(snapA, snapB);
  renderCompareResults(container, results, snapA, snapB);
}

function compareSnapshots(snapA, snapB) {
  const mapA = new Map();
  const mapB = new Map();

  for (const p of snapA.products || []) mapA.set(productKey(p), p);
  for (const p of snapB.products || []) mapB.set(productKey(p), p);

  const allKeys = new Set([...mapA.keys(), ...mapB.keys()]);
  const results = [];

  for (const key of allKeys) {
    const pA = mapA.get(key);
    const pB = mapB.get(key);
    const product = pA || pB;
    const priceA = pA?.price ?? null;
    const priceB = pB?.price ?? null;

    let diff = null;
    let status = 'unchanged';

    if (priceA != null && priceB != null) {
      diff = priceB - priceA;
      if (diff > 0) status = 'increase';
      else if (diff < 0) status = 'decrease';
    } else if (priceA == null) {
      status = 'new';
      diff = priceB;
    } else {
      status = 'removed';
      diff = -priceA;
    }

    results.push({ product, priceA, priceB, diff, status, brand: product.brand });
  }

  const brandOrder = [...new Set(results.map(r => r.brand))].sort();
  return { results, brandOrder, snapA, snapB };
}

function renderCompareResults(container, { results, brandOrder, snapA, snapB }) {
  const s = loadSettings();
  const grouped = {};

  for (const r of results) {
    if (!grouped[r.brand]) grouped[r.brand] = [];
    grouped[r.brand].push(r);
  }

  let html = `
    <div class="compare-summary">
      <span class="compare-date-label">${escapeHtml(snapA.date)}</span>
      <span>vs</span>
      <span class="compare-date-label">${escapeHtml(snapB.date)}</span>
    </div>
  `;

  for (const brand of brandOrder) {
    const items = grouped[brand].filter(r => r.status !== 'unchanged' || r.priceA !== r.priceB);
    if (!items.length) continue;

    html += `<div class="compare-brand-group"><h3>${escapeHtml(brand)}</h3><ul class="compare-list">`;

    for (const r of items) {
      const modelName = `${r.product.model} ${r.product.ram ? r.product.ram + '/' : ''}${r.product.storage || ''}`.trim();
      const diffText = r.diff != null && r.status !== 'new' && r.status !== 'removed'
        ? `${r.diff > 0 ? 'Increase' : r.diff < 0 ? 'Decrease' : 'Unchanged'} ${r.diff > 0 ? '+' : ''}${r.diff}`
        : r.status === 'new' ? 'New product' : 'Removed';

      html += `
        <li class="compare-item compare-${r.status}">
          <span class="compare-model">${escapeHtml(modelName)}</span>
          <span class="compare-prices">
            ${r.priceA != null ? `<span>${escapeHtml(snapA.date)} ${formatPrice(r.priceA, s.currency)}</span>` : ''}
            ${r.priceB != null ? `<span>${escapeHtml(snapB.date)} ${formatPrice(r.priceB, s.currency)}</span>` : ''}
          </span>
          <span class="compare-diff">${diffText}</span>
        </li>
      `;
    }
    html += '</ul></div>';
  }

  const changed = results.filter(r => r.status !== 'unchanged');
  if (!changed.length) {
    html += '<p class="empty-message">No price differences found between these dates.</p>';
  }

  container.innerHTML = html;
}

export async function searchModelHistory(query) {
  const container = document.getElementById('model-history-results');
  if (!container || !query.trim()) {
    if (container) container.innerHTML = '<p class="empty-message">Enter a model name to search.</p>';
    return;
  }

  const { searchModelHistory: dbSearch } = await import('./db.js');
  const results = await dbSearch(query.trim());
  const s = loadSettings();

  if (!results.length) {
    container.innerHTML = `<p class="empty-message">No history found for "${escapeHtml(query)}".</p>`;
    return;
  }

  const byProduct = new Map();
  for (const r of results) {
    const key = productKey(r.product);
    if (!byProduct.has(key)) {
      byProduct.set(key, { product: r.product, history: [] });
    }
    byProduct.get(key).history.push(r);
  }

  container.innerHTML = Array.from(byProduct.values()).map(({ product, history }) => {
    const sorted = history.sort((a, b) => a.dateKey.localeCompare(b.dateKey));
    return `
      <div class="model-history-card">
        <h3>${escapeHtml(product.brand)} — ${escapeHtml(product.model)} ${escapeHtml(product.ram)}${product.storage ? '/' + escapeHtml(product.storage) : ''}</h3>
        <ul class="model-price-timeline">
          ${sorted.map((h, i) => {
            const prev = sorted[i - 1];
            const change = prev ? h.price - prev.price : 0;
            const changeClass = change > 0 ? 'increase' : change < 0 ? 'decrease' : '';
            return `
              <li class="${changeClass}">
                <span class="mh-date">${escapeHtml(h.date)}</span>
                <span class="mh-price">${formatPrice(h.price, s.currency)}</span>
                ${change !== 0 ? `<span class="mh-change">${change > 0 ? '+' : ''}${change}</span>` : ''}
              </li>
            `;
          }).join('')}
        </ul>
      </div>
    `;
  }).join('');
}
