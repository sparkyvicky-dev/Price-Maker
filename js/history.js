/**
 * History page functionality
 */

import { getSnapshotsPaginated, getSnapshotById, getAllSnapshots } from './db.js';
import { formatDate, escapeHtml, formatPrice } from './utils.js';
import { loadSettings } from './settings.js';
import { groupByBrand, productDisplayName } from './utils.js';

let currentPage = 1;
let historySearchQuery = '';

export async function renderHistoryList(page = 1) {
  currentPage = page;
  const container = document.getElementById('history-list');
  const pagination = document.getElementById('history-pagination');
  if (!container) return;

  const { items, total, totalPages } = await getSnapshotsPaginated(page, 20);
  let filtered = items;

  if (historySearchQuery) {
    const q = historySearchQuery.toLowerCase();
    filtered = items.filter(s =>
      (s.date || '').toLowerCase().includes(q) ||
      (s.dateKey || '').includes(q)
    );
  }

  const dateGroups = groupSnapshotsByDate(filtered);

  if (!dateGroups.length) {
    container.innerHTML = '<p class="empty-message">No saved snapshots yet. Save today\'s snapshot from the dashboard.</p>';
    if (pagination) pagination.innerHTML = '';
    return;
  }

  container.innerHTML = dateGroups.map(group => `
    <div class="history-date-group" role="listitem">
      <button class="history-date-btn" data-date-key="${escapeHtml(group.dateKey)}" aria-label="View snapshot for ${escapeHtml(group.date)}">
        <span class="history-date">${escapeHtml(group.date)}</span>
        <span class="history-count">${group.snapshots.length} snapshot${group.snapshots.length > 1 ? 's' : ''}</span>
      </button>
      ${group.snapshots.length > 1 ? `
        <ul class="history-snap-list">
          ${group.snapshots.map(s => `
            <li>
              <button class="history-snap-btn" data-snapshot-id="${s.id}" aria-label="View snapshot saved at ${new Date(s.savedAt).toLocaleTimeString()}">
                ${new Date(s.savedAt).toLocaleTimeString()} — ${(s.products || []).length} products
              </button>
            </li>
          `).join('')}
        </ul>
      ` : ''}
    </div>
  `).join('');

  renderPagination(pagination, page, totalPages, total);
  bindHistoryEvents(container);
}

function groupSnapshotsByDate(snapshots) {
  const map = new Map();
  for (const s of snapshots) {
    if (!map.has(s.dateKey)) {
      map.set(s.dateKey, { dateKey: s.dateKey, date: s.date, snapshots: [] });
    }
    map.get(s.dateKey).snapshots.push(s);
  }
  return Array.from(map.values()).sort((a, b) => b.dateKey.localeCompare(a.dateKey));
}

function renderPagination(container, page, totalPages, total) {
  if (!container || totalPages <= 1) {
    if (container) container.innerHTML = total ? `<span class="page-info">${total} records</span>` : '';
    return;
  }

  container.innerHTML = `
    <button class="btn btn-sm btn-secondary" data-page="${page - 1}" ${page <= 1 ? 'disabled' : ''} aria-label="Previous page">Prev</button>
    <span class="page-info">Page ${page} of ${totalPages}</span>
    <button class="btn btn-sm btn-secondary" data-page="${page + 1}" ${page >= totalPages ? 'disabled' : ''} aria-label="Next page">Next</button>
  `;

  container.querySelectorAll('[data-page]').forEach(btn => {
    btn.addEventListener('click', () => {
      const p = parseInt(btn.dataset.page, 10);
      if (p >= 1 && p <= totalPages) renderHistoryList(p);
    });
  });
}

function bindHistoryEvents(container) {
  container.querySelectorAll('.history-date-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const dateKey = btn.dataset.dateKey;
      const snaps = (await getAllSnapshots()).filter(s => s.dateKey === dateKey);
      if (snaps.length) await showSnapshotDetail(snaps.sort((a, b) => b.savedAt - a.savedAt)[0]);
    });
  });

  container.querySelectorAll('.history-snap-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const snap = await getSnapshotById(btn.dataset.snapshotId);
      if (snap) await showSnapshotDetail(snap);
    });
  });
}

export async function showSnapshotDetail(snapshot, containerId = 'snapshot-detail') {
  const detail = document.getElementById(containerId);
  if (!detail) return;

  const s = loadSettings();
  const groups = groupByBrand(snapshot.products || [], snapshot.settings?.brandOrder || []);

  detail.classList.remove('hidden');
  detail.innerHTML = `
    <div class="snapshot-header">
      <h3>${escapeHtml(snapshot.date)} — Saved ${new Date(snapshot.savedAt).toLocaleString()}</h3>
      <button class="btn btn-sm btn-secondary snapshot-close" aria-label="Close snapshot detail">Close</button>
    </div>
    <div class="snapshot-meta">
      <p><strong>${escapeHtml(snapshot.header?.storeName || '')}</strong> — ${escapeHtml(snapshot.header?.location || '')}</p>
      <p>${escapeHtml(snapshot.header?.title || '')} | ${escapeHtml(snapshot.header?.validity || '')}</p>
    </div>
    <div class="snapshot-products">
      ${groups.map(g => `
        <div class="snapshot-brand">
          <h4>${escapeHtml(g.brand)}</h4>
          <ul>
            ${g.products.map(p => `
              <li>${escapeHtml(productDisplayName(p))}${formatPrice(p.price, s.currency) ? ` — ${formatPrice(p.price, s.currency)}` : ''}</li>
            `).join('')}
          </ul>
        </div>
      `).join('')}
    </div>
    <div class="snapshot-actions">
      <button class="btn btn-primary" data-export-snap="excel" data-id="${snapshot.id}">Export Excel</button>
      <button class="btn btn-primary" data-export-snap="pdf" data-id="${snapshot.id}">Export PDF</button>
      <button class="btn btn-secondary" data-export-snap="json" data-id="${snapshot.id}">Export JSON</button>
    </div>
  `;

  detail.querySelector('.snapshot-close')?.addEventListener('click', () => {
    detail.classList.add('hidden');
  });

  detail.querySelectorAll('[data-export-snap]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const { exportSnapshot } = await import('./export.js');
      const snap = await getSnapshotById(btn.dataset.id);
      if (snap) exportSnapshot(snap, btn.dataset.exportSnap);
    });
  });

  detail.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export function initHistorySearch() {
  const input = document.getElementById('history-search');
  if (!input) return;
  input.addEventListener('input', (e) => {
    historySearchQuery = e.target.value.trim();
    renderHistoryList(1);
  });
}

export async function populateCompareDates() {
  const snapshots = await getAllSnapshots();
  const dateKeys = [...new Set(snapshots.map(s => s.dateKey))].sort((a, b) => b.localeCompare(a));

  const selectA = document.getElementById('compare-date-a');
  const selectB = document.getElementById('compare-date-b');
  if (!selectA || !selectB) return;

  const options = dateKeys.map((key, i) => {
    const snap = snapshots.find(s => s.dateKey === key);
    return `<option value="${key}">${snap?.date || key}</option>`;
  }).join('');

  selectA.innerHTML = options;
  selectB.innerHTML = options;
  if (dateKeys.length > 1) selectB.selectedIndex = 1;
}
