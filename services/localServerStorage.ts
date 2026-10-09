import type { AppData } from '../types';

export interface LocalServerStatus {
  available: boolean;
  mode: 'docker-local' | 'browser-only';
  storagePath?: string;
  lastChecked: number;
}

/**
 * Check if the backend local storage API (Docker/Node server) is running and reachable.
 */
export async function checkLocalServerStatus(): Promise<LocalServerStatus> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const res = await fetch('/api/status', {
      method: 'GET',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      return {
        available: true,
        mode: 'docker-local',
        storagePath: data.storagePath || 'data/print-tracker-db.json',
        lastChecked: Date.now(),
      };
    }
  } catch {
    // Server endpoint not reachable or running in pure static mode
  }

  return {
    available: false,
    mode: 'browser-only',
    lastChecked: Date.now(),
  };
}

/**
 * Fetch persistent database stored on the local Docker host.
 */
export async function fetchLocalServerData(): Promise<AppData | null> {
  try {
    const res = await fetch('/api/storage', { method: 'GET' });
    if (!res.ok) return null;
    const data = await res.json();
    if (data && typeof data === 'object' && !data.empty && (data.quotes || data.parts)) {
      return data as AppData;
    }
  } catch (err) {
    console.warn('Could not fetch data from local server storage:', err);
  }
  return null;
}

/**
 * Save persistent database to the local Docker host filesystem.
 */
export async function saveLocalServerData(data: AppData): Promise<boolean> {
  try {
    const res = await fetch('/api/storage', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return res.ok;
  } catch (err) {
    console.warn('Failed to save data to local server storage:', err);
    return false;
  }
}

/**
 * Download a full JSON backup file directly in the browser.
 */
export function exportBackupJson(data: AppData, filename?: string): void {
  const dateStr = new Date().toISOString().split('T')[0];
  const name = filename || `3d-print-tracker-backup-${dateStr}.json`;
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Parse an imported backup JSON file and validate structure.
 */
export async function parseBackupFile(file: File): Promise<AppData> {
  const text = await file.text();
  const parsed = JSON.parse(text);

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid backup file: root must be an object.');
  }

  // Ensure minimum expected arrays exist
  const appData: AppData = {
    quotes: Array.isArray(parsed.quotes) ? parsed.quotes : [],
    parts: Array.isArray(parsed.parts) ? parsed.parts : [],
    filaments: Array.isArray(parsed.filaments) ? parsed.filaments : [],
    printers: Array.isArray(parsed.printers) ? parsed.printers : [],
    orders: Array.isArray(parsed.orders) ? parsed.orders : [],
    generalSettings: parsed.generalSettings && typeof parsed.generalSettings === 'object'
      ? parsed.generalSettings
      : {
          electricityCostKwh: 0.15,
          laborCostPerHour: 20.0,
          failureRate: 5,
          profitMargin: 30,
        },
  };

  return appData;
}
