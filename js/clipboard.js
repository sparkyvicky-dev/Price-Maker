/**
 * Clipboard copy functionality
 */

import { showToast } from './utils.js';
import { buildBrandMessage, buildFullMessage, buildSelectedMessage } from './preview.js';

export async function copyToClipboard(text) {
  if (!text?.trim()) {
    showToast('Nothing to copy', 'warning');
    return false;
  }
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    showToast('Copied Successfully', 'success');
    return true;
  } catch (err) {
    showToast('Failed to copy. Please try again.', 'error');
    console.error('Copy failed:', err);
    return false;
  }
}

export async function copyBrand(brand, products) {
  const message = buildBrandMessage(brand, products, {
    includeHeader: false,
    includeFooter: false
  });
  return copyToClipboard(message);
}

export async function copyFullList(products, options = {}) {
  return copyToClipboard(buildFullMessage(products, options));
}

export async function copySelected(products, selectedIds, options = {}) {
  if (!selectedIds?.size) {
    showToast('Tick at least one model to copy', 'warning');
    return false;
  }
  const message = buildSelectedMessage(products, selectedIds, {
    includeHeader: false,
    includeFooter: false,
    ...options
  });
  return copyToClipboard(message);
}
