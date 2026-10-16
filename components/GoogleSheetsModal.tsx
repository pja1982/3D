import React, { useState } from 'react';
import type { User } from '../firebase';
import { AppData, Part, Filament } from '../types';
import {
  create3DPrintingSpreadsheet,
  syncDataToSpreadsheet,
  pullDataFromSpreadsheet,
  generateTSVForClipboard,
  downloadCSV,
  GoogleSheetsSyncResult,
} from '../services/googleSheetsService';

interface GoogleSheetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  appData: AppData;
  onUpdateAppData: (updater: (prev: AppData) => AppData) => void;
  onSignIn: () => Promise<void>;
  cachedToken: string | null;
  onSetToast: (msg: string) => void;
}

export const GoogleSheetsModal: React.FC<GoogleSheetsModalProps> = ({
  isOpen,
  onClose,
  user,
  appData,
  onUpdateAppData,
  onSignIn,
  cachedToken,
  onSetToast,
}) => {
  const [spreadsheetId, setSpreadsheetId] = useState<string>(() => {
    return localStorage.getItem('linked_google_sheet_id') || '';
  });
  const [spreadsheetUrl, setSpreadsheetUrl] = useState<string>(() => {
    return localStorage.getItem('linked_google_sheet_url') || '';
  });
  const [sheetTitle, setSheetTitle] = useState<string>(
    `3D Print Workshop & Quotes (${new Date().toLocaleDateString()})`
  );
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<null | {
    type: 'create' | 'sync' | 'pull';
    title: string;
    description: string;
  }>(null);
  const [copiedType, setCopiedType] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSaveSpreadsheetId = (input: string) => {
    let cleanId = input.trim();
    // Support pasting full Google Sheet URL: https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit...
    const match = cleanId.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (match && match[1]) {
      cleanId = match[1];
    }
    setSpreadsheetId(cleanId);
    localStorage.setItem('linked_google_sheet_id', cleanId);
    const url = `https://docs.google.com/spreadsheets/d/${cleanId}/edit`;
    setSpreadsheetUrl(url);
    localStorage.setItem('linked_google_sheet_url', url);
    onSetToast('Linked Google Sheet updated.');
  };

  const executeConfirmedAction = async () => {
    if (!confirmAction) return;
    const action = confirmAction.type;
    setConfirmAction(null);
    setIsProcessing(true);
    setStatusMessage(null);

    try {
      if (!cachedToken) {
        throw new Error('Please sign in with Google to grant Google Sheets access.');
      }

      if (action === 'create') {
        setStatusMessage('Creating Google Spreadsheet with custom 3D printing tabs...');
        const result: GoogleSheetsSyncResult = await create3DPrintingSpreadsheet(
          cachedToken,
          appData,
          sheetTitle
        );
        setSpreadsheetId(result.spreadsheetId);
        setSpreadsheetUrl(result.spreadsheetUrl);
        localStorage.setItem('linked_google_sheet_id', result.spreadsheetId);
        localStorage.setItem('linked_google_sheet_url', result.spreadsheetUrl);
        onSetToast('🎉 Google Sheet successfully created and populated!');
        setStatusMessage(`Created Google Sheet with ${result.quotesCount} quotes, ${result.partsCount} parts, and pricing configuration!`);
      } else if (action === 'sync') {
        if (!spreadsheetId) {
          throw new Error('Please enter or select a Google Sheet ID to sync.');
        }
        setStatusMessage('Pushing quotes, parts catalog, printers, and filaments to Google Sheet...');
        await syncDataToSpreadsheet(cachedToken, spreadsheetId, appData);
        onSetToast('✅ Google Sheet updated with latest data!');
        setStatusMessage(`Successfully synced ${appData.quotes.length} quotes and ${appData.parts.length} catalog parts to Google Sheets.`);
      } else if (action === 'pull') {
        if (!spreadsheetId) {
          throw new Error('Please enter a Google Sheet ID to import from.');
        }
        setStatusMessage('Reading parts and filaments from Google Sheet...');
        const pulled = await pullDataFromSpreadsheet(cachedToken, spreadsheetId);
        if (pulled.parts.length === 0 && pulled.filaments.length === 0) {
          setStatusMessage('No parts or filaments found in the sheet. Ensure tab names match "Parts Catalog" and "Filaments".');
        } else {
          onUpdateAppData((prev) => ({
            ...prev,
            parts: pulled.parts.length > 0 ? pulled.parts : prev.parts,
            filaments: pulled.filaments.length > 0 ? pulled.filaments : prev.filaments,
          }));
          onSetToast(`Imported ${pulled.parts.length} parts and ${pulled.filaments.length} filaments from Google Sheets!`);
          setStatusMessage(`Updated catalog with ${pulled.parts.length} parts and ${pulled.filaments.length} filaments from your sheet.`);
        }
      }
    } catch (err: any) {
      console.error('Google Sheets operation error:', err);
      setStatusMessage(`Error: ${err.message || String(err)}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopyClipboard = (table: 'quotes' | 'parts' | 'filaments' | 'printers') => {
    const tsv = generateTSVForClipboard(appData, table);
    navigator.clipboard.writeText(tsv);
    setCopiedType(table);
    onSetToast(`Copied ${table} table to clipboard! Paste directly into Google Sheets.`);
    setTimeout(() => setCopiedType(null), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-slate-900 border border-emerald-500/30 rounded-2xl shadow-2xl p-6 text-slate-200">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-2xl">
              📊
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                Google Sheets Integration
                <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  Live Sync
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Turn all your 3D print quotes, itemized parts, filaments, and machine costs into a live Google Sheet.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            ✕
          </button>
        </div>

        {/* Confirmation Dialog Overlay (Mandatory for mutating/updating Workspace data) */}
        {confirmAction && (
          <div className="my-4 p-4 rounded-xl bg-amber-950/40 border border-amber-500/50 text-amber-200 animate-fadeIn">
            <div className="flex items-start gap-3">
              <span className="text-2xl">⚠️</span>
              <div className="flex-1">
                <h3 className="font-semibold text-amber-100 text-sm">{confirmAction.title}</h3>
                <p className="text-xs text-amber-300/90 mt-1 leading-relaxed">
                  {confirmAction.description}
                </p>
                <div className="flex items-center gap-2.5 mt-3">
                  <button
                    onClick={executeConfirmedAction}
                    disabled={isProcessing}
                    className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition shadow-md flex items-center gap-1.5"
                  >
                    <span>Confirm & Proceed</span>
                  </button>
                  <button
                    onClick={() => setConfirmAction(null)}
                    disabled={isProcessing}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Status notification */}
        {statusMessage && (
          <div className="my-4 p-3 bg-slate-800/90 border border-slate-700 rounded-xl text-xs text-slate-200 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <span className="animate-spin text-emerald-400">{isProcessing ? '⏳' : 'ℹ️'}</span>
              <span>{statusMessage}</span>
            </span>
            {!isProcessing && (
              <button
                onClick={() => setStatusMessage(null)}
                className="text-slate-400 hover:text-white ml-2"
              >
                ✕
              </button>
            )}
          </div>
        )}

        <div className="space-y-6 mt-5">
          {/* Section 1: Google Account Connection */}
          <div className="p-4 bg-slate-800/40 rounded-xl border border-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <span>1. Google Account & Workspace Access</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Connect your Google account with permission to manage your 3D printing spreadsheets.
                </p>
              </div>

              {user ? (
                <div className="flex items-center gap-2 bg-emerald-950/40 border border-emerald-500/30 px-3 py-1.5 rounded-lg">
                  <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                  <span className="text-xs text-emerald-300 font-medium">
                    {user.email || user.displayName}
                  </span>
                  <span className="text-[10px] text-emerald-400/80 font-mono">
                    (Spreadsheets Scope Active)
                  </span>
                </div>
              ) : (
                /* Official Google Sign-in button per Workspace integration skill */
                <button
                  type="button"
                  onClick={onSignIn}
                  className="flex items-center gap-2 bg-white hover:bg-slate-100 text-slate-800 font-medium px-3.5 py-1.5 rounded-lg border border-slate-300 shadow-sm text-xs transition active:scale-95"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Sign in with Google</span>
                </button>
              )}
            </div>
          </div>

          {/* Section 2: Direct 1-Click Google Sheet Creation & Sync */}
          <div className="p-4 bg-slate-800/40 rounded-xl border border-slate-800 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <span>2. Create & Sync Your Google Spreadsheet</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Creates a professionally styled spreadsheet in your Google account with dedicated tabs for Overview, Quotes, Parts Catalog, Filaments, 3D Printers, Orders, and Pricing Settings.
              </p>
            </div>

            {/* Create New Sheet Card */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end bg-slate-900/60 p-3 rounded-lg border border-slate-800">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  Spreadsheet Title:
                </label>
                <input
                  type="text"
                  value={sheetTitle}
                  onChange={(e) => setSheetTitle(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                  placeholder="e.g. 3D Print Workshop & Quotes"
                />
              </div>

              <div>
                <button
                  type="button"
                  disabled={!user || isProcessing}
                  onClick={() =>
                    setConfirmAction({
                      type: 'create',
                      title: 'Create new Google Spreadsheet?',
                      description: `This will create a new Google Spreadsheet titled "${sheetTitle}" in your Google account with all ${appData.quotes.length} quotes, ${appData.parts.length} parts, ${appData.printers.length} printers, and filaments.`,
                    })
                  }
                  className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 disabled:opacity-50 text-slate-950 font-bold px-3 py-2 rounded-lg text-xs transition shadow-md flex items-center justify-center gap-1.5"
                >
                  <span>🚀 Create Google Sheet</span>
                </button>
              </div>
            </div>

            {/* Linked Sheet Link / Input */}
            <div className="space-y-2 pt-2">
              <label className="block text-[11px] font-medium text-slate-300">
                Linked Spreadsheet ID or Google Sheets URL:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={spreadsheetId}
                  onChange={(e) => handleSaveSpreadsheetId(e.target.value)}
                  placeholder="Paste Google Sheet URL or ID (e.g. 1BxiMVs0XR...)"
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                />
                {spreadsheetUrl && (
                  <a
                    href={spreadsheetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/40 px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1"
                  >
                    <span>Open Sheet</span>
                    <span>↗</span>
                  </a>
                )}
              </div>
            </div>

            {/* Actions on Linked Sheet */}
            {spreadsheetId && (
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  disabled={!user || isProcessing}
                  onClick={() =>
                    setConfirmAction({
                      type: 'sync',
                      title: 'Update existing Google Spreadsheet?',
                      description: `This will write the latest data from this app (${appData.quotes.length} quotes, ${appData.parts.length} catalog parts, filaments, and rates) into your Google Sheet (ID: ${spreadsheetId}). Existing values in those tabs will be updated.`,
                    })
                  }
                  className="bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-emerald-300 border border-emerald-500/40 px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5"
                >
                  <span>🔄 Push / Sync Latest to Sheet</span>
                </button>

                <button
                  type="button"
                  disabled={!user || isProcessing}
                  onClick={() =>
                    setConfirmAction({
                      type: 'pull',
                      title: 'Import catalog parts & filaments from Google Sheet?',
                      description: `This will read the "Parts Catalog" and "Filaments" tabs from your Google Sheet (ID: ${spreadsheetId}) and update your local catalog. Any manual edits made in the spreadsheet will be brought into this app.`,
                    })
                  }
                  className="bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-cyan-300 border border-cyan-500/40 px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5"
                >
                  <span>📥 Pull / Import from Sheet</span>
                </button>
              </div>
            )}
          </div>

          {/* Section 3: Instant Clipboard & Offline CSV Format (For Local Docker / LAN Network) */}
          <div className="p-4 bg-slate-800/40 rounded-xl border border-slate-800 space-y-3">
            <div>
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <span>3. Offline & Local Network Copy / Export</span>
                <span className="text-[10px] bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded">
                  No Cloud Required
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                If you are running on your private Docker LAN IP (where Google OAuth blocks sign-in), you can copy tab-separated tables to clipboard and paste directly into Google Sheets, or download formatted CSVs.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              <button
                type="button"
                onClick={() => handleCopyClipboard('quotes')}
                className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 px-3 py-2 rounded-lg text-xs font-medium transition flex flex-col items-center justify-center gap-1 text-center"
              >
                <span>🧾 {copiedType === 'quotes' ? '✅ Copied!' : 'Copy Quotes'}</span>
                <span className="text-[10px] text-slate-400 font-normal">For Google Sheets</span>
              </button>

              <button
                type="button"
                onClick={() => handleCopyClipboard('parts')}
                className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 px-3 py-2 rounded-lg text-xs font-medium transition flex flex-col items-center justify-center gap-1 text-center"
              >
                <span>📦 {copiedType === 'parts' ? '✅ Copied!' : 'Copy Parts'}</span>
                <span className="text-[10px] text-slate-400 font-normal">For Google Sheets</span>
              </button>

              <button
                type="button"
                onClick={() => handleCopyClipboard('filaments')}
                className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 px-3 py-2 rounded-lg text-xs font-medium transition flex flex-col items-center justify-center gap-1 text-center"
              >
                <span>🧵 {copiedType === 'filaments' ? '✅ Copied!' : 'Copy Filaments'}</span>
                <span className="text-[10px] text-slate-400 font-normal">For Google Sheets</span>
              </button>

              <button
                type="button"
                onClick={() => handleCopyClipboard('printers')}
                className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 px-3 py-2 rounded-lg text-xs font-medium transition flex flex-col items-center justify-center gap-1 text-center"
              >
                <span>🖨️ {copiedType === 'printers' ? '✅ Copied!' : 'Copy Printers'}</span>
                <span className="text-[10px] text-slate-400 font-normal">For Google Sheets</span>
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-slate-400">
              <span>Or download CSV files:</span>
              <button
                type="button"
                onClick={() => downloadCSV(appData, 'quotes')}
                className="text-cyan-400 hover:underline"
              >
                Quotes CSV
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => downloadCSV(appData, 'parts')}
                className="text-cyan-400 hover:underline"
              >
                Parts CSV
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => downloadCSV(appData, 'filaments')}
                className="text-cyan-400 hover:underline"
              >
                Filaments CSV
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => downloadCSV(appData, 'printers')}
                className="text-cyan-400 hover:underline"
              >
                Printers CSV
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-slate-800 flex justify-between items-center text-xs text-slate-400">
          <span>Protected with Google Workspace OAuth token & explicit user confirmation.</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
export default GoogleSheetsModal;
