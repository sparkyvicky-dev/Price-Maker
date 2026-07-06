/**
 * PDF file parsing using PDF.js
 */

import { generateId, detectBrand, parsePrice, parseRamStorage } from './utils.js';

export async function parsePdfFile(file) {
  if (typeof pdfjsLib === 'undefined') {
    throw new Error('PDF.js not loaded. Check internet connection for first load.');
  }

  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;

  let fullText = '';
  let hasText = false;

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map(item => item.str).join(' ');
    if (pageText.trim()) {
      hasText = true;
      fullText += pageText + '\n';
    }
  }

  if (!hasText || fullText.trim().length < 20) {
    throw new Error('This PDF requires OCR. The document appears to be image-based with no extractable text.');
  }

  const products = parseTextToProducts(fullText);
  if (!products.length) {
    throw new Error('Could not extract products from PDF. Try uploading an Excel file instead.');
  }
  return products;
}

function parseTextToProducts(text) {
  const lines = text.split(/[\n\r]+/).map(l => l.trim()).filter(Boolean);
  const products = [];
  let currentBrand = '';

  for (const line of lines) {
    const brandMatch = tryDetectBrandLine(line);
    if (brandMatch) { currentBrand = brandMatch; continue; }
    const product = parseProductLine(line, currentBrand);
    if (product) products.push(product);
  }

  return products.length ? products : parseTableLikeText(text);
}

function tryDetectBrandLine(line) {
  const cleaned = line.trim();
  if (cleaned.length > 30) return null;
  const brand = detectBrand(cleaned, '');
  if (brand !== 'Other' && cleaned.toLowerCase() === brand.toLowerCase()) return brand;
  if (/^(vivo|samsung|oppo|realme|oneplus|motorola|nothing|xiaomi|apple|google)$/i.test(cleaned)) {
    return detectBrand(cleaned, '');
  }
  return null;
}

function parseProductLine(line, currentBrand) {
  const patterns = [
    /(.+?)\s+[₹Rs.]+\s*([\d,]+(?:\.\d+)?)\s*$/i,
    /(.+?)\s+([\d,]+(?:\.\d+)?)\s*(?:rs|₹)?\s*$/i,
    /(.+?)\s{2,}([\d,]+)\s*$/
  ];

  for (const pattern of patterns) {
    const match = line.match(pattern);
    if (match) {
      const price = parsePrice(match[2]);
      if (price <= 0 || price > 500000) continue;
      return buildProductFromName(match[1].trim(), price, currentBrand);
    }
  }
  return null;
}

function buildProductFromName(namePart, price, currentBrand) {
  let brand = currentBrand;
  let model = namePart;
  let ram = '';
  let storage = '';

  const specMatch = namePart.match(/^(.+?)\s+(\d+\s*GB\s*\/\s*\d+\s*GB|\d+GB\/\d+GB)\s*$/i);
  if (specMatch) {
    model = specMatch[1].trim();
    const parsed = parseRamStorage(specMatch[2]);
    ram = parsed.ram;
    storage = parsed.storage;
  }

  if (!brand) brand = detectBrand('', model);
  if (!model) return null;

  return {
    id: generateId(),
    brand,
    model,
    ram: ram.replace(/\s/g, ''),
    storage: storage.replace(/\s/g, ''),
    price,
    previousPrice: null,
    updatedAt: Date.now()
  };
}

function parseTableLikeText(text) {
  const products = [];
  for (const row of text.split(/[\n\r]+/)) {
    const cols = row.split(/\t+| {3,}/).map(c => c.trim()).filter(Boolean);
    if (cols.length < 2) continue;
    const priceCol = cols.findIndex(c => /^[₹Rs.]?\s*[\d,]+$/i.test(c) || /^\d{4,6}$/.test(c));
    if (priceCol < 0) continue;
    const price = parsePrice(cols[priceCol]);
    if (price <= 0) continue;
    products.push({
      id: generateId(),
      brand: detectBrand(cols[0], cols[1] || ''),
      model: cols[1] || cols[0],
      ram: cols[2] && !parsePrice(cols[2]) ? cols[2] : '',
      storage: cols[3] && !parsePrice(cols[3]) ? cols[3] : '',
      price,
      previousPrice: null,
      updatedAt: Date.now()
    });
  }
  return products;
}
