/**
 * Filament Master Code v0.1 Specification & Utilities
 * 
 * 4-character deterministic ID structure:
 * Digit 1: Brand (0-5)
 * Digit 2: Base Polymer & Primary Finish (0-6)
 * Digits 3 & 4: Colour Index / Specialty Modifiers (01-99, or G1-G9, R1-R9, T1-T9, D1-D9, L1-L9, W1-W9, C1-C9)
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

export interface MasterCodeSpecialty {
  prefix: string;
  label: string;
  description: string;
  example: string;
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
    aliases: ['pla', 'pla+', 'pla plus', 'pla-lite', 'basic pla', 'standard pla', 'pla pro', 'tough pla'] 
  },
  '1': { 
    code: '1', 
    name: 'Silk PLA', 
    short: 'Silk PLA', 
    aliases: ['silk', 'silk pla', 'pla silk', 'shiny'] 
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
    aliases: ['petg', 'standard petg', 'basic petg', 'petg basic'] 
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

export const MASTER_CODE_SPECIALTIES: Record<string, MasterCodeSpecialty> = {
  'G': { 
    prefix: 'G', 
    label: 'Galaxy / Glitter / Sparkle', 
    description: 'Galaxy sparkle or glitter flakes', 
    example: '00G1 = Bambu PLA Galaxy',
    aliases: ['galaxy', 'glitter', 'sparkle', 'twinkle', 'starlight'] 
  },
  'R': { 
    prefix: 'R', 
    label: 'Rainbow / Gradient', 
    description: 'Longitudinal gradient transition along spool', 
    example: '00R1 = Bambu Rainbow PLA',
    aliases: ['rainbow', 'gradient', 'transition', 'multi-color transition'] 
  },
  'T': { 
    prefix: 'T', 
    label: 'Tri-Colour Co-extruded', 
    description: 'Split-strand 3-color co-extrusion', 
    example: '00T1 = Bambu Tri-Colour PLA',
    aliases: ['tri-color', 'tricolor', 'tri-colour', 'tricolour', 'triple color', '3-color'] 
  },
  'D': { 
    prefix: 'D', 
    label: 'Dual-Colour Co-extruded', 
    description: 'Two-tone split strand co-extrusion', 
    example: '00D1 = Bambu Dual-Colour PLA',
    aliases: ['dual-color', 'dualcolor', 'dual-colour', 'dualcolour', 'two-tone', 'dichromatic', '2-color'] 
  },
  'L': { 
    prefix: 'L', 
    label: 'Luminescent / Glow-in-the-Dark', 
    description: 'Phosphorescent glowing material', 
    example: '50L1 = Jaycar Glow Green',
    aliases: ['glow', 'luminescent', 'luminous', 'phosphorescent', 'glow in the dark', 'gitd'] 
  },
  'W': { 
    prefix: 'W', 
    label: 'Wood / Filled / Marble', 
    description: 'Wood fibre, marble, or composite fill', 
    example: '10W1 = Elegoo Wood PLA+',
    aliases: ['wood', 'marble', 'stone', 'granite', 'filled', 'clay'] 
  },
  'C': { 
    prefix: 'C', 
    label: 'Carbon Fibre / Glass Fibre', 
    description: 'Carbon fibre (CF) or glass fibre (GF) reinforced', 
    example: '00C1 = Bambu PLA-CF',
    aliases: ['cf', 'gf', 'carbon', 'carbon fibre', 'carbon fiber', 'glass fibre', 'pla-cf', 'petg-cf', 'pa-cf'] 
  },
};

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
  brandCode: string;
  brandName: string;
  polymerCode: string;
  polymerName: string;
  isSpecialty: boolean;
  specialtyPrefix?: string;
  specialtyLabel?: string;
  colorOrIndex: string;
  colorName?: string;
  summary: string;
  errors?: string[];
}

/**
 * Parses and decodes a 4-character Filament Master Code (v0.1)
 */
export function decodeMasterCode(input: string): DecodedMasterCode {
  const clean = (input || '').trim().toUpperCase();
  const errors: string[] = [];

  if (clean.length !== 4) {
    return {
      isValid: false,
      code: clean,
      brandCode: '',
      brandName: 'Unknown',
      polymerCode: '',
      polymerName: 'Unknown',
      isSpecialty: false,
      colorOrIndex: '',
      summary: clean ? 'Invalid format (must be 4 characters, e.g. 00G1 or 0001)' : 'No code entered',
      errors: ['Code must be exactly 4 characters'],
    };
  }

  const d1 = clean[0];
  const d2 = clean[1];
  const d3 = clean[2];
  const d4 = clean[3];
  const d3d4 = clean.slice(2);

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

  // 3. Digits 3 & 4 (Specialty or Solid Color)
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
    errors.push(`Digits 3-4 '${d3d4}' must be 01-99 for solid colours, or a specialty modifier (G, R, T, D, L, W, C + digit)`);
  }

  const colorOrModifierDesc = specialtyLabel || (colorName ? `Solid: ${colorName} (#${d3d4})` : `Colour #${d3d4}`);
  const summary = `${brandName} • ${polymer ? polymer.short : polymerName} • ${colorOrModifierDesc}`;

  return {
    isValid: errors.length === 0,
    code: clean,
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
 * Generates a 4-character master code from individual component codes
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
  if (c.length > 2) c = c.slice(0, 2);
  return `${b}${p}${c}`.toUpperCase();
}

/**
 * Auto-detects and suggests a Filament Master Code based on filament attributes
 */
export function suggestMasterCode(filament: {
  brand?: string;
  type?: string;
  material_type?: string;
  colorName?: string;
  rgb?: string;
}): { code: string; decoded: DecodedMasterCode; confidence: 'high' | 'medium' | 'low'; notes: string } {
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
    if (combined.includes('petg')) {
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
  } else if (combined.includes('petg')) {
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

  // 3. Detect Specialty Modifier or Solid Colour
  let suffix = '01'; // Default
  let specialtyFound = false;

  if (combined.includes('cf') || combined.includes('carbon') || combined.includes('gf')) {
    suffix = 'C1';
    specialtyFound = true;
  } else if (combined.includes('galaxy') || combined.includes('glitter') || combined.includes('sparkle')) {
    suffix = 'G1';
    specialtyFound = true;
  } else if (combined.includes('glow') || combined.includes('luminous') || combined.includes('luminescent')) {
    suffix = 'L1';
    specialtyFound = true;
  } else if (combined.includes('rainbow') || combined.includes('gradient')) {
    suffix = 'R1';
    specialtyFound = true;
  } else if (combined.includes('tri-color') || combined.includes('tricolor') || combined.includes('tri-colour') || combined.includes('tricolour')) {
    suffix = 'T1';
    specialtyFound = true;
  } else if (combined.includes('dual-color') || combined.includes('dualcolor') || combined.includes('dual-colour') || combined.includes('dualcolour') || (filament.rgb && filament.rgb.includes(','))) {
    suffix = 'D1';
    specialtyFound = true;
  } else if (combined.includes('wood') || combined.includes('marble') || combined.includes('stone')) {
    suffix = 'W1';
    specialtyFound = true;
  } else {
    // Try to match common color
    if (colorRaw.includes('black')) suffix = '01';
    else if (colorRaw.includes('white')) suffix = '02';
    else if (colorRaw.includes('gray') || colorRaw.includes('grey') || colorRaw.includes('silver')) suffix = '03';
    else if (colorRaw.includes('red') || colorRaw.includes('maroon') || colorRaw.includes('crimson')) suffix = '04';
    else if (colorRaw.includes('blue') || colorRaw.includes('navy')) suffix = '05';
    else if (colorRaw.includes('green') || colorRaw.includes('olive') || colorRaw.includes('lime')) suffix = '06';
    else if (colorRaw.includes('yellow') || colorRaw.includes('gold')) suffix = '07';
    else if (colorRaw.includes('orange')) suffix = '08';
    else if (colorRaw.includes('purple') || colorRaw.includes('violet')) suffix = '09';
    else if (colorRaw.includes('pink') || colorRaw.includes('magenta')) suffix = '10';
    else if (colorRaw.includes('brown') || colorRaw.includes('tan') || colorRaw.includes('beige')) suffix = '11';
    else if (colorRaw.includes('cyan') || colorRaw.includes('teal')) suffix = '12';
    else if (colorRaw.includes('bronze') || colorRaw.includes('copper')) suffix = '13';
  }

  const generatedCode = `${brandCode}${polymerCode}${suffix}`;
  const decoded = decodeMasterCode(generatedCode);

  const confidence = (brandFound && polymerFound && specialtyFound)
    ? 'high'
    : (brandFound || polymerFound)
      ? 'medium'
      : 'low';

  const notes = `Brand: ${decoded.brandName} (${brandCode}) | Polymer: ${decoded.polymerName} (${polymerCode}) | Suffix: ${suffix}`;

  return {
    code: generatedCode,
    decoded,
    confidence,
    notes,
  };
}
