import type React from 'react';
import type { Filament, SpoolProperties } from '../types';

/**
 * Exact sample filament spool profiles exported from https://3dfilamentprofiles.com/ (SpoolDB)
 */
export const USER_SAMPLE_3D_FILAMENT_PROFILES_JSON = `[
  {
    "short_code": "oPljzSdr8",
    "spool_url": "https://spooldb.com/s/oPljzSdr8",
    "brand": "3D Fillies",
    "material": "PETG",
    "material_type": "Basic",
    "color": "Black",
    "rgb": "#000000",
    "td_value": null,
    "notes": null,
    "location": "Shelf",
    "remaining_grams": 1000,
    "empty_spool_weight": null,
    "updated_at": "2026-09-30T11:09:32.39+00:00",
    "spool_properties": {
      "purchase_date": null,
      "last_dried_date": null
    },
    "filament_id": 23879
  },
  {
    "short_code": "QRA77jN43",
    "spool_url": "https://spooldb.com/s/QRA77jN43",
    "brand": "Bambu Lab",
    "material": "PETG",
    "material_type": "Basic",
    "color": "Green (30502)",
    "rgb": "#009639",
    "td_value": null,
    "notes": null,
    "location": "Shelf: Home",
    "remaining_grams": 1000,
    "empty_spool_weight": 240,
    "updated_at": "2026-10-15T09:26:26.643+00:00",
    "spool_properties": {
      "purchase_date": null,
      "last_dried_date": null
    },
    "filament_id": 27560
  },
  {
    "short_code": "9LF44Atq1",
    "spool_url": "https://spooldb.com/s/9LF44Atq1",
    "brand": "Bambu Lab",
    "material": "PETG",
    "material_type": "Basic",
    "color": "Red (30201)",
    "rgb": "#D6001C",
    "td_value": null,
    "notes": null,
    "location": "Shelf: Home",
    "remaining_grams": 1000,
    "empty_spool_weight": 240,
    "updated_at": "2026-10-15T09:27:00.457+00:00",
    "spool_properties": {
      "purchase_date": null,
      "last_dried_date": null
    },
    "filament_id": 24048
  },
  {
    "short_code": "aCtAAtKN8",
    "spool_url": "https://spooldb.com/s/aCtAAtKN8",
    "brand": "Bambu Lab",
    "material": "PETG",
    "material_type": "Matte",
    "color": "Lime (35500)",
    "rgb": "#C0DF16",
    "td_value": null,
    "notes": null,
    "location": "Shelf: Home",
    "remaining_grams": 1000,
    "empty_spool_weight": 240,
    "updated_at": "2026-10-15T09:24:57.622+00:00",
    "spool_properties": {
      "purchase_date": null,
      "last_dried_date": null
    },
    "filament_id": 36119
  },
  {
    "short_code": "1O7qquKLU",
    "spool_url": "https://spooldb.com/s/1O7qquKLU",
    "brand": "Bambu Lab",
    "material": "PLA",
    "material_type": "Basic",
    "color": "Brown (10800)",
    "rgb": "#9D432C",
    "td_value": 2,
    "notes": null,
    "location": "Shelf: Home",
    "remaining_grams": 1000,
    "empty_spool_weight": 240,
    "updated_at": "2026-10-15T08:57:02.687+00:00",
    "spool_properties": {
      "purchase_date": null,
      "last_dried_date": null
    },
    "filament_id": 143
  },
  {
    "short_code": "UKLAA47WF",
    "spool_url": "https://spooldb.com/s/UKLAA47WF",
    "brand": "Bambu Lab",
    "material": "PLA",
    "material_type": "Basic",
    "color": "Hot Pink (10204)",
    "rgb": "#F5547C",
    "td_value": 3.7,
    "notes": null,
    "location": "Shelf: Home",
    "remaining_grams": 1000,
    "empty_spool_weight": 240,
    "updated_at": "2026-10-15T09:19:06.42+00:00",
    "spool_properties": {
      "purchase_date": null,
      "last_dried_date": null
    },
    "filament_id": 900
  },
  {
    "short_code": "SxIvvQbsG",
    "spool_url": "https://spooldb.com/s/SxIvvQbsG",
    "brand": "Bambu Lab",
    "material": "PLA",
    "material_type": "Basic",
    "color": "Maroon Red (10205)",
    "rgb": "#9D2235",
    "td_value": 3,
    "notes": null,
    "location": "Shelf: Home",
    "remaining_grams": 1000,
    "empty_spool_weight": 240,
    "updated_at": "2026-10-15T09:23:22.621+00:00",
    "spool_properties": {
      "purchase_date": null,
      "last_dried_date": null
    },
    "filament_id": 901
  },
  {
    "short_code": "N2z88Z9X9",
    "spool_url": "https://spooldb.com/s/N2z88Z9X9",
    "brand": "Bambu Lab",
    "material": "PLA",
    "material_type": "Basic",
    "color": "Maroon Red (10205)",
    "rgb": "#9D2235",
    "td_value": 3,
    "notes": null,
    "location": "Shelf: Home",
    "remaining_grams": 1000,
    "empty_spool_weight": 240,
    "updated_at": "2026-10-15T09:04:11.456+00:00",
    "spool_properties": {
      "purchase_date": null,
      "last_dried_date": null
    },
    "filament_id": 901
  },
  {
    "short_code": "da45KM8wJ",
    "spool_url": "https://spooldb.com/s/da45KM8wJ",
    "brand": "Bambu Lab",
    "material": "PLA",
    "material_type": "Matte",
    "color": "Lilac Purple (11700)",
    "rgb": "#AE96D4",
    "td_value": 2,
    "notes": null,
    "location": "Shelf",
    "remaining_grams": 1000,
    "empty_spool_weight": 240,
    "updated_at": "2026-09-30T11:24:07.57+00:00",
    "spool_properties": {
      "purchase_date": null,
      "last_dried_date": null
    },
    "filament_id": 158
  },
  {
    "short_code": "AesCCjv1w",
    "spool_url": "https://spooldb.com/s/AesCCjv1w",
    "brand": "Bambu Lab",
    "material": "PLA",
    "material_type": "Silk+",
    "color": "Purple (13702)",
    "rgb": "#8671CB",
    "td_value": 1,
    "notes": null,
    "location": "Shelf: Home",
    "remaining_grams": 1000,
    "empty_spool_weight": 240,
    "updated_at": "2026-10-15T09:23:17.939+00:00",
    "spool_properties": {
      "purchase_date": null,
      "last_dried_date": null
    },
    "filament_id": 2767
  },
  {
    "short_code": "QRAWdZd43",
    "spool_url": "https://spooldb.com/s/QRAWdZd43",
    "brand": "ELEGOO",
    "material": "PLA",
    "material_type": "Matte",
    "color": "Sunshine Yellow",
    "rgb": "#F9E069",
    "td_value": 10,
    "notes": null,
    "location": "Shelf",
    "remaining_grams": 1000,
    "empty_spool_weight": 147,
    "updated_at": "2026-09-30T10:33:48.838+00:00",
    "spool_properties": {
      "purchase_date": null,
      "last_dried_date": null
    },
    "filament_id": 323
  },
  {
    "short_code": "OyJSEj9L7",
    "spool_url": "https://spooldb.com/s/OyJSEj9L7",
    "brand": "ELEGOO",
    "material": "PLA+/Pro",
    "material_type": "Basic",
    "color": "Wood Colour",
    "rgb": "#9A7B4F",
    "td_value": null,
    "notes": null,
    "location": "Shelf",
    "remaining_grams": 1000,
    "empty_spool_weight": 150,
    "updated_at": "2026-09-28T03:00:31.607+00:00",
    "spool_properties": {
      "purchase_date": null,
      "last_dried_date": null
    },
    "filament_id": 1307
  },
  {
    "short_code": "N2zkfh6X9",
    "spool_url": "https://spooldb.com/s/N2zkfh6X9",
    "brand": "ProTech",
    "material": "PLA",
    "material_type": "Panchroma Silk",
    "color": "Blue/Purple/Yellow",
    "rgb": "#1839F0,#EF25F0,#F0D62E",
    "td_value": null,
    "notes": null,
    "location": "Shelf",
    "remaining_grams": 1000,
    "empty_spool_weight": 150,
    "updated_at": "2026-09-30T11:29:59.832+00:00",
    "spool_properties": {
      "purchase_date": null,
      "last_dried_date": null
    },
    "filament_id": 2395
  },
  {
    "short_code": "s68nO56j7",
    "spool_url": "https://spooldb.com/s/s68nO56j7",
    "brand": "ProTech",
    "material": "PLA",
    "material_type": "Panchroma Silk",
    "color": "Dark Blue & Fuchsia & Dark Green",
    "rgb": "#00006A,#800080,#002F00",
    "td_value": null,
    "notes": null,
    "location": "Shelf",
    "remaining_grams": 1000,
    "empty_spool_weight": 150,
    "updated_at": "2026-09-30T11:30:19.593+00:00",
    "spool_properties": {
      "purchase_date": null,
      "last_dried_date": null
    },
    "filament_id": 12074
  },
  {
    "short_code": "kAKfSQJTe",
    "spool_url": "https://spooldb.com/s/kAKfSQJTe",
    "brand": "ProTech",
    "material": "PLA",
    "material_type": "Panchroma Silk",
    "color": "Red Copper & Purple & Dark Green",
    "rgb": "#990000,#550055,#003900",
    "td_value": null,
    "notes": null,
    "location": "Shelf",
    "remaining_grams": 1000,
    "empty_spool_weight": 150,
    "updated_at": "2026-09-30T11:30:26.357+00:00",
    "spool_properties": {
      "purchase_date": null,
      "last_dried_date": null
    },
    "filament_id": 12073
  },
  {
    "short_code": "SxII5agsG",
    "spool_url": "https://spooldb.com/s/SxII5agsG",
    "brand": "SUNLU",
    "material": "PLA+/Pro",
    "material_type": "Silk",
    "color": "Black",
    "rgb": "#1E201F",
    "td_value": null,
    "notes": null,
    "location": "Shelf",
    "remaining_grams": 1000,
    "empty_spool_weight": 55,
    "updated_at": "2026-09-30T10:33:00.659+00:00",
    "spool_properties": {
      "purchase_date": null,
      "last_dried_date": null
    },
    "filament_id": 1560
  },
  {
    "short_code": "UKLDeUSWF",
    "spool_url": "https://spooldb.com/s/UKLDeUSWF",
    "brand": "SUNLU",
    "material": "PLA+/Pro",
    "material_type": "Silk",
    "color": "Blue",
    "rgb": "#0056A1",
    "td_value": 5,
    "notes": null,
    "location": "Shelf",
    "remaining_grams": 1000,
    "empty_spool_weight": 162,
    "updated_at": "2026-09-30T10:29:30.931+00:00",
    "spool_properties": {
      "purchase_date": null,
      "last_dried_date": null
    },
    "filament_id": 2259
  },
  {
    "short_code": "da45AmvwJ",
    "spool_url": "https://spooldb.com/s/da45AmvwJ",
    "brand": "SUNLU",
    "material": "PLA+/Pro",
    "material_type": "Silk",
    "color": "Dark Purple",
    "rgb": "#400080",
    "td_value": null,
    "notes": null,
    "location": "Shelf",
    "remaining_grams": 1000,
    "empty_spool_weight": 170,
    "updated_at": "2026-09-28T04:00:09.442+00:00",
    "spool_properties": {
      "purchase_date": null,
      "last_dried_date": null
    },
    "filament_id": 7857
  },
  {
    "short_code": "1O7Oor6LU",
    "spool_url": "https://spooldb.com/s/1O7Oor6LU",
    "brand": "SUNLU",
    "material": "PLA+/Pro",
    "material_type": "Silk",
    "color": "Orange",
    "rgb": "#DF7930",
    "td_value": null,
    "notes": null,
    "location": "Shelf",
    "remaining_grams": 1000,
    "empty_spool_weight": 170,
    "updated_at": "2026-09-30T10:30:12.959+00:00",
    "spool_properties": {
      "purchase_date": null,
      "last_dried_date": null
    },
    "filament_id": 4026
  },
  {
    "short_code": "4tO4Qwqlh",
    "spool_url": "https://spooldb.com/s/4tO4Qwqlh",
    "brand": "SUNLU",
    "material": "PLA+/Pro",
    "material_type": "Silk",
    "color": "Red",
    "rgb": "#FF0000",
    "td_value": null,
    "notes": null,
    "location": "Shelf",
    "remaining_grams": 1000,
    "empty_spool_weight": 162,
    "updated_at": "2026-09-30T10:30:23.31+00:00",
    "spool_properties": {
      "purchase_date": null,
      "last_dried_date": null
    },
    "filament_id": 4313
  }
]`;

export interface SpoolDBExportItem {
  short_code: string;
  spool_url: string | null;
  brand: string;
  material: string;
  material_type: string;
  color: string;
  rgb: string;
  td_value: number | null;
  notes: string | null;
  location: string | null;
  remaining_grams: number;
  empty_spool_weight: number | null;
  updated_at: string;
  spool_properties: SpoolProperties;
  filament_id: number | null;
}

/**
 * Normalizes a hex color string, prefixing '#' if missing.
 */
export const normalizeHex = (hex?: string): string => {
  if (!hex) return '#3b82f6';
  let cleaned = hex.trim();
  if (!cleaned.startsWith('#')) {
    cleaned = `#${cleaned}`;
  }
  return cleaned;
};

/**
 * Determines contrast theme for text over a background color or gradient.
 */
export const getContrastTheme = (hexColor?: string): 'dark-on-light' | 'light-on-dark' => {
  if (!hexColor) return 'light-on-dark';
  // If multi-color, analyze the first color
  const firstHex = hexColor.split(',')[0].trim();
  let hex = firstHex.replace('#', '').trim();
  if (hex.length === 3) {
    hex = hex.split('').map(c => c + c).join('');
  }
  if (hex.length !== 6) return 'light-on-dark';

  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return 'light-on-dark';

  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 145 ? 'dark-on-light' : 'light-on-dark';
};

/**
 * Returns CSS properties for single color or multi-color gradients (e.g. ProTech Panchroma Silk).
 */
export const getFilamentBackgroundStyle = (colorHex?: string, rgb?: string): React.CSSProperties => {
  const colorStr = (rgb || colorHex || '#3b82f6').trim();
  if (colorStr.includes(',')) {
    const segments = colorStr.split(',').map(c => normalizeHex(c.trim())).filter(Boolean);
    if (segments.length > 1) {
      return {
        background: `linear-gradient(135deg, ${segments.join(', ')})`,
      };
    }
  }
  return {
    backgroundColor: normalizeHex(colorStr),
  };
};

/**
 * Generates a clean 9-character random short code similar to SpoolDB (e.g. 'q8X9aB12z')
 */
export const generateShortCode = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 9; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

export interface ParseResult {
  filaments: Filament[];
  rawCount: number;
  errors: string[];
}

/**
 * Parses JSON from https://3dfilamentprofiles.com/ or https://spooldb.com/
 * into the application's Filament objects.
 */
export function parse3DFilamentProfiles(
  jsonInput: string | unknown,
  defaultCostPerKg = 22
): ParseResult {
  const errors: string[] = [];
  let parsedRaw: any = null;

  if (typeof jsonInput === 'string') {
    try {
      parsedRaw = JSON.parse(jsonInput);
    } catch (err: any) {
      return {
        filaments: [],
        rawCount: 0,
        errors: [`JSON Parse Error: ${err?.message || 'Invalid JSON syntax'}`],
      };
    }
  } else {
    parsedRaw = jsonInput;
  }

  // Handle arrays or objects wrapped in `{ spools: [...] }` or `{ filaments: [...] }`
  let items: any[] = [];
  if (Array.isArray(parsedRaw)) {
    items = parsedRaw;
  } else if (parsedRaw && typeof parsedRaw === 'object') {
    if (Array.isArray(parsedRaw.spools)) {
      items = parsedRaw.spools;
    } else if (Array.isArray(parsedRaw.filaments)) {
      items = parsedRaw.filaments;
    } else if (Array.isArray(parsedRaw.data)) {
      items = parsedRaw.data;
    } else {
      // Single object
      items = [parsedRaw];
    }
  }

  if (items.length === 0) {
    return {
      filaments: [],
      rawCount: 0,
      errors: ['No spools or filament entries found in JSON.'],
    };
  }

  const filaments: Filament[] = [];

  items.forEach((item, index) => {
    try {
      if (!item || typeof item !== 'object') {
        errors.push(`Item #${index + 1} is not a valid object.`);
        return;
      }

      const brand = (item.brand || 'Generic').toString().trim();
      const material = (item.material || item.type || 'PLA').toString().trim();
      const materialType = (item.material_type || item.materialType || '').toString().trim();

      // Formulate display type: e.g. "PETG (Matte)" or "PLA"
      let displayType = material;
      if (materialType && materialType.toLowerCase() !== 'basic' && !material.toLowerCase().includes(materialType.toLowerCase())) {
        displayType = `${material} (${materialType})`;
      }

      const colorName = (item.color || item.colorName || item.color_name || '').toString().trim();
      const rawRgb = (item.rgb || item.colorHex || '#3b82f6').toString().trim();
      
      // Determine primary hex for single color picker
      const firstHex = rawRgb.split(',')[0].trim();
      const primaryColorHex = normalizeHex(firstHex);

      const shortCode = item.short_code ? item.short_code.toString().trim() : generateShortCode();
      const spoolUrl = item.spool_url ? item.spool_url.toString().trim() : `https://spooldb.com/s/${shortCode}`;

      // Remaining grams and tare weight
      const remainingGrams = typeof item.remaining_grams === 'number' && !isNaN(item.remaining_grams)
        ? Math.max(0, item.remaining_grams)
        : 1000;

      const emptySpoolWeight = typeof item.empty_spool_weight === 'number' && !isNaN(item.empty_spool_weight)
        ? item.empty_spool_weight
        : null;

      const tdValue = typeof item.td_value === 'number' && !isNaN(item.td_value)
        ? item.td_value
        : null;

      const notes = item.notes ? item.notes.toString().trim() : null;
      const location = item.location ? item.location.toString().trim() : null;
      const filamentId = typeof item.filament_id === 'number' ? item.filament_id : undefined;

      const spoolProperties: SpoolProperties = {
        purchase_date: item.spool_properties?.purchase_date ?? null,
        last_dried_date: item.spool_properties?.last_dried_date ?? null,
        purchase_price: item.spool_properties?.purchase_price ?? null,
      };

      // Determine cost per kg:
      // If item already had costPerKg, respect it.
      // If purchase_price was set (e.g. $18 for a 1kg spool), compute cost/kg.
      let costPerKg = defaultCostPerKg;
      if (typeof item.costPerKg === 'number' && item.costPerKg > 0) {
        costPerKg = item.costPerKg;
      } else if (typeof spoolProperties.purchase_price === 'number' && spoolProperties.purchase_price > 0) {
        costPerKg = spoolProperties.purchase_price;
      }

      const stableId = item.id || `spool_${shortCode || Date.now()}_${index}`;

      filaments.push({
        id: stableId,
        brand,
        type: displayType,
        name: displayType,
        material,
        material_type: materialType || (displayType.includes('Matte') ? 'Matte' : displayType.includes('Silk') ? 'Silk' : 'Basic'),
        colorName,
        colorHex: primaryColorHex,
        rgb: rawRgb,
        costPerKg: parseFloat(Number(costPerKg).toFixed(2)),
        short_code: shortCode,
        spool_url: spoolUrl,
        remaining_grams: remainingGrams,
        empty_spool_weight: emptySpoolWeight,
        td_value: tdValue,
        notes,
        location,
        updated_at: item.updated_at || new Date().toISOString(),
        spool_properties: spoolProperties,
        filament_id: filamentId,
      });
    } catch (err: any) {
      errors.push(`Error parsing spool item #${index + 1}: ${err?.message || 'Unknown error'}`);
    }
  });

  return {
    filaments,
    rawCount: items.length,
    errors,
  };
}

/**
 * Converts the application's Filament objects into the exact 3DFilamentProfiles / SpoolDB schema.
 */
export function exportTo3DFilamentProfiles(filaments: Filament[]): SpoolDBExportItem[] {
  return filaments.map((f) => {
    const shortCode = f.short_code || generateShortCode();
    const spoolUrl = f.spool_url || `https://spooldb.com/s/${shortCode}`;

    // Extract raw base material (e.g. PLA from "PLA (Matte)")
    let material = f.material;
    if (!material) {
      const match = f.type.match(/^([A-Za-z0-9+/]+)/);
      material = match ? match[1] : f.type;
    }

    let materialType = f.material_type;
    if (!materialType) {
      if (f.type.toLowerCase().includes('matte')) materialType = 'Matte';
      else if (f.type.toLowerCase().includes('silk+')) materialType = 'Silk+';
      else if (f.type.toLowerCase().includes('silk')) materialType = 'Silk';
      else materialType = 'Basic';
    }

    const rgb = f.rgb || f.colorHex || '#3b82f6';
    const color = f.colorName || (f.brand ? `${f.brand} ${material}` : material);

    return {
      short_code: shortCode,
      spool_url: spoolUrl,
      brand: f.brand || 'Generic',
      material,
      material_type: materialType,
      color,
      rgb,
      td_value: f.td_value !== undefined ? f.td_value : null,
      notes: f.notes !== undefined ? f.notes : null,
      location: f.location !== undefined ? f.location : null,
      remaining_grams: f.remaining_grams !== undefined ? f.remaining_grams : 1000,
      empty_spool_weight: f.empty_spool_weight !== undefined ? f.empty_spool_weight : null,
      updated_at: f.updated_at || new Date().toISOString(),
      spool_properties: {
        purchase_date: f.spool_properties?.purchase_date ?? null,
        last_dried_date: f.spool_properties?.last_dried_date ?? null,
        purchase_price: f.spool_properties?.purchase_price ?? f.costPerKg ?? null,
      },
      filament_id: f.filament_id ?? null,
    };
  });
}

/**
 * Exports filaments and triggers a browser file download formatted as JSON.
 */
export function download3DFilamentProfilesJson(filaments: Filament[], customName?: string): void {
  const exportData = exportTo3DFilamentProfiles(filaments);
  const jsonStr = JSON.stringify(exportData, null, 2);
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = customName || `3dfilamentprofiles_spools_${dateStr}.json`;

  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Copies the 3DFilamentProfiles JSON representation to the user's clipboard.
 */
export async function copy3DFilamentProfilesToClipboard(filaments: Filament[]): Promise<boolean> {
  try {
    const exportData = exportTo3DFilamentProfiles(filaments);
    const jsonStr = JSON.stringify(exportData, null, 2);
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(jsonStr);
      return true;
    }
    return false;
  } catch (err) {
    console.error('Failed to copy to clipboard', err);
    return false;
  }
}
