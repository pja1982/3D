import type { Part, Filament, Printer } from '../types';
import { calculatePrinterRates } from './printerRates';

export interface SquareExportOptions {
  categoryOverride?: string;
  includeCost?: boolean;
  filterMode?: 'all' | 'pod_only' | 'standard_only';
  customTemplateHeaders?: string[];
  defaultLocationName?: string;
}

/**
 * Standard Square Item Library CSV header structure
 */
export const STANDARD_SQUARE_HEADERS = [
  'Reference Handle',
  'Token',
  'Item Name',
  'Variation Name',
  'SKU',
  'Description',
  'Categories',
  'Category',
  'Price',
  'Cost',
  'Tax - Sales Tax',
  'Option Name 1',
  'Option Value 1',
];

/**
 * Helper to escape CSV cell fields
 */
function escapeCsv(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
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
    parts.push(part.description.trim());
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
 * Parses an uploaded CSV from Square to extract headers and detect location/tax columns
 */
export function parseSquareTemplateCsv(csvText: string): {
  headers: string[];
  locationColumns: string[];
  taxColumns: string[];
  sampleRowCount: number;
} {
  const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length === 0) {
    return {
      headers: STANDARD_SQUARE_HEADERS,
      locationColumns: [],
      taxColumns: [],
      sampleRowCount: 0,
    };
  }

  // Parse header row respecting quotes
  const firstLine = lines[0];
  const headers: string[] = [];
  let inQuotes = false;
  let currentField = '';

  for (let i = 0; i < firstLine.length; i++) {
    const char = firstLine[i];
    if (char === '"') {
      if (inQuotes && firstLine[i + 1] === '"') {
        currentField += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      headers.push(currentField.trim());
      currentField = '';
    } else {
      currentField += char;
    }
  }
  headers.push(currentField.trim());

  const locationColumns = headers.filter(h => 
    h.toLowerCase().includes('enabled [') || 
    h.toLowerCase().includes('location') ||
    h.toLowerCase().includes('current quantity [')
  );

  const taxColumns = headers.filter(h => 
    h.toLowerCase().startsWith('tax -') || 
    h.toLowerCase().includes('tax')
  );

  return {
    headers: headers.length > 0 ? headers : STANDARD_SQUARE_HEADERS,
    locationColumns,
    taxColumns,
    sampleRowCount: Math.max(0, lines.length - 1),
  };
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

  filteredParts.forEach(part => {
    const estimatedCost = estimatePartCost(part, filaments, printers);
    const suggestedPrice = part.customUnitPrice !== null && part.customUnitPrice !== undefined
      ? part.customUnitPrice
      : parseFloat((estimatedCost * 1.5).toFixed(2));

    const defaultCategory = part.category || categoryOverride || (part.isPrintOnDemand ? 'Print on Demand' : '3D Printed Parts');
    const description = buildSquareDescription(part, filaments);
    const referenceHandle = part.id || part.name.toLowerCase().replace(/[^a-z0-9_-]/g, '-');
    const sku = part.sku || (part.isPrintOnDemand ? `POD-${referenceHandle.substring(0, 8)}` : `3DP-${referenceHandle.substring(0, 8)}`);

    // Map each header column
    const rowValues = headers.map(header => {
      const hLower = header.toLowerCase();

      if (hLower === 'reference handle' || hLower === 'handle') {
        return referenceHandle;
      }
      if (hLower === 'token') {
        return ''; // Left blank for new Square items
      }
      if (hLower === 'item name' || hLower === 'item') {
        return part.name || 'Untitled Part';
      }
      if (hLower === 'variation name' || hLower === 'variation') {
        return part.isPrintOnDemand ? 'Print on Demand' : 'Standard';
      }
      if (hLower === 'sku') {
        return sku;
      }
      if (hLower === 'description') {
        return description;
      }
      if (hLower === 'category' || hLower === 'categories') {
        return defaultCategory;
      }
      if (hLower === 'price') {
        return suggestedPrice.toFixed(2);
      }
      if (hLower === 'cost') {
        return includeCost ? estimatedCost.toFixed(2) : '';
      }
      if (hLower.startsWith('tax -') || hLower === 'tax') {
        return 'Y'; // Enabled by default
      }
      if (hLower.startsWith('enabled [') || hLower === 'enabled') {
        return 'Y'; // Enabled at store location
      }
      if (hLower === 'option name 1') {
        return part.isPrintOnDemand ? 'Fabrication Type' : '';
      }
      if (hLower === 'option value 1') {
        return part.isPrintOnDemand ? 'Customer Supplied Model' : '';
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
