/**
 * Filament Master Code Specification & Utilities
 * 
 * Supports Dual Code Reference System:
 * 1. 5-Char Universal Spectrum Format (v0.2):
 *    [1: Brand (0-5)][2: Base Polymer (0-6)][3: Effect (S, G, R, T, D, L, W, C, X)][4-5: Universal Spectrum ID (01-32)]
 * 
 * 2. 4-Char Sequential Format (v0.1):
 *    [1: Brand (0-5)][2: Base Polymer (0-6)][3-4: Sequential / Specialty ID (01-99, G1-G9, etc.)]
 */

export interface MasterCodeBrand {
  code: string;
  name: string;
  short: string;
  aliases: string[];
}

export interface MasterCodePolymer {
  code: string;
  name: string;
  short: string;
  aliases: string[];
}

export interface MasterCodeEffect {
  code: string;
  label: string;
  description: string;
  example: string;
  aliases: string[];
}

export interface SpectrumColor {
  id: string; // '01' - '32'
  name: string;
  family: string;
  variation: 'light' | 'standard' | 'dark';
  hex: string;
  aliases: string[];
}

export const MASTER_CODE_BRANDS: Record<string, MasterCodeBrand> = {
  '0': { code: '0', name: 'Bambu Lab', short: 'Bambu', aliases: ['bambu', 'bambu lab', 'bambulab'] },
  '1': { code: '1', name: 'Elegoo', short: 'Elegoo', aliases: ['elegoo'] },
  '2': { code: '2', name: 'Sunlu', short: 'Sunlu', aliases: ['sunlu'] },
  '3': { code: '3', name: 'eSun', short: 'eSun', aliases: ['esun', 'e-sun'] },
  '4': { code: '4', name: '3D Fillies', short: '3D Fillies', aliases: ['3d fillies', '3dfillies', 'fillies'] },
  '5': { code: '5', name: 'Jaycar', short: 'Jaycar', aliases: ['jaycar'] },
};

export const MASTER_CODE_POLYMERS: Record<string, MasterCodePolymer> = {
  '0': { 
    code: '0', 
    name: 'Standard / Basic PLA', 
    short: 'Basic PLA', 
    aliases: ['pla', 'pla+', 'pla plus', 'pla-lite', 'basic pla', 'standard pla', 'pla pro', 'tough pla', 'pla+2.0'] 
  },
  '1': { 
    code: '1', 
    name: 'Silk PLA', 
    short: 'Silk PLA', 
    aliases: ['silk', 'silk pla', 'pla silk', 'shiny', 'silk+'] 
  },
  '2': { 
    code: '2', 
    name: 'Matte PLA', 
    short: 'Matte PLA', 
    aliases: ['matte', 'matte pla', 'pla matte'] 
  },
  '3': { 
    code: '3', 
    name: 'Standard / Basic PETG', 
    short: 'Basic PETG', 
    aliases: ['petg', 'standard petg', 'basic petg', 'petg basic', 'pteg'] 
  },
  '4': { 
    code: '4', 
    name: 'Matte / Pro PETG', 
    short: 'Matte/Pro PETG', 
    aliases: ['matte petg', 'petg matte', 'pro petg', 'petg pro', 'petg-pro', 'petg-hf'] 
  },
  '5': { 
    code: '5', 
    name: 'ABS / ASA', 
    short: 'ABS / ASA', 
    aliases: ['abs', 'asa', 'abs/asa', 'abs+', 'asa+'] 
  },
  '6': { 
    code: '6', 
    name: 'TPU / Flexibles', 
    short: 'TPU / Flex', 
    aliases: ['tpu', 'flex', 'flexible', 'tpe', 'tpu 95a', 'tpu-hf'] 
  },
};

export const MASTER_CODE_EFFECTS: Record<string, MasterCodeEffect> = {
  'S': { 
    code: 'S', 
    label: 'Standard / Solid Colour', 
    description: 'Solid uniform pigmentation', 
    example: '00S32 = Bambu Basic PLA Black',
    aliases: ['solid', 'standard', 'basic', 'plain'] 
  },
  'G': { 
    code: 'G', 
    label: 'Galaxy / Glitter / Sparkle', 
    description: 'Galaxy sparkle or glitter flakes', 
    example: '00G01 = Bambu Galaxy or 00G1',
    aliases: ['galaxy', 'glitter', 'sparkle', 'twinkle', 'starlight'] 
  },
  'R': { 
    code: 'R', 
    label: 'Rainbow / Gradient', 
    description: 'Longitudinal gradient transition along spool', 
    example: '21R03 = Sunlu Silk Rainbow or 21R3',
    aliases: ['rainbow', 'gradient', 'transition', 'multi-color transition'] 
  },
  'T': { 
    code: 'T', 
    label: 'Tri-Colour Co-extruded', 
    description: 'Split-strand 3-color co-extrusion', 
    example: '51T01 = Jaycar Tri-Colour Silk or 51T1',
    aliases: ['tri-color', 'tricolor', 'tri-colour', 'tricolour', 'triple color', '3-color'] 
  },
  'D': { 
    code: 'D', 
    label: 'Dual-Colour Co-extruded', 
    description: 'Two-tone split strand co-extrusion', 
    example: '00D01 = Bambu Dual-Colour or 00D1',
    aliases: ['dual-color', 'dualcolor', 'dual-colour', 'dualcolour', 'two-tone', 'dichromatic', '2-color'] 
  },
  'L': { 
    code: 'L', 
    label: 'Luminescent / Glow-in-the-Dark', 
    description: 'Phosphorescent glowing material', 
    example: '50L17 = Jaycar Glow Green or 50L1',
    aliases: ['glow', 'luminescent', 'luminous', 'phosphorescent', 'glow in the dark', 'gitd'] 
  },
  'W': { 
    code: 'W', 
    label: 'Wood-Fill / Composite / Marble', 
    description: 'Wood fibre, marble, or composite fill', 
    example: '10W11 = Elegoo Wood PLA+ or 10W1',
    aliases: ['wood', 'marble', 'stone', 'granite', 'filled', 'clay'] 
  },
  'C': { 
    code: 'C', 
    label: 'Carbon Fibre / Glass Fibre', 
    description: 'Carbon fibre (CF) or glass fibre (GF) reinforced', 
    example: '00C32 = Bambu PLA-CF Black or 00C1',
    aliases: ['cf', 'gf', 'carbon', 'carbon fibre', 'carbon fiber', 'glass fibre', 'pla-cf', 'petg-cf', 'pa-cf'] 
  },
  'X': { 
    code: 'X', 
    label: 'Clear / Translucent', 
    description: 'Transparent, clear, natural, or translucent finish', 
    example: '03X28 = Bambu Basic PETG Clear',
    aliases: ['clear', 'translucent', 'transparent', 'semi-clear', 'natural', 'tr', 'see-through'] 
  },
};

// Aliased for backwards compatibility with 4-char v0.1 code references
export const MASTER_CODE_SPECIALTIES = MASTER_CODE_EFFECTS;

/**
 * Universal Spectrum Colour IDs (01 - 32)
 * Partitioned into 11 Color Families across 3 Variations (Light, Standard/Mid, Dark)
 */
export const UNIVERSAL_SPECTRUM_COLORS: SpectrumColor[] = [
  // 1. Pink (01-03)
  { id: '01', name: 'Light Pink', family: 'Pink', variation: 'light', hex: '#fbcfe8', aliases: ['light pink', 'baby pink', 'pastel pink', 'soft pink'] },
  { id: '02', name: 'Pink', family: 'Pink', variation: 'standard', hex: '#ec4899', aliases: ['pink', 'hot pink', 'rose', 'magenta'] },
  { id: '03', name: 'Dark Pink', family: 'Pink', variation: 'dark', hex: '#be185d', aliases: ['dark pink', 'deep pink', 'fuchsia', 'berry'] },

  // 2. Red (04-06)
  { id: '04', name: 'Light Red', family: 'Red', variation: 'light', hex: '#f87171', aliases: ['light red', 'coral', 'salmon', 'candy red'] },
  { id: '05', name: 'Red', family: 'Red', variation: 'standard', hex: '#ef4444', aliases: ['red', 'basic red', 'true red', 'crimson'] },
  { id: '06', name: 'Dark Red / Maroon', family: 'Red', variation: 'dark', hex: '#991b1b', aliases: ['dark red', 'maroon', 'burgundy', 'wine', 'brick'] },

  // 3. Orange (07-09)
  { id: '07', name: 'Light Orange', family: 'Orange', variation: 'light', hex: '#fdba74', aliases: ['light orange', 'peach', 'apricot', 'pastel orange'] },
  { id: '08', name: 'Orange', family: 'Orange', variation: 'standard', hex: '#f97316', aliases: ['orange', 'mandarin', 'tangerine'] },
  { id: '09', name: 'Dark Orange', family: 'Orange', variation: 'dark', hex: '#c2410c', aliases: ['dark orange', 'rust', 'burnt orange', 'terracotta'] },

  // 4. Brown / Copper (10-12)
  { id: '10', name: 'Light Brown', family: 'Brown / Copper', variation: 'light', hex: '#d97706', aliases: ['light brown', 'tan', 'sand', 'caramel', 'beige', 'wood'] },
  { id: '11', name: 'Brown / Copper', family: 'Brown / Copper', variation: 'standard', hex: '#92400e', aliases: ['brown', 'copper', 'red copper', 'coffee', 'chocolate'] },
  { id: '12', name: 'Dark Brown', family: 'Brown / Copper', variation: 'dark', hex: '#451a03', aliases: ['dark brown', 'deep brown', 'espresso', 'walnut'] },

  // 5. Yellow / Gold (13-15)
  { id: '13', name: 'Light Yellow', family: 'Yellow / Gold', variation: 'light', hex: '#fef08a', aliases: ['light yellow', 'lemon', 'pastel yellow', 'cream'] },
  { id: '14', name: 'Yellow / Gold', family: 'Yellow / Gold', variation: 'standard', hex: '#eab308', aliases: ['yellow', 'gold', 'sunshine yellow', 'canary'] },
  { id: '15', name: 'Dark Yellow', family: 'Yellow / Gold', variation: 'dark', hex: '#a16207', aliases: ['dark yellow', 'amber', 'mustard', 'dark gold'] },

  // 6. Green (16-18)
  { id: '16', name: 'Light Green', family: 'Green', variation: 'light', hex: '#86efac', aliases: ['light green', 'lime', 'mint', 'pastel green', 'glow green'] },
  { id: '17', name: 'Green', family: 'Green', variation: 'standard', hex: '#22c55e', aliases: ['green', 'bambu green', 'emerald', 'leaf green', 'grass'] },
  { id: '18', name: 'Dark Green', family: 'Green', variation: 'dark', hex: '#15803d', aliases: ['dark green', 'forest green', 'mistletoe green', 'pine', 'olive', 'hunter green'] },

  // 7. Teal / Cyan (19-21)
  { id: '19', name: 'Light Teal / Cyan', family: 'Teal / Cyan', variation: 'light', hex: '#67e8f9', aliases: ['light teal', 'cyan', 'light cyan', 'aqua', 'turquoise'] },
  { id: '20', name: 'Teal', family: 'Teal / Cyan', variation: 'standard', hex: '#06b6d4', aliases: ['teal', 'peacock blue', 'marine blue', 'ocean'] },
  { id: '21', name: 'Dark Teal', family: 'Teal / Cyan', variation: 'dark', hex: '#0e7490', aliases: ['dark teal', 'deep cyan', 'petrol', 'slate teal'] },

  // 8. Blue (22-24)
  { id: '22', name: 'Light Blue', family: 'Blue', variation: 'light', hex: '#93c5fd', aliases: ['light blue', 'sky blue', 'baby blue', 'pastel blue', 'ice blue'] },
  { id: '23', name: 'Blue', family: 'Blue', variation: 'standard', hex: '#3b82f6', aliases: ['blue', 'royal blue', 'cobalt', 'true blue'] },
  { id: '24', name: 'Dark Blue', family: 'Blue', variation: 'dark', hex: '#1d4ed8', aliases: ['dark blue', 'navy', 'indigo', 'midnight blue', 'deep blue'] },

  // 9. Purple (25-27)
  { id: '25', name: 'Light Purple', family: 'Purple', variation: 'light', hex: '#d8b4fe', aliases: ['light purple', 'lilac', 'lavender', 'pastel purple'] },
  { id: '26', name: 'Purple', family: 'Purple', variation: 'standard', hex: '#a855f7', aliases: ['purple', 'violet', 'galaxy purple'] },
  { id: '27', name: 'Dark Purple', family: 'Purple', variation: 'dark', hex: '#6b21a8', aliases: ['dark purple', 'indigo purple', 'deep purple', 'plum', 'eggplant'] },

  // 10. Neutrals / Metals (28-30)
  { id: '28', name: 'White', family: 'Neutrals / Metals', variation: 'light', hex: '#ffffff', aliases: ['white', 'pure white', 'snow white', 'natural white'] },
  { id: '29', name: 'Light Grey / Silver', family: 'Neutrals / Metals', variation: 'standard', hex: '#cbd5e1', aliases: ['light grey', 'light gray', 'silver', 'platinum', 'ash'] },
  { id: '30', name: 'Grey', family: 'Neutrals / Metals', variation: 'dark', hex: '#64748b', aliases: ['grey', 'gray', 'slate', 'medium grey', 'cement'] },

  // 11. Dark Neutrals (31-32)
  { id: '31', name: 'Dark Grey', family: 'Dark Neutrals', variation: 'standard', hex: '#334155', aliases: ['dark grey', 'dark gray', 'charcoal', 'anthracite', 'gunmetal'] },
  { id: '32', name: 'Black', family: 'Dark Neutrals', variation: 'dark', hex: '#18181b', aliases: ['black', 'galaxy black', 'jet black', 'obsidian', 'matte black'] },
];

export const SPECTRUM_FAMILIES = [
  'Pink',
  'Red',
  'Orange',
  'Brown / Copper',
  'Yellow / Gold',
  'Green',
  'Teal / Cyan',
  'Blue',
  'Purple',
  'Neutrals / Metals',
  'Dark Neutrals',
];

// Fallback for 4-char legacy common solid colors
export const COMMON_SOLID_COLORS: Array<{ code: string; name: string; hex: string }> = [
  { code: '01', name: 'Black', hex: '#18181b' },
  { code: '02', name: 'White', hex: '#f8fafc' },
  { code: '03', name: 'Gray / Silver', hex: '#64748b' },
  { code: '04', name: 'Red / Maroon', hex: '#ef4444' },
  { code: '05', name: 'Blue / Navy', hex: '#3b82f6' },
  { code: '06', name: 'Green / Olive', hex: '#10b981' },
  { code: '07', name: 'Yellow / Gold', hex: '#facc15' },
  { code: '08', name: 'Orange', hex: '#f97316' },
  { code: '09', name: 'Purple / Violet', hex: '#8b5cf6' },
  { code: '10', name: 'Pink / Magenta', hex: '#ec4899' },
  { code: '11', name: 'Brown / Tan', hex: '#92400e' },
  { code: '12', name: 'Cyan / Teal', hex: '#06b6d4' },
  { code: '13', name: 'Bronze / Copper', hex: '#b45309' },
];

export interface DecodedMasterCode {
  isValid: boolean;
  code: string;
  format: '5-char-spectrum' | '4-char-sequential' | 'invalid';
  brandCode: string;
  brandName: string;
  polymerCode: string;
  polymerName: string;
  effectCode?: string;
  effectLabel?: string;
  isSpecialty: boolean;
  specialtyPrefix?: string;
  specialtyLabel?: string;
  spectrumId?: string;
  spectrumColor?: SpectrumColor;
  colorOrIndex: string;
  colorName?: string;
  summary: string;
  errors?: string[];
}

/**
 * Parses and decodes both 5-character Spectrum and 4-character Sequential Filament Master Codes.
 */
export function decodeMasterCode(input: string): DecodedMasterCode {
  const clean = (input || '').trim().toUpperCase();
  const errors: string[] = [];

  if (clean.length !== 4 && clean.length !== 5) {
    return {
      isValid: false,
      code: clean,
      format: 'invalid',
      brandCode: '',
      brandName: 'Unknown',
      polymerCode: '',
      polymerName: 'Unknown',
      isSpecialty: false,
      colorOrIndex: '',
      summary: clean ? 'Invalid format (must be 5 chars e.g. 00S32 or 4 chars e.g. 00G1 / 0001)' : 'No code entered',
      errors: ['Code must be 4 or 5 characters'],
    };
  }

  const d1 = clean[0];
  const d2 = clean[1];

  // 1. Brand (Digit 1)
  const brand = MASTER_CODE_BRANDS[d1];
  const brandName = brand ? brand.name : `Brand ${d1}`;
  if (!brand) {
    errors.push(`Digit 1 '${d1}' is not a standard brand code (0-5)`);
  }

  // 2. Polymer (Digit 2)
  const polymer = MASTER_CODE_POLYMERS[d2];
  const polymerName = polymer ? polymer.name : `Polymer ${d2}`;
  if (!polymer) {
    errors.push(`Digit 2 '${d2}' is not a standard polymer code (0-6)`);
  }

  // CASE A: 5-CHARACTER UNIVERSAL SPECTRUM CODE (v0.2)
  // Format: [Brand][Polymer][Effect][Spectrum ID / Sequence (01-32)]
  if (clean.length === 5) {
    const d3 = clean[2];
    const d4d5 = clean.slice(3);
    const effect = MASTER_CODE_EFFECTS[d3];

    if (!effect) {
      errors.push(`Digit 3 '${d3}' is not a valid Effect code (S, G, R, T, D, L, W, C, X)`);
    }

    const spectrum = UNIVERSAL_SPECTRUM_COLORS.find(s => s.id === d4d5);
    let colorName = spectrum?.name;
    const isSpecialty = d3 !== 'S';

    if (!spectrum && !/^\d{2}$/.test(d4d5)) {
      errors.push(`Digits 4-5 '${d4d5}' must be a 2-digit Universal Spectrum ID (01-32) or sequence (01-09)`);
    }

    if (!colorName) {
      colorName = isSpecialty ? `${effect?.label || 'Specialty'} #${d4d5}` : `Spectrum #${d4d5}`;
    }

    const effectLabel = effect ? effect.label : `Effect ${d3}`;
    const summary = `${brandName} • ${polymer ? polymer.short : polymerName} • ${effectLabel}: ${colorName}`;

    return {
      isValid: errors.length === 0,
      code: clean,
      format: '5-char-spectrum',
      brandCode: d1,
      brandName,
      polymerCode: d2,
      polymerName,
      effectCode: d3,
      effectLabel,
      isSpecialty,
      specialtyPrefix: isSpecialty ? d3 : undefined,
      specialtyLabel: effectLabel,
      spectrumId: d4d5,
      spectrumColor: spectrum,
      colorOrIndex: d4d5,
      colorName,
      summary,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  // CASE B: 4-CHARACTER SEQUENTIAL CODE (v0.1)
  // Format: [Brand][Polymer][01-99 Solid or G1-G9 Specialty]
  const d3 = clean[2];
  const d4 = clean[3];
  const d3d4 = clean.slice(2);

  const specialty = MASTER_CODE_SPECIALTIES[d3];
  const isSpecialty = Boolean(specialty);

  let specialtyLabel: string | undefined;
  let colorName: string | undefined;

  if (isSpecialty && specialty) {
    specialtyLabel = `${specialty.label} (#${d4})`;
  } else if (/^\d{2}$/.test(d3d4)) {
    const matchedCommon = COMMON_SOLID_COLORS.find(c => c.code === d3d4);
    if (matchedCommon) {
      colorName = matchedCommon.name;
    }
  } else {
    errors.push(`Digits 3-4 '${d3d4}' must be 01-99 for solid colours, or a specialty modifier (G, R, T, D, L, W, C, X + digit)`);
  }

  const colorOrModifierDesc = specialtyLabel || (colorName ? `Solid: ${colorName} (#${d3d4})` : `Colour #${d3d4}`);
  const summary = `${brandName} • ${polymer ? polymer.short : polymerName} • ${colorOrModifierDesc}`;

  return {
    isValid: errors.length === 0,
    code: clean,
    format: '4-char-sequential',
    brandCode: d1,
    brandName,
    polymerCode: d2,
    polymerName,
    isSpecialty,
    specialtyPrefix: isSpecialty ? d3 : undefined,
    specialtyLabel,
    colorOrIndex: d3d4,
    colorName,
    summary,
    errors: errors.length > 0 ? errors : undefined,
  };
}

/**
 * Builds a 5-character Universal Spectrum Master Code: [Brand][Polymer][Effect][Spectrum ID]
 */
export function buildMasterCode5(
  brandDigit: string,
  polymerDigit: string,
  effectCode: string,
  spectrumId: string
): string {
  const b = (brandDigit || '0').slice(0, 1);
  const p = (polymerDigit || '0').slice(0, 1);
  const e = (effectCode || 'S').slice(0, 1).toUpperCase();
  let s = (spectrumId || '01').padStart(2, '0').slice(-2);
  return `${b}${p}${e}${s}`.toUpperCase();
}

/**
 * Builds a 4-character Sequential Master Code: [Brand][Polymer][ModifierOrColor]
 */
export function buildMasterCode(
  brandDigit: string,
  polymerDigit: string,
  modifierOrColor: string
): string {
  const b = (brandDigit || '0').slice(0, 1);
  const p = (polymerDigit || '0').slice(0, 1);
  let c = (modifierOrColor || '01').toUpperCase();
  if (c.length === 1) c = `${c}1`;
  if (c.length > 3) c = c.slice(0, 3);
  return `${b}${p}${c}`.toUpperCase();
}

/**
 * Suggests and auto-detects Filament Master Codes based on filament properties.
 * Returns both 5-character (Spectrum) and 4-character (Sequential) suggestions!
 */
export function suggestMasterCode(filament: {
  brand?: string;
  type?: string;
  material_type?: string;
  colorName?: string;
  rgb?: string;
  colorHex?: string;
}): {
  code5: string;
  code4: string;
  code: string;
  decoded: DecodedMasterCode;
  confidence: 'high' | 'medium' | 'low';
  notes: string;
} {
  const brandRaw = (filament.brand || '').toLowerCase().trim();
  const typeRaw = (filament.type || '').toLowerCase().trim();
  const finishRaw = (filament.material_type || '').toLowerCase().trim();
  const colorRaw = (filament.colorName || '').toLowerCase().trim();
  const combined = `${brandRaw} ${typeRaw} ${finishRaw} ${colorRaw}`;

  // 1. Detect Brand Digit (0-5)
  let brandCode = '0'; // Default Bambu Lab
  let brandFound = false;

  for (const [code, b] of Object.entries(MASTER_CODE_BRANDS)) {
    if (b.aliases.some(a => brandRaw.includes(a))) {
      brandCode = code;
      brandFound = true;
      break;
    }
  }

  // 2. Detect Polymer Digit (0-6)
  let polymerCode = '0'; // Default Standard PLA
  let polymerFound = false;

  if (combined.includes('silk')) {
    polymerCode = '1';
    polymerFound = true;
  } else if (combined.includes('matte')) {
    if (combined.includes('petg') || combined.includes('pteg')) {
      polymerCode = '4'; // Matte/Pro PETG
    } else {
      polymerCode = '2'; // Matte PLA
    }
    polymerFound = true;
  } else if (combined.includes('tpu') || combined.includes('flex')) {
    polymerCode = '6';
    polymerFound = true;
  } else if (combined.includes('abs') || combined.includes('asa')) {
    polymerCode = '5';
    polymerFound = true;
  } else if (combined.includes('petg') || combined.includes('pteg')) {
    if (combined.includes('pro') || combined.includes('hf')) {
      polymerCode = '4';
    } else {
      polymerCode = '3';
    }
    polymerFound = true;
  } else if (combined.includes('pla')) {
    polymerCode = '0';
    polymerFound = true;
  }

  // 3. Detect Effect (S, G, R, T, D, L, W, C, X)
  let effectCode = 'S'; // Default Solid
  let effectFound = false;

  if (combined.includes('clear') || combined.includes('transparent') || combined.includes('translucent') || combined.includes('tr ')) {
    effectCode = 'X';
    effectFound = true;
  } else if (combined.includes('cf') || combined.includes('carbon') || combined.includes('gf')) {
    effectCode = 'C';
    effectFound = true;
  } else if (combined.includes('galaxy') || combined.includes('glitter') || combined.includes('sparkle')) {
    effectCode = 'G';
    effectFound = true;
  } else if (combined.includes('glow') || combined.includes('luminous') || combined.includes('luminescent')) {
    effectCode = 'L';
    effectFound = true;
  } else if (combined.includes('rainbow') || combined.includes('gradient')) {
    effectCode = 'R';
    effectFound = true;
  } else if (combined.includes('tri-color') || combined.includes('tricolor') || combined.includes('tri-colour') || combined.includes('tricolour')) {
    effectCode = 'T';
    effectFound = true;
  } else if (combined.includes('dual-color') || combined.includes('dualcolor') || combined.includes('dual-colour') || combined.includes('dualcolour') || (filament.rgb && filament.rgb.includes(','))) {
    effectCode = 'D';
    effectFound = true;
  } else if (combined.includes('wood') || combined.includes('marble') || combined.includes('stone')) {
    effectCode = 'W';
    effectFound = true;
  }

  // 4. Detect Universal Spectrum ID (01 - 32)
  let spectrumId = '32'; // Default Black
  let colorMatched = false;

  for (const spec of UNIVERSAL_SPECTRUM_COLORS) {
    if (spec.aliases.some(alias => colorRaw.includes(alias) || combined.includes(alias))) {
      spectrumId = spec.id;
      colorMatched = true;
      break;
    }
  }

  // Fallbacks if not strictly matched
  if (!colorMatched) {
    if (colorRaw.includes('black')) { spectrumId = '32'; colorMatched = true; }
    else if (colorRaw.includes('white')) { spectrumId = '28'; colorMatched = true; }
    else if (colorRaw.includes('red') || colorRaw.includes('maroon')) { spectrumId = '05'; colorMatched = true; }
    else if (colorRaw.includes('blue') || colorRaw.includes('indigo')) { spectrumId = '23'; colorMatched = true; }
    else if (colorRaw.includes('green') || colorRaw.includes('lime')) { spectrumId = '17'; colorMatched = true; }
    else if (colorRaw.includes('yellow') || colorRaw.includes('gold')) { spectrumId = '14'; colorMatched = true; }
    else if (colorRaw.includes('orange')) { spectrumId = '08'; colorMatched = true; }
    else if (colorRaw.includes('purple') || colorRaw.includes('lilac') || colorRaw.includes('lavender')) { spectrumId = '26'; colorMatched = true; }
    else if (colorRaw.includes('pink') || colorRaw.includes('magenta')) { spectrumId = '02'; colorMatched = true; }
    else if (colorRaw.includes('copper') || colorRaw.includes('brown')) { spectrumId = '11'; colorMatched = true; }
    else if (colorRaw.includes('silver') || colorRaw.includes('grey') || colorRaw.includes('gray')) { spectrumId = '29'; colorMatched = true; }
    else if (colorRaw.includes('teal') || colorRaw.includes('cyan')) { spectrumId = '20'; colorMatched = true; }
  }

  // 5-character code
  const code5 = `${brandCode}${polymerCode}${effectCode}${spectrumId}`;

  // 4-character code (legacy sequential)
  let suffix4 = '01';
  if (effectCode !== 'S') {
    suffix4 = `${effectCode}1`;
  } else {
    // Map spectrum to 01-99
    suffix4 = spectrumId;
  }
  const code4 = `${brandCode}${polymerCode}${suffix4}`;

  const primaryCode = code5;
  const decoded = decodeMasterCode(primaryCode);

  const confidence = (brandFound && polymerFound && (colorMatched || effectFound))
    ? 'high'
    : (brandFound || polymerFound)
      ? 'medium'
      : 'low';

  const notes = `Brand: ${decoded.brandName} (${brandCode}) | Polymer: ${decoded.polymerName} (${polymerCode}) | Effect: ${effectCode} | Spectrum: #${spectrumId} (${decoded.colorName})`;

  return {
    code5,
    code4,
    code: primaryCode,
    decoded,
    confidence,
    notes,
  };
}
