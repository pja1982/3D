import type { Filament, GeneralSettings } from '../types';

export interface MaterialDifficultyRisk {
  rate: number;
  isTechnical: boolean;
  materialCategory: 'tpu' | 'abs' | 'nylon' | 'pc' | 'carbon' | 'standard';
  badgeLabel: string;
  reason: string;
}

/**
 * Detects material category from filament type, material string, or name.
 */
export function detectMaterialCategory(materialNameOrType?: string): 'tpu' | 'abs' | 'nylon' | 'pc' | 'carbon' | 'standard' {
  if (!materialNameOrType) return 'standard';
  const upper = materialNameOrType.toUpperCase();
  if (upper.includes('TPU') || upper.includes('TPE') || upper.includes('FLEX')) return 'tpu';
  if (upper.includes('ABS') || upper.includes('ASA')) return 'abs';
  if (upper.includes('NYLON') || upper.includes('PA6') || upper.includes('PA12') || upper.includes('PA-') || upper.includes('PA ') || upper.startsWith('PA')) return 'nylon';
  if (upper.includes('PC') || upper.includes('POLYCARBONATE')) return 'pc';
  if (upper.includes('CF') || upper.includes('CARBON') || upper.includes('GF') || upper.includes('GLASS FIBER')) return 'carbon';
  return 'standard';
}

export const DEFAULT_MATERIAL_FAILURE_RATES = {
  tpu: 15,
  abs: 18,
  nylon: 20,
  pc: 20,
  carbon: 12,
  standard: 5,
};

/**
 * Computes the effective failure rate for a given filament based on explicit spool override
 * or material technical difficulty presets (e.g. TPU, ABS).
 */
export function getFilamentEffectiveFailureRate(
  filament: Filament | null | undefined,
  generalSettings?: GeneralSettings
): MaterialDifficultyRisk {
  const baseDefaultRate = generalSettings?.failureRate ?? 5;

  if (!filament) {
    return {
      rate: baseDefaultRate,
      isTechnical: false,
      materialCategory: 'standard',
      badgeLabel: `${baseDefaultRate}%`,
      reason: 'Default base failure rate',
    };
  }

  // 1. Explicit spool-level failure rate override
  if (typeof filament.failureRate === 'number' && !isNaN(filament.failureRate) && filament.failureRate >= 0) {
    const cat = detectMaterialCategory(filament.type || filament.material || filament.name);
    const isHigher = filament.failureRate > baseDefaultRate;
    return {
      rate: filament.failureRate,
      isTechnical: isHigher,
      materialCategory: cat,
      badgeLabel: `${filament.failureRate}%`,
      reason: `Custom rate configured for ${filament.brand} ${filament.type || 'Filament'} (${filament.failureRate}%)`,
    };
  }

  // 2. Material difficulty presets
  const isDifficultyActive = generalSettings?.enableMaterialDifficultyRates !== false;
  if (isDifficultyActive) {
    const cat = detectMaterialCategory(filament.type || filament.material || filament.name);
    const rates = {
      ...DEFAULT_MATERIAL_FAILURE_RATES,
      ...(generalSettings?.materialFailureRates || {}),
    };

    if (cat === 'tpu') {
      const rate = rates.tpu ?? 15;
      return {
        rate,
        isTechnical: rate > baseDefaultRate,
        materialCategory: 'tpu',
        badgeLabel: `TPU Risk: ${rate}%`,
        reason: 'TPU/Flexible printing risk (stringing & extruder jamming)',
      };
    }

    if (cat === 'abs') {
      const rate = rates.abs ?? 18;
      return {
        rate,
        isTechnical: rate > baseDefaultRate,
        materialCategory: 'abs',
        badgeLabel: `ABS/ASA Risk: ${rate}%`,
        reason: 'ABS/ASA thermal warping, corner lifting & layer delamination',
      };
    }

    if (cat === 'nylon') {
      const rate = rates.nylon ?? 20;
      return {
        rate,
        isTechnical: rate > baseDefaultRate,
        materialCategory: 'nylon',
        badgeLabel: `Nylon Risk: ${rate}%`,
        reason: 'Nylon/PA moisture hygroscopic & high shrinkage risk',
      };
    }

    if (cat === 'pc') {
      const rate = rates.pc ?? 20;
      return {
        rate,
        isTechnical: rate > baseDefaultRate,
        materialCategory: 'pc',
        badgeLabel: `PC Risk: ${rate}%`,
        reason: 'Polycarbonate extreme chamber temperature & bed adhesion risk',
      };
    }

    if (cat === 'carbon') {
      const rate = rates.carbon ?? 12;
      return {
        rate,
        isTechnical: rate > baseDefaultRate,
        materialCategory: 'carbon',
        badgeLabel: `Composite Risk: ${rate}%`,
        reason: 'Carbon/Glass fiber abrasive wear & nozzle clogging risk',
      };
    }
  }

  return {
    rate: baseDefaultRate,
    isTechnical: false,
    materialCategory: 'standard',
    badgeLabel: `${baseDefaultRate}%`,
    reason: 'Standard base failure rate',
  };
}
