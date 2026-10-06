import type { Quote, QuotePartConfig, Filament, Printer } from '../types';
import { calculatePrinterRates } from './printerRates';

export interface ComputedPartRow {
  part: QuotePartConfig;
  qty: number;
  qtyRequired: number;
  printer?: Printer;
  unitDirectCost: number;
  totalDirectCost: number;
  perUnitCost: number;
  lineTotalCost: number;
  perUnitPrice: number;
  lineTotalPrice: number;
}

export interface ComputedJobPartsSummary {
  rows: ComputedPartRow[];
  totalQuantity: number;
  totalQuantityRequired: number;
  grandTotalCost: number;
  grandTotalPrice: number;
}

/**
 * Computes exact itemized costs and quoted prices for every part in a quote/job.
 * Reconciles proportional direct costs with the failure-adjusted total cost and quote price.
 */
export function calculateJobPartRows(
  quote: Quote,
  filaments: Filament[] = [],
  printers: Printer[] = []
): ComputedJobPartsSummary {
  const parts: QuotePartConfig[] = (quote.parts && quote.parts.length > 0)
    ? quote.parts
    : [
        {
          id: 'part-primary',
          name: quote.jobName || 'Primary Part',
          quantity: 1,
          quantityRequired: 1,
          filamentGrams: quote.parameters?.filamentGrams ?? 0,
          filamentId: quote.parameters?.filamentId ?? null,
          printHours: quote.parameters?.printHours ?? 0,
          printerId: quote.parameters?.printerId ?? null,
          postProcessingHours: quote.parameters?.postProcessingHours ?? 0,
          hardwareCost: quote.parameters?.hardwareCost ?? 0,
          colors: quote.parameters?.colors,
        },
      ];

  const partCostItems = parts.map((part) => {
    const qty = Math.max(1, part.quantity || 1);
    const qtyRequired = part.quantityRequired !== undefined ? part.quantityRequired : qty;

    // 1. Material cost
    let unitMaterialCost = 0;
    if (part.colors && part.colors.length > 0) {
      unitMaterialCost = part.colors.reduce((sum, c) => {
        const fil = filaments.find((f) => f.id === c.filamentId);
        return sum + ((c.grams || 0) / 1000) * (fil?.costPerKg || 0);
      }, 0);
    } else {
      const fil = filaments.find((f) => f.id === part.filamentId);
      unitMaterialCost = ((part.filamentGrams || 0) / 1000) * (fil?.costPerKg || 0);
    }

    // 2. Machine & electricity
    const printer = printers.find((p) => p.id === part.printerId);
    const printerWatts = printer?.watts || 0;
    const printerRates = calculatePrinterRates(printer);
    const kwhRate = quote.parameters?.electricityCostKwh ?? 0.15;

    const unitElectricity = (part.printHours || 0) * (printerWatts / 1000) * kwhRate;
    const unitMachineDepreciation = (part.printHours || 0) * (printerRates.totalHourlyRate || 0);

    // 3. Labor & hardware
    const laborRate = quote.parameters?.laborCostPerHour ?? 20;
    const unitLabor = (part.postProcessingHours || 0) * laborRate;
    const unitHardware = part.hardwareCost || 0;

    // 4. Multi-color fee
    let unitMultiColor = 0;
    if (part.colors && part.colors.length > 1) {
      unitMultiColor = 3.0 * (part.colors.length - 1);
    }

    const unitDirectCost =
      unitMaterialCost +
      unitElectricity +
      unitMachineDepreciation +
      unitLabor +
      unitHardware +
      unitMultiColor;

    const totalDirectCost = unitDirectCost * qty;

    return {
      part,
      qty,
      qtyRequired,
      printer,
      unitDirectCost,
      totalDirectCost,
    };
  });

  const sumAllDirectCost = partCostItems.reduce((sum, item) => sum + item.totalDirectCost, 0);
  const targetTotalCost = quote.costBreakdown?.costWithFailureRate ?? sumAllDirectCost;
  const targetTotalPrice = quote.quotePrice ?? (targetTotalCost * (1 + (quote.parameters?.profitMargin || 0) / 100));

  const rows: ComputedPartRow[] = partCostItems.map((item) => {
    let lineTotalCost: number;
    let lineTotalPrice: number;

    if (sumAllDirectCost > 0 && targetTotalCost > 0) {
      const ratio = item.totalDirectCost / sumAllDirectCost;
      lineTotalCost = ratio * targetTotalCost;
      lineTotalPrice = ratio * targetTotalPrice;
    } else {
      const failureRate = quote.parameters?.failureRate || 0;
      const failureMultiplier = failureRate < 100 ? 1 / (1 - failureRate / 100) : 1;
      lineTotalCost = item.unitDirectCost * failureMultiplier * item.qty;
      lineTotalPrice = lineTotalCost * (1 + (quote.parameters?.profitMargin || 0) / 100);
    }

    const perUnitCost = lineTotalCost / item.qty;
    const perUnitPrice = lineTotalPrice / item.qty;

    return {
      ...item,
      perUnitCost,
      lineTotalCost,
      perUnitPrice,
      lineTotalPrice,
    };
  });

  const totalQuantity = rows.reduce((sum, r) => sum + r.qty, 0);
  const totalQuantityRequired = rows.reduce((sum, r) => sum + r.qtyRequired, 0);
  const grandTotalCost = rows.reduce((sum, r) => sum + r.lineTotalCost, 0);
  const grandTotalPrice = rows.reduce((sum, r) => sum + r.lineTotalPrice, 0);

  return {
    rows,
    totalQuantity,
    totalQuantityRequired,
    grandTotalCost,
    grandTotalPrice,
  };
}
