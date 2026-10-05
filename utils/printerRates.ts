import type { Printer, GeneralSettings } from '../types';

export interface PrinterRateBreakdown {
  depreciationPerHour: number;
  maintenancePerHour: number;
  usageFeePerHour: number;
  totalHourlyRate: number;
}

/**
 * Calculates hourly depreciation, maintenance, usage fee, and total hourly printer use rate.
 */
export function calculatePrinterRates(
  printer?: Printer | null,
  settings?: GeneralSettings
): PrinterRateBreakdown {
  if (!printer) {
    const fallbackRate = settings?.defaultPrinterHourlyRate ?? 0;
    return {
      depreciationPerHour: fallbackRate,
      maintenancePerHour: 0,
      usageFeePerHour: 0,
      totalHourlyRate: fallbackRate,
    };
  }

  // Depreciation: Either directly specified hourly rate or purchaseCost / lifespanHours
  let depreciationPerHour = 0;
  if (printer.hourlyDepreciation !== undefined && printer.hourlyDepreciation > 0) {
    depreciationPerHour = printer.hourlyDepreciation;
  } else if (printer.purchaseCost && printer.lifespanHours && printer.lifespanHours > 0) {
    depreciationPerHour = printer.purchaseCost / printer.lifespanHours;
  }

  const maintenancePerHour = printer.maintenanceCostPerHour ?? (settings?.defaultMaintenanceCostPerHour ?? 0);
  const usageFeePerHour = printer.hourlyUsageFee ?? (settings?.defaultHourlyUsageFee ?? 0);

  let totalHourlyRate = depreciationPerHour + maintenancePerHour + usageFeePerHour;

  if (totalHourlyRate <= 0 && settings?.defaultPrinterHourlyRate) {
    totalHourlyRate = settings.defaultPrinterHourlyRate;
  }

  return {
    depreciationPerHour: parseFloat(depreciationPerHour.toFixed(4)),
    maintenancePerHour: parseFloat(maintenancePerHour.toFixed(4)),
    usageFeePerHour: parseFloat(usageFeePerHour.toFixed(4)),
    totalHourlyRate: parseFloat(totalHourlyRate.toFixed(4)),
  };
}
