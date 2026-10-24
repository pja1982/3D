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

export interface MilestonePrintRow {
  id: string;
  unitIndex: number;
  unitOfPart: number;
  totalForPart: number;
  unitLabel: string;
  partName: string;
  materialLabel: string;
  colorName?: string;
  printHours?: number;
  filamentGrams?: number;
  rowIdx: number;
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
      const fil = filaments.find(f => f.id === row.part.filamentId);
      const codePrefix = fil?.masterCode ? `[#${fil.masterCode}] ` : '';
      const materialLabel = fil 
        ? `${codePrefix}${fil.brand} ${fil.type}${fil.colorName ? ` (${fil.colorName})` : ''}` 
        : 'Standard Material';
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
            materialLabel,
            colorName: fil?.colorName,
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
          materialLabel,
          colorName: fil?.colorName,
          printHours: row.part.printHours,
          filamentGrams: row.part.filamentGrams,
          rowIdx,
        });
      }
    });
  } else if (quote.parts && quote.parts.length > 0) {
    quote.parts.forEach((part, partIdx) => {
      const fil = filaments.find(f => f.id === part.filamentId);
      const codePrefix = fil?.masterCode ? `[#${fil.masterCode}] ` : '';
      const materialLabel = fil 
        ? `${codePrefix}${fil.brand} ${fil.type}${fil.colorName ? ` (${fil.colorName})` : ''}` 
        : 'Standard Material';
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
            materialLabel,
            colorName: fil?.colorName,
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
          materialLabel,
          colorName: fil?.colorName,
          printHours: part.printHours,
          filamentGrams: part.filamentGrams,
          rowIdx: partIdx,
        });
      }
    });
  } else {
    const fil = filaments.find(f => f.id === quote.parameters?.filamentId);
    const materialLabel = fil 
      ? `${fil.brand} ${fil.type}${fil.colorName ? ` (${fil.colorName})` : ''}` 
      : 'Standard Material';
    items.push({
      id: 'single-unit-1',
      unitIndex: 1,
      unitOfPart: 1,
      totalForPart: 1,
      unitLabel: '1 of 1',
      partName: quote.jobName || '3D Printed Model',
      materialLabel,
      colorName: fil?.colorName,
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
