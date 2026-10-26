import type { Filament } from '../types';

export const MYSTERY_PLA_ID = '__mystery_pla_random__';
export const MYSTERY_PLA_LABEL = "Surprise / Maker's Choice PLA";

/**
 * Checks whether a given filament belongs to the PLA polymer family
 * (Basic PLA, Silk PLA, Matte PLA, PLA+, PLA-Lite, Tough PLA, etc.)
 */
export function isFilamentPla(filament?: Filament | null): boolean {
  if (!filament) return false;
  const combined = `${filament.type || ''} ${filament.name || ''} ${filament.material || ''} ${filament.material_type || ''}`.toLowerCase();
  
  // Must not be PETG, ABS, ASA, TPU, Nylon, PC
  if (combined.includes('petg') || combined.includes('pteg') || combined.includes('abs') || combined.includes('asa') || combined.includes('tpu') || combined.includes('nylon') || combined.includes('polycarbonate')) {
    return false;
  }

  return (
    combined.includes('pla') ||
    combined.includes('silk') ||
    combined.includes('matte') ||
    combined.includes('tough')
  );
}

/**
 * Returns all filaments eligible for the Random / Mystery PLA pool.
 * Priority:
 * 1. Spools explicitly marked `isRandomEligible === true` that are PLA.
 * 2. If no spools are marked, falls back to all in-stock PLA spools.
 */
export function getEligibleRandomFilaments(
  filaments: Filament[],
  requiredGrams?: number
): Filament[] {
  if (!Array.isArray(filaments) || filaments.length === 0) return [];

  // Filter for PLA spools only
  const plaFilaments = filaments.filter(f => isFilamentPla(f));

  // Check if any PLA spools are explicitly marked as eligible
  const explicitlyMarked = plaFilaments.filter(f => f.isRandomEligible === true);

  const candidatePool = explicitlyMarked.length > 0 ? explicitlyMarked : plaFilaments;

  // If required grams is specified, prefer spools that have sufficient remaining weight
  if (typeof requiredGrams === 'number' && requiredGrams > 0) {
    const withSufficientWeight = candidatePool.filter(f => {
      if (typeof f.remaining_grams === 'number' && f.remaining_grams > 0) {
        return f.remaining_grams >= requiredGrams;
      }
      return true; // Not weighed or untracked spools remain in pool
    });
    if (withSufficientWeight.length > 0) {
      return withSufficientWeight;
    }
  }

  return candidatePool;
}

/**
 * Pseudo-randomly rolls a filament from the eligible PLA pool.
 * Excludes currentFilamentId to ensure a fresh pick when clicking "Re-roll".
 */
export function rollRandomFilament(
  filaments: Filament[],
  currentFilamentId?: string | null,
  requiredGrams?: number
): Filament | null {
  const pool = getEligibleRandomFilaments(filaments, requiredGrams);
  if (pool.length === 0) return null;

  // Filter out current filament if more than 1 option exists
  const choices = (pool.length > 1 && currentFilamentId)
    ? pool.filter(f => f.id !== currentFilamentId)
    : pool;

  const finalPool = choices.length > 0 ? choices : pool;
  const randomIndex = Math.floor(Math.random() * finalPool.length);
  return finalPool[randomIndex] || null;
}

/**
 * Computes the realistic average $/kg of eligible PLA filaments to ensure
 * placeholder mystery quotes are priced accurately.
 */
export function getAveragePlaCostPerKg(filaments: Filament[]): number {
  const pool = getEligibleRandomFilaments(filaments);
  if (pool.length === 0) return 22.00; // Default fallback $/kg

  const validCosts = pool.map(f => Number(f.costPerKg) || 0).filter(c => c > 0);
  if (validCosts.length === 0) return 22.00;

  const sum = validCosts.reduce((a, b) => a + b, 0);
  return parseFloat((sum / validCosts.length).toFixed(2));
}
