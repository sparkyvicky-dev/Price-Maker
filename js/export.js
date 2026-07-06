/**
 * Export functionality - PDF, Excel, JSON
 */

import { productsToWorkbook, workbookToBuffer } from './excel.js';
import { downloadBlob, formatDate, formatPrice, productDisplayName, groupByBrand, sortProducts } from './utils.js';
import { loadSettings } from './settings.js';
import { getHeaderData, getFooterData, buildFullMessage } from './preview.js';
import { exportAllData } from './db.js';
import { showToast, showLoading } from './utils.js';

export async function exportCurrentExcel(products) {
  const header = buildExportHeader();
  const wb = productsToWorkbook(products, header);
  const buffer = workbookToBuffer(wb);
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  downloadBlob(blob, `price-list-${header.date.replace(/\//g, '-')}.xlsx`);
  showToast('Excel exported successfully', 'success');
}

export async function exportCurrentPdf(products) {
  showLoading(true, 'Generating PDF...');
  try {
    const html = buildPrintableHtml(products);
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showToast('Please allow popups to export PDF', 'error');
      return;
    }
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
      showLoading(false);
      showToast('PDF ready — use Print to Save as PDF', 'success');
    };
  } catch (err) {
    showLoading(false);
    showToast('PDF export failed: ' + err.message, 'error');
  }
}

export async function exportCurrentJson() {
  const data = await exportAllData();
  const settings = loadSettings();
  const full = { ...data, settings };
  const blob = new Blob([JSON.stringify(full, null, 2)], { type: 'application/json' });
  downloadBlob(blob, `sparky-backup-${formatDate(new Date()).replace(/\//g, '-')}.json`);
  showToast('JSON backup exported', 'success');
}

export async function exportSnapshot(snapshot, format) {
  if (format === 'excel') {
    await exportCurrentExcel(snapshot.products || []);
  } else if (format === 'pdf') {
    await exportCurrentPdf(snapshot.products || []);
  } else if (format === 'json') {
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
    downloadBlob(blob, `snapshot-${snapshot.dateKey}.json`);
    showToast('Snapshot JSON exported', 'success');
  }
}

function buildExportHeader() {
  const h = getHeaderData();
  const f = getFooterData();
  return { ...h, footer: f };
}

function buildPrintableHtml(products) {
  const s = loadSettings();
  const header = getHeaderData();
  const footer = getFooterData();
  const groups = groupByBrand(products, s.brandOrder);

  const brandHtml = groups.map(g => `
    <div class="brand-section">
      <h2>${g.brand}</h2>
      <table>
        <tbody>
          ${sortProducts(g.products).map(p => `
            <tr>
              <td>${productDisplayName(p)}</td>
              <td class="price">${formatPrice(p.price, s.currency)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `).join('');

  return `<!DOCTYPE html>
<html><head>
  <title>${header.storeName} - Price List</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; color: #111; }
    h1 { margin: 0 0 4px; font-size: 22px; }
    .meta { color: #555; margin-bottom: 20px; }
    .brand-section { margin-bottom: 16px; page-break-inside: avoid; }
    h2 { font-size: 16px; border-bottom: 2px solid #2563eb; padding-bottom: 4px; color: #2563eb; }
    table { width: 100%; border-collapse: collapse; }
    td { padding: 4px 8px; border-bottom: 1px solid #eee; }
    .price { text-align: right; font-weight: bold; }
    .footer { margin-top: 24px; padding-top: 12px; border-top: 1px solid #ccc; font-size: 12px; color: #666; }
    @media print { body { padding: 0; } }
  </style>
</head><body>
  <h1>${header.storeName}</h1>
  <div class="meta">
    <div>${header.location}</div>
    <div>${header.date} ${header.title}</div>
    <div>${header.validity}</div>
  </div>
  ${brandHtml}
  <div class="footer">
    <div>${footer.line1}</div>
    <div>${footer.line2}</div>
    <div>${footer.line3}</div>
  </div>
</body></html>`;
}

export function printPriceList(products) {
  exportCurrentPdf(products);
}

export function getExportText(products) {
  return buildFullMessage(products);
}
