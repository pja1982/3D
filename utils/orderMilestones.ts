import type { Quote, Filament, Printer, Order } from '../types';
import { calculateJobPartRows } from './partCostCalculator';

export type MilestoneKey = 
  | 'slicing'
  | 'spool_checked'
  | 'build_plate_clean'
  | 'first_layer'
  | 'print_completed'
  | 'post_processing'
  | 'qa'
  | 'documentation';

export interface MilestoneDef {
  key: MilestoneKey;
  label: string;
  shortLabel: string;
  description: string;
}

export const MILESTONES: MilestoneDef[] = [
  { key: 'slicing', label: 'Slicing', shortLabel: 'Slicing', description: 'G-code sliced, support & infill verified' },
  { key: 'spool_checked', label: 'Spool checked', shortLabel: 'Spool', description: 'Filament weighed, dry & loaded' },
  { key: 'build_plate_clean', label: 'Build plate clean', shortLabel: 'Plate clean', description: 'IPA wiped, bed leveled & preheated' },
  { key: 'first_layer', label: 'First layer', shortLabel: '1st layer', description: 'Extrusion inspected, zero lifting' },
  { key: 'print_completed', label: 'Print completed', shortLabel: 'Printed', description: 'Bed cooled, cleanly detached' },
  { key: 'post_processing', label: 'Post-processing completed', shortLabel: 'Post-proc', description: 'Supports removed, trimmed & cleaned' },
  { key: 'qa', label: 'QA', shortLabel: 'QA', description: 'Dimensions & finish inspected' },
  { key: 'documentation', label: 'Documentation', shortLabel: 'Doc', description: 'Photo taken, packed for delivery' },
];

export interface MilestonePartColorItem {
  id: string;
  filamentId: string | null;
  brand: string;
  type: string;
  colorName?: string;
  colorHex?: string;
  rgb?: string;
  masterCode?: string;
  grams: number;
}

export interface MilestonePrintRow {
  id: string;
  unitIndex: number;
  unitOfPart: number;
  totalForPart: number;
  unitLabel: string;
  partName: string;
  materialLabel: string;
  colorName?: string;
  colorHex?: string;
  rgb?: string;
  masterCode?: string;
  isMultiColor?: boolean;
  colors?: MilestonePartColorItem[];
  printHours?: number;
  filamentGrams?: number;
  rowIdx: number;
}

/**
 * Resolves full material details, color swatches, master codes, and multi-color breakdowns for a part.
 */
export function resolvePartMaterials(
  part: { filamentId?: string | null; colors?: Array<{ id: string; filamentId: string | null; grams: number }>; filamentGrams?: number },
  filaments: Filament[]
): {
  materialLabel: string;
  colorName?: string;
  colorHex?: string;
  rgb?: string;
  masterCode?: string;
  isMultiColor: boolean;
  colors?: MilestonePartColorItem[];
} {
  const hasMultipleColors = Boolean(part.colors && part.colors.length > 1);

  if (hasMultipleColors && part.colors) {
    const resolvedColors: MilestonePartColorItem[] = part.colors.map((c, idx) => {
      const f = filaments.find(item => item.id === c.filamentId);
      return {
        id: c.id || `color-${idx}`,
        filamentId: c.filamentId,
        brand: f?.brand || 'Generic',
        type: f?.type || 'Filament',
        colorName: f?.colorName,
        colorHex: f?.colorHex,
        rgb: f?.rgb,
        masterCode: f?.masterCode,
        grams: c.grams,
      };
    });

    const primaryColor = resolvedColors[0];
    const summaries = resolvedColors.map(c => {
      const codeStr = c.masterCode ? `[#${c.masterCode}] ` : '';
      const name = c.colorName || `${c.brand} ${c.type}`;
      return `${codeStr}${name} (${c.grams}g)`;
    });

    return {
      materialLabel: `Multi-Color (${resolvedColors.length}): ${summaries.join(', ')}`,
      colorName: primaryColor?.colorName,
      colorHex: primaryColor?.colorHex,
      rgb: primaryColor?.rgb,
      masterCode: primaryColor?.masterCode,
      isMultiColor: true,
      colors: resolvedColors,
    };
  }

  // Single color or default
  const primaryId = part.colors?.[0]?.filamentId || part.filamentId;
  const fil = filaments.find(f => f.id === primaryId);
  const codePrefix = fil?.masterCode ? `[#${fil.masterCode}] ` : '';
  const materialLabel = fil 
    ? `${codePrefix}${fil.brand} ${fil.type}${fil.colorName ? ` (${fil.colorName})` : ''}` 
    : 'Standard Material';

  const singleColorList: MilestonePartColorItem[] | undefined = fil ? [{
    id: 'color-0',
    filamentId: fil.id,
    brand: fil.brand,
    type: fil.type,
    colorName: fil.colorName,
    colorHex: fil.colorHex,
    rgb: fil.rgb,
    masterCode: fil.masterCode,
    grams: part.filamentGrams || 0,
  }] : undefined;

  return {
    materialLabel,
    colorName: fil?.colorName,
    colorHex: fil?.colorHex,
    rgb: fil?.rgb,
    masterCode: fil?.masterCode,
    isMultiColor: false,
    colors: singleColorList,
  };
}

export function getOrderMilestoneRows(
  quote: Quote,
  filaments: Filament[] = [],
  printers: Printer[] = [],
  grouping: 'per_unit' | 'per_line_item' = 'per_unit'
): MilestonePrintRow[] {
  const items: MilestonePrintRow[] = [];
  let globalIndex = 1;

  const computedParts = calculateJobPartRows(quote, filaments, printers);

  if (computedParts.rows && computedParts.rows.length > 0) {
    computedParts.rows.forEach((row, rowIdx) => {
      const mat = resolvePartMaterials(row.part, filaments);
      const quantity = Math.max(1, row.qty || 1);

      if (grouping === 'per_unit') {
        for (let i = 1; i <= quantity; i++) {
          items.push({
            id: `${row.part.id || rowIdx}-unit-${i}`,
            unitIndex: globalIndex++,
            unitOfPart: i,
            totalForPart: quantity,
            unitLabel: quantity > 1 ? `#${i} of ${quantity}` : '1 of 1',
            partName: row.part.name || `Part ${rowIdx + 1}`,
            materialLabel: mat.materialLabel,
            colorName: mat.colorName,
            colorHex: mat.colorHex,
            rgb: mat.rgb,
            masterCode: mat.masterCode,
            isMultiColor: mat.isMultiColor,
            colors: mat.colors,
            printHours: row.part.printHours,
            filamentGrams: row.part.filamentGrams,
            rowIdx,
          });
        }
      } else {
        items.push({
          id: `${row.part.id || rowIdx}-line-item`,
          unitIndex: globalIndex++,
          unitOfPart: 1,
          totalForPart: quantity,
          unitLabel: `Qty: ${quantity}`,
          partName: row.part.name || `Part ${rowIdx + 1}`,
          materialLabel: mat.materialLabel,
          colorName: mat.colorName,
          colorHex: mat.colorHex,
          rgb: mat.rgb,
          masterCode: mat.masterCode,
          isMultiColor: mat.isMultiColor,
          colors: mat.colors,
          printHours: row.part.printHours,
          filamentGrams: row.part.filamentGrams,
          rowIdx,
        });
      }
    });
  } else if (quote.parts && quote.parts.length > 0) {
    quote.parts.forEach((part, partIdx) => {
      const mat = resolvePartMaterials(part, filaments);
      const quantity = Math.max(1, part.quantity || 1);

      if (grouping === 'per_unit') {
        for (let i = 1; i <= quantity; i++) {
          items.push({
            id: `${part.id || partIdx}-unit-${i}`,
            unitIndex: globalIndex++,
            unitOfPart: i,
            totalForPart: quantity,
            unitLabel: quantity > 1 ? `#${i} of ${quantity}` : '1 of 1',
            partName: part.name || `Part ${partIdx + 1}`,
            materialLabel: mat.materialLabel,
            colorName: mat.colorName,
            colorHex: mat.colorHex,
            rgb: mat.rgb,
            masterCode: mat.masterCode,
            isMultiColor: mat.isMultiColor,
            colors: mat.colors,
            printHours: part.printHours,
            filamentGrams: part.filamentGrams,
            rowIdx: partIdx,
          });
        }
      } else {
        items.push({
          id: `${part.id || partIdx}-line-item`,
          unitIndex: globalIndex++,
          unitOfPart: 1,
          totalForPart: quantity,
          unitLabel: `Qty: ${quantity}`,
          partName: part.name || `Part ${partIdx + 1}`,
          materialLabel: mat.materialLabel,
          colorName: mat.colorName,
          colorHex: mat.colorHex,
          rgb: mat.rgb,
          masterCode: mat.masterCode,
          isMultiColor: mat.isMultiColor,
          colors: mat.colors,
          printHours: part.printHours,
          filamentGrams: part.filamentGrams,
          rowIdx: partIdx,
        });
      }
    });
  } else {
    const fallbackPart = {
      filamentId: quote.parameters?.filamentId,
      colors: quote.parameters?.colors,
      filamentGrams: quote.parameters?.filamentGrams,
    };
    const mat = resolvePartMaterials(fallbackPart, filaments);
    items.push({
      id: 'single-unit-1',
      unitIndex: 1,
      unitOfPart: 1,
      totalForPart: 1,
      unitLabel: '1 of 1',
      partName: quote.jobName || '3D Printed Model',
      materialLabel: mat.materialLabel,
      colorName: mat.colorName,
      colorHex: mat.colorHex,
      rgb: mat.rgb,
      masterCode: mat.masterCode,
      isMultiColor: mat.isMultiColor,
      colors: mat.colors,
      printHours: quote.parameters?.printHours,
      filamentGrams: quote.parameters?.filamentGrams,
      rowIdx: 0,
    });
  }

  return items;
}

export interface MilestoneProgressStats {
  completedSteps: number;
  totalSteps: number;
  percent: number;
  isAllCompleted: boolean;
  totalUnits: number;
  completedUnits: number; // units where all 8 milestones are checked
}

export function getOrderMilestoneStats(
  order: Order,
  quote: Quote,
  filaments: Filament[] = [],
  printers: Printer[] = []
): MilestoneProgressStats {
  const rows = getOrderMilestoneRows(quote, filaments, printers, 'per_unit');
  const totalSteps = rows.length * MILESTONES.length;
  if (totalSteps === 0) {
    return {
      completedSteps: 0,
      totalSteps: 0,
      percent: 0,
      isAllCompleted: false,
      totalUnits: 0,
      completedUnits: 0,
    };
  }

  let completedSteps = 0;
  let completedUnits = 0;
  const milestones = order.milestones || {};

  rows.forEach(row => {
    const unitState = milestones[row.id] || {};
    let unitCheckedCount = 0;
    MILESTONES.forEach(m => {
      if (unitState[m.key]) {
        completedSteps++;
        unitCheckedCount++;
      }
    });
    if (unitCheckedCount === MILESTONES.length) {
      completedUnits++;
    }
  });

  const percent = Math.round((completedSteps / totalSteps) * 100);
  return {
    completedSteps,
    totalSteps,
    percent,
    isAllCompleted: completedSteps === totalSteps && totalSteps > 0,
    totalUnits: rows.length,
    completedUnits,
  };
}
