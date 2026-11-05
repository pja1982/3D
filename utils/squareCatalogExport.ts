import type { Part, Filament, Printer } from '../types';
import { calculatePrinterRates } from './printerRates';

export interface SquareExistingItem {
  token: string;
  itemName: string;
  customerFacingName?: string;
  variationName: string;
  sku?: string;
  description?: string;
  categories?: string;
  reportingCategory?: string;
  price?: string;
  taxGst?: string;
}

export interface SquareExportOptions {
  categoryOverride?: string;
  includeCost?: boolean;
  filterMode?: 'all' | 'pod_only' | 'standard_only';
  customTemplateHeaders?: string[];
  existingItems?: SquareExistingItem[];
  prefixPodItems?: boolean;                  // Prefix POD items with 'POD - ' (default: true for POD)
  defaultVariationName?: string;              // 'Regular' (Square convention)
  skuMode?: 'blank_if_unset' | 'unique_sequential'; // Default: 'blank_if_unset' (Square recommended to avoid collisions)
  taxRateValue?: string;                      // 'N' or 'Y' (default: 'N' if in Australia/template, or 'Y')
}

/**
 * Standard Square Item Library CSV header structure
 */
export const STANDARD_SQUARE_HEADERS = [
  'Token',
  'Item Name',
  'Customer-facing name',
  'Variation Name',
  'SKU',
  'Description',
  'Categories',
  'Reporting category',
  'GTIN',
  'Item type',
  'Weight (kg)',
  'Social Media Link Title',
  'Social Media Link Description',
  'Price',
  'Online sale price',
  'Archived',
  'Sellable',
  'Contains alcohol',
  'Stockable',
  'Skip Detail Screen in POS',
  'Pre-select first variation',
  'Option Name 1',
  'Option Value 1',
  'Cost',
  'Tax - GST (10%)',
];

/**
 * Normalizes Unicode punctuation (em-dashes, en-dashes, curly quotes) to prevent encoding artifacts in CSV exports
 */
export function sanitizeUnicode(str: string): string {
  if (!str) return '';
  return str
    .replace(/[\u2010\u2011\u2012\u2013\u2014\u2015\u2212]/g, '-') // Normalize em-dashes and hyphens
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")                     // Normalize single quotes
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"')                     // Normalize double quotes
    .replace(/[\u2026]/g, '...')                                     // Normalize ellipsis
    .replace(/[\u00A0\u2007\u202F]/g, ' ')                           // Normalize non-breaking spaces
    .replace(/\uFFFD/g, '-');                                        // Replace Unicode replacement characters
}

/**
 * Helper to escape CSV cell fields
 */
function escapeCsv(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = sanitizeUnicode(String(value));
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Calculates estimated manufacturing cost for a catalog part
 */
export function estimatePartCost(part: Part, filaments: Filament[] = [], printers: Printer[] = []): number {
  let materialCost = 0;
  if (part.colors && part.colors.length > 0) {
    materialCost = part.colors.reduce((sum, c) => {
      const fil = filaments.find(f => f.id === c.filamentId);
      const costPerKg = fil ? fil.costPerKg : 22.00;
      return sum + ((c.grams || 0) / 1000) * costPerKg;
    }, 0);
  } else {
    const fil = filaments.find(f => f.id === part.filamentId);
    const costPerKg = fil ? fil.costPerKg : 20.00;
    materialCost = ((part.filamentGrams || 50) / 1000) * costPerKg;
  }

  const printer = printers.find(p => p.id === part.printerId);
  const printerWatts = printer?.watts || 250;
  const rates = calculatePrinterRates(printer);
  const electricityCost = (part.printHours || 2.5) * (printerWatts / 1000) * 0.25;
  const machineCost = (part.printHours || 2.5) * (rates.totalHourlyRate || 0.50);
  const laborCost = (part.postProcessingHours || 0.25) * 25.00;
  const hardware = part.hardwareCost || 0;

  return parseFloat((materialCost + electricityCost + machineCost + laborCost + hardware).toFixed(2));
}

/**
 * Builds the comprehensive Square item description including print specs and licensing notes
 */
export function buildSquareDescription(part: Part, filaments: Filament[] = []): string {
  const parts: string[] = [];

  if (part.description && part.description.trim()) {
    parts.push(sanitizeUnicode(part.description.trim()));
  }

  const specs: string[] = [];
  specs.push(`Weight: ${part.filamentGrams || 0}g`);
  const hours = Math.floor(part.printHours || 0);
  const mins = Math.round(((part.printHours || 0) - hours) * 60);
  specs.push(`Print Duration: ${hours > 0 ? `${hours}h ` : ''}${mins}m`);

  if (part.colors && part.colors.length > 1) {
    const colorNames = part.colors.map(c => {
      const fil = filaments.find(f => f.id === c.filamentId);
      return fil ? `${fil.brand} ${fil.colorName || fil.type}` : 'Filament';
    }).join(' + ');
    specs.push(`Colors: ${colorNames}`);
  } else if (part.filamentId) {
    const fil = filaments.find(f => f.id === part.filamentId);
    if (fil) {
      specs.push(`Material: ${fil.brand} ${fil.type}${fil.colorName ? ` (${fil.colorName})` : ''}`);
    }
  }

  if (specs.length > 0) {
    parts.push(`Specifications: ${specs.join(' | ')}`);
  }

  if (part.isPrintOnDemand) {
    parts.push(`[PRINT ON DEMAND: Customer supplied 3D model files (.STL/.STEP/.3MF) with verified commercial/fabrication licensing terms.]`);
  }

  return parts.join('\n\n');
}

/**
 * Robust CSV Line Parser that handles quoted multi-line content
 */
function parseCsvRows(csvText: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  const text = csvText.replace(/^\uFEFF/, ''); // strip BOM if present

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentField += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      currentRow.push(currentField);
      currentField = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++; // skip \n in CRLF
      }
      currentRow.push(currentField);
      currentField = '';
      if (currentRow.length > 1 || (currentRow.length === 1 && currentRow[0].trim() !== '')) {
        rows.push(currentRow);
      }
      currentRow = [];
    } else {
      currentField += char;
    }
  }

  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  return rows;
}

/**
 * Parses an uploaded CSV from Square to extract headers, location/tax columns,
 * and existing Square items to enable token matching and updating.
 */
export function parseSquareTemplateCsv(csvText: string): {
  headers: string[];
  locationColumns: string[];
  taxColumns: string[];
  defaultTaxValue: string;
  existingItems: SquareExistingItem[];
  sampleRowCount: number;
} {
  const rows = parseCsvRows(csvText);
  if (rows.length === 0) {
    return {
      headers: STANDARD_SQUARE_HEADERS,
      locationColumns: [],
      taxColumns: [],
      defaultTaxValue: 'N',
      existingItems: [],
      sampleRowCount: 0,
    };
  }

  const rawHeaders = rows[0].map(h => h.trim());
  const headers = rawHeaders.length > 0 ? rawHeaders : STANDARD_SQUARE_HEADERS;

  const tokenIdx = headers.findIndex(h => h.toLowerCase() === 'token');
  const itemNameIdx = headers.findIndex(h => h.toLowerCase() === 'item name');
  const customerFacingNameIdx = headers.findIndex(h => h.toLowerCase() === 'customer-facing name');
  const variationNameIdx = headers.findIndex(h => h.toLowerCase() === 'variation name');
  const skuIdx = headers.findIndex(h => h.toLowerCase() === 'sku');
  const descriptionIdx = headers.findIndex(h => h.toLowerCase() === 'description');
  const categoriesIdx = headers.findIndex(h => h.toLowerCase() === 'categories');
  const reportingCategoryIdx = headers.findIndex(h => h.toLowerCase() === 'reporting category');
  const priceIdx = headers.findIndex(h => h.toLowerCase() === 'price');
  const taxGstIdx = headers.findIndex(h => h.toLowerCase().startsWith('tax -') || h.toLowerCase() === 'tax');

  const locationColumns = headers.filter(h => {
    const l = h.toLowerCase();
    return l.includes('enabled [') || 
           l.includes('quantity') ||
           l.includes('stock alert');
  });

  const taxColumns = headers.filter(h => 
    h.toLowerCase().startsWith('tax -') || 
    h.toLowerCase().includes('tax')
  );

  let defaultTaxValue = 'N';
  const existingItems: SquareExistingItem[] = [];

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (row.length === 0 || (row.length === 1 && !row[0].trim())) continue;

    const token = tokenIdx >= 0 ? (row[tokenIdx] || '').trim() : '';
    const itemName = itemNameIdx >= 0 ? (row[itemNameIdx] || '').trim() : '';
    const variationName = variationNameIdx >= 0 ? (row[variationNameIdx] || '').trim() : 'Regular';
    const sku = skuIdx >= 0 ? (row[skuIdx] || '').trim() : '';
    const description = descriptionIdx >= 0 ? (row[descriptionIdx] || '').trim() : '';
    const categories = categoriesIdx >= 0 ? (row[categoriesIdx] || '').trim() : '';
    const reportingCategory = reportingCategoryIdx >= 0 ? (row[reportingCategoryIdx] || '').trim() : '';
    const price = priceIdx >= 0 ? (row[priceIdx] || '').trim() : '';
    const taxVal = taxGstIdx >= 0 ? (row[taxGstIdx] || '').trim() : '';

    if (taxVal && (taxVal === 'Y' || taxVal === 'N')) {
      defaultTaxValue = taxVal;
    }

    if (itemName) {
      existingItems.push({
        token,
        itemName,
        customerFacingName: customerFacingNameIdx >= 0 ? (row[customerFacingNameIdx] || '').trim() : '',
        variationName: variationName || 'Regular',
        sku,
        description,
        categories,
        reportingCategory,
        price,
        taxGst: taxVal,
      });
    }
  }

  return {
    headers,
    locationColumns,
    taxColumns,
    defaultTaxValue,
    existingItems,
    sampleRowCount: existingItems.length,
  };
}

/**
 * Finds a matching Square item from an uploaded Square catalogue CSV.
 * Supports exact name matching, 'POD - ' prefixed matching, and variation matching.
 */
export function findMatchingSquareItem(
  part: Part,
  existingItems: SquareExistingItem[] = []
): SquareExistingItem | undefined {
  if (!existingItems || existingItems.length === 0) return undefined;

  const cleanPartName = sanitizeUnicode(part.name.trim()).toLowerCase();
  const podNameLower = `pod - ${cleanPartName}`;
  const podNoSpaceLower = `pod- ${cleanPartName}`;

  // 1. Direct name match (e.g. "Balls" matches "POD - Balls" or "Balls")
  const directMatch = existingItems.find(item => {
    const itemLower = sanitizeUnicode(item.itemName.trim()).toLowerCase();
    return itemLower === cleanPartName ||
           itemLower === podNameLower ||
           itemLower === podNoSpaceLower;
  });
  if (directMatch) return directMatch;

  // 2. Part name containing variation (e.g. "Flexi Spider Redback" matches item "POD - Flexi Spider", variation "Redback")
  const variationMatch = existingItems.find(item => {
    const itemLower = sanitizeUnicode(item.itemName.trim()).toLowerCase();
    const itemBase = itemLower.replace(/^pod\s*-\s*/, '').trim();
    const varLower = sanitizeUnicode(item.variationName.trim()).toLowerCase();

    if (varLower && varLower !== 'regular' && cleanPartName.includes(itemBase) && cleanPartName.includes(varLower)) {
      return true;
    }

    const combined = `${itemBase} ${varLower}`.trim();
    if (combined === cleanPartName || `pod - ${combined}` === cleanPartName) {
      return true;
    }

    return false;
  });
  if (variationMatch) return variationMatch;

  // 3. Substring match for longer titles
  const substringMatch = existingItems.find(item => {
    const itemBase = sanitizeUnicode(item.itemName.trim()).toLowerCase().replace(/^pod\s*-\s*/, '').trim();
    if (itemBase.length >= 6) {
      return cleanPartName.startsWith(itemBase) || itemBase.startsWith(cleanPartName);
    }
    return false;
  });

  return substringMatch;
}

/**
 * Exports parts into Square Catalog CSV string
 */
export function generateSquareCatalogCsv(
  parts: Part[],
  filaments: Filament[] = [],
  printers: Printer[] = [],
  options: SquareExportOptions = {}
): string {
  const {
    categoryOverride,
    includeCost = true,
    filterMode = 'all',
    customTemplateHeaders,
    existingItems = [],
    prefixPodItems = true,
    defaultVariationName = 'Regular',
    skuMode = 'blank_if_unset',
    taxRateValue = 'N',
  } = options;

  let filteredParts = parts;
  if (filterMode === 'pod_only') {
    filteredParts = parts.filter(p => p.isPrintOnDemand);
  } else if (filterMode === 'standard_only') {
    filteredParts = parts.filter(p => !p.isPrintOnDemand);
  }

  const headers = (customTemplateHeaders && customTemplateHeaders.length > 0)
    ? customTemplateHeaders
    : STANDARD_SQUARE_HEADERS;

  // Header row
  const csvRows: string[] = [headers.map(escapeCsv).join(',')];

  // Track used SKUs across this export to prevent duplicate SKU warnings in Square
  const usedSkus = new Set<string>();

  filteredParts.forEach((part, index) => {
    const matchedSquareItem = findMatchingSquareItem(part, existingItems);
    const estimatedCost = estimatePartCost(part, filaments, printers);
    
    // Selling price: prioritize customUnitPrice set on part, then matched Square price, then auto markup
    const customPriceNum = (typeof part.customUnitPrice === 'number' && !isNaN(part.customUnitPrice))
      ? part.customUnitPrice
      : (part.customUnitPrice ? parseFloat(String(part.customUnitPrice)) : null);

    let suggestedPrice = 0;
    if (customPriceNum !== null && !isNaN(customPriceNum) && customPriceNum >= 0) {
      suggestedPrice = customPriceNum;
    } else if (matchedSquareItem?.price && !isNaN(parseFloat(matchedSquareItem.price))) {
      suggestedPrice = parseFloat(matchedSquareItem.price);
    } else {
      suggestedPrice = parseFloat((estimatedCost * 1.5).toFixed(2));
    }

    // Item Name: If POD and prefixPodItems is enabled, format as "POD - Part Name" matching user's Square convention
    const cleanName = sanitizeUnicode(part.name.trim()) || 'Untitled Part';
    let squareItemName = cleanName;
    if (matchedSquareItem?.itemName) {
      squareItemName = matchedSquareItem.itemName;
    } else if (part.isPrintOnDemand && prefixPodItems) {
      if (!cleanName.toLowerCase().startsWith('pod - ') && !cleanName.toLowerCase().startsWith('pod-')) {
        squareItemName = `POD - ${cleanName}`;
      }
    }

    // Variation Name: Square defaults to "Regular" (or specific variation like "1 Colour", "Redback")
    let variationName = defaultVariationName;
    if (matchedSquareItem?.variationName) {
      variationName = matchedSquareItem.variationName;
    }

    // Categories: POD parts default to "POD" (matching user's Square store), standard items to "3D Prints"
    let category = categoryOverride || part.category;
    if (!category) {
      if (matchedSquareItem?.categories) {
        category = matchedSquareItem.categories;
      } else if (part.isPrintOnDemand) {
        category = 'POD';
      } else {
        category = '3D Prints';
      }
    }

    // Reporting Category: matches category in Square
    const reportingCategory = category;

    // SKU: Square recommends leaving SKU BLANK if not using physical barcode tracking.
    // If auto-generating, MUST be 100% unique per row to prevent Square duplicate SKU errors.
    let sku = '';
    if (skuMode === 'blank_if_unset') {
      if (part.sku && part.sku.trim()) {
        sku = part.sku.trim();
      } else if (matchedSquareItem?.sku && matchedSquareItem.sku.trim()) {
        sku = matchedSquareItem.sku.trim();
      } else {
        sku = ''; // Clean empty SKU: Square imports without any SKU collision warning
      }
    } else {
      // Unique sequential SKU mode (e.g. POD-001, POD-002, 3DP-001)
      if (part.sku && part.sku.trim()) {
        sku = part.sku.trim();
      } else if (matchedSquareItem?.sku && matchedSquareItem.sku.trim()) {
        sku = matchedSquareItem.sku.trim();
      } else {
        const prefix = part.isPrintOnDemand ? 'POD' : '3DP';
        sku = `${prefix}-${String(index + 1).padStart(3, '0')}`;
      }

      // Safeguard against duplicate SKUs
      if (sku && usedSkus.has(sku)) {
        sku = `${sku}-${index + 1}`;
      }
    }

    if (sku) {
      usedSkus.add(sku);
    }

    const description = buildSquareDescription(part, filaments);
    const referenceHandle = part.id || part.name.toLowerCase().replace(/[^a-z0-9_-]/g, '-');

    // Square Token: When matched, PRESERVE token so Square UPDATES the existing item!
    // When not matched, leave blank so Square creates a new item.
    const token = matchedSquareItem?.token || '';

    // Map each header column in exact template sequence
    const rowValues = headers.map(header => {
      const hLower = header.toLowerCase();

      if (hLower === 'token') {
        return token;
      }
      if (hLower === 'reference handle' || hLower === 'handle') {
        return referenceHandle;
      }
      if (hLower === 'item name' || hLower === 'item') {
        return squareItemName;
      }
      if (hLower === 'customer-facing name') {
        return matchedSquareItem?.customerFacingName || '';
      }
      if (hLower === 'variation name' || hLower === 'variation') {
        return variationName;
      }
      if (hLower === 'sku') {
        return sku;
      }
      if (hLower === 'description') {
        return description;
      }
      if (hLower === 'categories' || hLower === 'category') {
        return category;
      }
      if (hLower === 'reporting category') {
        return reportingCategory;
      }
      if (hLower === 'gtin') {
        return '';
      }
      if (hLower === 'item type') {
        return 'Physical good';
      }
      if (hLower.includes('weight')) {
        return ((part.filamentGrams || 0) / 1000).toFixed(3);
      }
      if (hLower === 'price') {
        return suggestedPrice.toFixed(2);
      }
      if (hLower === 'cost') {
        return includeCost ? estimatedCost.toFixed(2) : '';
      }
      if (hLower === 'archived') {
        return 'N';
      }
      if (hLower === 'sellable') {
        return 'Y';
      }
      if (hLower === 'contains alcohol') {
        return 'N';
      }
      if (hLower === 'stockable') {
        return 'N';
      }
      if (hLower === 'skip detail screen in pos') {
        return 'N';
      }
      if (hLower === 'pre-select first variation') {
        return 'Y';
      }
      if (hLower.startsWith('tax -') || hLower === 'tax') {
        return taxRateValue; // Configurable tax setting ('N' or 'Y')
      }
      if (hLower.startsWith('enabled [') || hLower === 'enabled') {
        return 'Y'; // Enabled at store location
      }
      if (hLower === 'option name 1') {
        return '';
      }
      if (hLower === 'option value 1') {
        return '';
      }
      // Inventory quantity columns (leave blank for print on demand / made to order items)
      if (hLower.includes('quantity') || hLower.includes('stock alert')) {
        return '';
      }
      return '';
    });

    csvRows.push(rowValues.map(escapeCsv).join(','));
  });

  return csvRows.join('\r\n');
}

/**
 * Triggers a browser download of the CSV with UTF-8 BOM so Excel and Square handle it cleanly
 */
export function downloadSquareCsvFile(filename: string, csvContent: string): void {
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
