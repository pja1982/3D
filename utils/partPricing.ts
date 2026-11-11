import type { Part, Filament, Printer, GeneralSettings } from '../types';
import { calculatePrinterRates } from './printerRates';
import { getFilamentEffectiveFailureRate } from './filamentFailureRates';

export interface PartPriceMetrics {
  materialCost: number;        // Filament material cost ($)
  electricityCost: number;     // Power consumption cost ($)
  machineCost: number;         // Depreciation & maintenance wear ($)
  laborCost: number;           // Post-processing manual labor ($)
  hardwareCost: number;        // Fasteners & hardware ($)
  licenseCost: number;         // Commercial subscription license overhead ($)
  rawCost: number;             // Direct costs subtotal ($)
  effectiveFailureRate: number;// Failure buffer %
  costWithFailureRate: number; // Base manufacturing unit cost with failure buffer ($)
  calculatedPrice: number;     // Formula price based on default profit margin ($)
  effectivePrice: number;      // Final selling price (customUnitPrice if set, else calculatedPrice) ($)
  profitAmount: number;        // Gross profit per unit ($)
  markupPercent: number;       // Effective markup % over manufacturing cost (((Price - Cost) / Cost) * 100)
  profitMarginPercent: number; // Effective profit margin % (((Price - Cost) / Price) * 100)
  isCustom: boolean;           // True if user specified custom price override
}

/**
 * Computes exact estimated manufacturing cost, formula calculated price (Cal Price),
 * effective selling price, and markup % for any 3D printed catalog part.
 */
export function calculatePartPricing(
  part: Part | Omit<Part, 'id'>,
  filaments: Filament[] = [],
  printers: Printer[] = [],
  settings?: GeneralSettings,
  priceOverride?: number | null
): PartPriceMetrics {
  // 1. Material Cost & Risk Detection
  let materialCost = 0;
  let highestRisk = getFilamentEffectiveFailureRate(null, settings);

  if (part.colors && part.colors.length > 0) {
    materialCost = part.colors.reduce((sum, c) => {
      const fil = filaments.find(f => f.id === c.filamentId);
      const costPerKg = fil ? fil.costPerKg : 22.00;
      const risk = getFilamentEffectiveFailureRate(fil, settings);
      if (risk.rate > highestRisk.rate) highestRisk = risk;
      return sum + ((c.grams || 0) / 1000) * costPerKg;
    }, 0);
  } else {
    const fil = filaments.find(f => f.id === part.filamentId);
    const costPerKg = fil ? fil.costPerKg : 20.00;
    highestRisk = getFilamentEffectiveFailureRate(fil, settings);
    materialCost = ((part.filamentGrams || 50) / 1000) * costPerKg;
  }

  // 2. Printer Rates & Electricity
  const printer = printers.find(p => p.id === part.printerId) || printers.find(p => p.isDefault) || printers[0];
  const printerWatts = printer?.watts || 250;
  const rates = calculatePrinterRates(printer, settings);
  const electricityKwh = settings?.electricityCostKwh ?? 0.32;
  const electricityCost = (part.printHours || 0) * (printerWatts / 1000) * electricityKwh;
  
  const enableDeprec = settings?.enablePrinterDepreciation ?? true;
  const machineCost = enableDeprec ? (part.printHours || 0) * (rates.totalHourlyRate || 0.50) : 0;

  // 3. Post-Processing Labor, Hardware & Commercial License Overhead
  const laborRate = settings?.laborCostPerHour ?? 25.00;
  const laborCost = (part.postProcessingHours || 0) * laborRate;
  const hardwareCost = part.hardwareCost || 0;
  const licenseCost = (part.licenseFeePerUnit !== undefined && part.licenseFeePerUnit !== null && !isNaN(part.licenseFeePerUnit))
    ? Math.max(0, part.licenseFeePerUnit)
    : 0;

  // 4. Raw Direct Costs Subtotal
  const rawCost = materialCost + electricityCost + machineCost + laborCost + hardwareCost + licenseCost;

  // 5. Failure Rate Buffer
  const effectiveFailureRate = highestRisk.rate;
  const costWithFailureRate = effectiveFailureRate < 100 
    ? rawCost / (1 - (effectiveFailureRate / 100))
    : rawCost;

  // 6. Formula Calculated Price ("Cal Price")
  const defaultMargin = settings?.profitMargin ?? 30;
  const calculatedPrice = parseFloat((costWithFailureRate * (1 + defaultMargin / 100)).toFixed(2));

  // 7. Effective Selling Price
  let effectivePrice = calculatedPrice;
  let isCustom = false;

  if (priceOverride !== undefined && priceOverride !== null && !isNaN(priceOverride) && priceOverride >= 0) {
    effectivePrice = priceOverride;
    isCustom = true;
  } else if (typeof part.customUnitPrice === 'number' && !isNaN(part.customUnitPrice) && part.customUnitPrice >= 0) {
    effectivePrice = part.customUnitPrice;
    isCustom = true;
  }

  // 8. Profit & Markup %
  const profitAmount = parseFloat((effectivePrice - costWithFailureRate).toFixed(2));
  const markupPercent = costWithFailureRate > 0 
    ? parseFloat((((effectivePrice - costWithFailureRate) / costWithFailureRate) * 100).toFixed(1))
    : 0;
  const profitMarginPercent = effectivePrice > 0 
    ? parseFloat((((effectivePrice - costWithFailureRate) / effectivePrice) * 100).toFixed(1))
    : 0;

  return {
    materialCost: parseFloat(materialCost.toFixed(2)),
    electricityCost: parseFloat(electricityCost.toFixed(2)),
    machineCost: parseFloat(machineCost.toFixed(2)),
    laborCost: parseFloat(laborCost.toFixed(2)),
    hardwareCost: parseFloat(hardwareCost.toFixed(2)),
    licenseCost: parseFloat(licenseCost.toFixed(2)),
    rawCost: parseFloat(rawCost.toFixed(2)),
    effectiveFailureRate,
    costWithFailureRate: parseFloat(costWithFailureRate.toFixed(2)),
    calculatedPrice,
    effectivePrice,
    profitAmount,
    markupPercent,
    profitMarginPercent,
    isCustom,
  };
}
