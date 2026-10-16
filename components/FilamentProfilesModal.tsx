import React, { useState, useEffect } from 'react';
import type { Filament } from '../types';
import {
  USER_SAMPLE_3D_FILAMENT_PROFILES_JSON,
  parse3DFilamentProfiles,
  exportTo3DFilamentProfiles,
  download3DFilamentProfilesJson,
  copy3DFilamentProfilesToClipboard,
  getFilamentBackgroundStyle,
  getContrastTheme,
} from '../utils/filamentProfilesSync';

interface FilamentProfilesModalProps {
  isOpen: boolean;
  onClose: () => void;
  filaments: Filament[];
  onImportFilaments: (newFilaments: Filament[], mode: 'merge' | 'replace') => void;
}

export const FilamentProfilesModal: React.FC<FilamentProfilesModalProps> = ({
  isOpen,
  onClose,
  filaments,
  onImportFilaments,
}) => {
  const [activeTab, setActiveTab] = useState<'import' | 'export'>('import');
  const [jsonText, setJsonText] = useState<string>('');
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [defaultCost, setDefaultCost] = useState<number>(22);
  const [overrideAllCosts, setOverrideAllCosts] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  // Automatically parse preview as user edits JSON or loads samples
  const parsedPreview = React.useMemo(() => {
    if (!jsonText.trim()) return null;
    return parse3DFilamentProfiles(jsonText, defaultCost);
  }, [jsonText, defaultCost]);

  // Clean state when modal opens
  useEffect(() => {
    if (isOpen) {
      setImportStatus(null);
      setCopied(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleLoadUserSample = () => {
    setJsonText(USER_SAMPLE_3D_FILAMENT_PROFILES_JSON);
    setImportStatus('Loaded 20 spools from 3dfilamentprofiles.com sample!');
    setTimeout(() => setImportStatus(null), 3500);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === 'string') {
        setJsonText(content);
        setImportStatus(`Loaded ${file.name}`);
        setTimeout(() => setImportStatus(null), 3000);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleExecuteImport = () => {
    if (!parsedPreview || parsedPreview.filaments.length === 0) {
      alert('Please provide valid 3dfilamentprofiles JSON with at least one spool.');
      return;
    }

    let finalFilaments = parsedPreview.filaments;
    if (overrideAllCosts) {
      finalFilaments = finalFilaments.map(f => ({
        ...f,
        costPerKg: defaultCost,
      }));
    }

    onImportFilaments(finalFilaments, importMode);
    onClose();
  };

  const handleCopyExport = async () => {
    const success = await copy3DFilamentProfilesToClipboard(filaments);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const exportData = exportTo3DFilamentProfiles(filaments);
  const exportJsonString = JSON.stringify(exportData, null, 2);

  // Stats calculation
  const totalWeightGrams = filaments.reduce((acc, f) => acc + (f.remaining_grams || 1000), 0);
  const brandCounts = filaments.reduce((acc: Record<string, number>, f) => {
    acc[f.brand] = (acc[f.brand] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-xl border border-cyan-500/30">
              🧵
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold text-white tracking-tight">
                  3D Filament Profiles & SpoolDB Sync
                </h3>
                <span className="text-[11px] bg-cyan-950 border border-cyan-500/40 text-cyan-300 px-2 py-0.5 rounded-full font-mono">
                  3dfilamentprofiles.com
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Seamless import & export compatible with SpoolDB and 3DFilamentProfiles JSON schemas
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition"
          >
            ✕
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-800 bg-slate-900/50 px-6 pt-2">
          <button
            onClick={() => setActiveTab('import')}
            className={`py-3 px-4 font-semibold text-sm border-b-2 flex items-center gap-2 transition ${
              activeTab === 'import'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>📥 Import Profiles (JSON)</span>
            {parsedPreview && parsedPreview.filaments.length > 0 && (
              <span className="bg-cyan-500/20 text-cyan-300 text-[11px] px-2 py-0.2 rounded-full border border-cyan-500/30">
                {parsedPreview.filaments.length} ready
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('export')}
            className={`py-3 px-4 font-semibold text-sm border-b-2 flex items-center gap-2 transition ${
              activeTab === 'export'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>📤 Export to 3DFilamentProfiles</span>
            <span className="bg-slate-800 text-slate-400 text-[11px] px-2 py-0.2 rounded-full border border-slate-700">
              {filaments.length} saved
            </span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-200">
          {importStatus && (
            <div className="p-3 bg-cyan-950/80 border border-cyan-500/50 rounded-xl text-cyan-200 text-xs flex items-center justify-between">
              <span>✨ {importStatus}</span>
              <button onClick={() => setImportStatus(null)} className="text-cyan-400 font-bold ml-2">✕</button>
            </div>
          )}

          {activeTab === 'import' ? (
            <div className="space-y-5">
              {/* Actions Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-800/40 p-3.5 rounded-xl border border-slate-700/60">
                <div className="flex flex-wrap items-center gap-2">
                  <label className="cursor-pointer bg-slate-700 hover:bg-slate-600 text-white font-medium text-xs px-3 py-2 rounded-lg transition border border-slate-600 flex items-center gap-1.5 shadow-sm">
                    <span>📁 Upload .json File</span>
                    <input
                      type="file"
                      accept=".json,application/json"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={handleLoadUserSample}
                    className="bg-purple-900/40 hover:bg-purple-900/70 border border-purple-500/40 text-purple-200 text-xs font-semibold px-3 py-2 rounded-lg transition flex items-center gap-1.5 shadow-sm"
                    title="Load the 20 Bambu Lab, ProTech, SUNLU, ELEGOO and 3D Fillies spools from the file"
                  >
                    <span>⚡ Load Sample File (20 Spools)</span>
                  </button>
                </div>
                {jsonText && (
                  <button
                    type="button"
                    onClick={() => setJsonText('')}
                    className="text-xs text-slate-400 hover:text-rose-400 transition"
                  >
                    Clear text
                  </button>
                )}
              </div>

              {/* Text Area */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Paste 3DFilamentProfiles / SpoolDB JSON:
                </label>
                <textarea
                  value={jsonText}
                  onChange={(e) => setJsonText(e.target.value)}
                  placeholder={`[\n  {\n    "short_code": "QRA77jN43",\n    "brand": "Bambu Lab",\n    "material": "PETG",\n    "material_type": "Basic",\n    "color": "Green (30502)",\n    "rgb": "#009639",\n    "remaining_grams": 1000\n  }\n]`}
                  rows={6}
                  className="w-full bg-slate-950 font-mono text-xs text-slate-200 p-3 rounded-xl border border-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              {/* Import Settings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-800/40 p-4 rounded-xl border border-slate-700/60">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Import Mode
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer">
                      <input
                        type="radio"
                        name="importMode"
                        value="merge"
                        checked={importMode === 'merge'}
                        onChange={() => setImportMode('merge')}
                        className="text-cyan-500 focus:ring-cyan-500"
                      />
                      <span><strong>Merge / Add</strong> (Keep existing spools and add new ones)</span>
                    </label>
                    <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer">
                      <input
                        type="radio"
                        name="importMode"
                        value="replace"
                        checked={importMode === 'replace'}
                        onChange={() => setImportMode('replace')}
                        className="text-cyan-500 focus:ring-cyan-500"
                      />
                      <span><strong>Replace All</strong> (Overwrite your filament list with imported spools)</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Pricing Configuration
                  </label>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">Default Cost per Kg:</span>
                      <div className="relative w-28">
                        <span className="absolute left-2.5 top-1.5 text-xs text-slate-400">$</span>
                        <input
                          type="number"
                          value={defaultCost}
                          onChange={(e) => setDefaultCost(parseFloat(e.target.value) || 0)}
                          step="0.5"
                          min="0"
                          className="w-full bg-slate-900 border border-slate-700 rounded-md py-1 pl-6 pr-2 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                        />
                      </div>
                    </div>
                    <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={overrideAllCosts}
                        onChange={(e) => setOverrideAllCosts(e.target.checked)}
                        className="rounded border-slate-600 text-cyan-500 focus:ring-cyan-500"
                      />
                      <span>Apply this rate (${defaultCost}/kg) to all imported spools</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Parse Errors if any */}
              {parsedPreview && parsedPreview.errors.length > 0 && (
                <div className="p-3 bg-red-950/60 border border-red-500/40 rounded-xl text-red-200 text-xs">
                  <div className="font-semibold mb-1">Notice during parsing:</div>
                  <ul className="list-disc pl-4 space-y-0.5">
                    {parsedPreview.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Live Preview of parsed filaments */}
              {parsedPreview && parsedPreview.filaments.length > 0 && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">
                      Preview Spools ({parsedPreview.filaments.length} ready to import)
                    </span>
                    <span className="text-xs text-slate-400">
                      Total Spool Inventory: {(parsedPreview.filaments.reduce((s, f) => s + (f.remaining_grams || 1000), 0) / 1000).toFixed(1)} kg
                    </span>
                  </div>

                  <div className="max-h-60 overflow-y-auto space-y-2 border border-slate-800 rounded-xl p-2 bg-slate-950/60 pr-1.5">
                    {parsedPreview.filaments.map((f, idx) => {
                      const bgStyle = getFilamentBackgroundStyle(f.colorHex, f.rgb);
                      const isMulti = Boolean(f.rgb && f.rgb.includes(','));
                      const contrast = getContrastTheme(f.rgb || f.colorHex);
                      const isLight = contrast === 'dark-on-light';

                      return (
                        <div
                          key={f.id || idx}
                          style={bgStyle}
                          className={`p-2.5 rounded-lg border flex items-center justify-between text-xs transition shadow-sm ${
                            isLight
                              ? 'border-black/20 text-slate-900'
                              : 'border-white/20 text-white'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {/* Swatch circle */}
                            <span
                              style={bgStyle}
                              className={`w-5 h-5 rounded-full border shadow-inner flex-shrink-0 ${
                                isLight ? 'border-black/30' : 'border-white/40'
                              }`}
                            />
                            <div className="min-w-0 truncate">
                              <div className="font-bold flex items-center gap-1.5 truncate">
                                <span>{f.brand} - {f.type}</span>
                                {f.colorName && (
                                  <span className={`text-[10px] px-1.5 py-0.2 rounded border font-medium ${
                                    isLight ? 'bg-black/10 border-black/20' : 'bg-white/15 border-white/20'
                                  }`}>
                                    {f.colorName}
                                  </span>
                                )}
                                {isMulti && (
                                  <span className="text-[10px] bg-purple-900/80 text-purple-200 border border-purple-400/30 px-1 rounded">
                                    Multi-color
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-[11px] opacity-90 mt-0.5">
                                <span>${(overrideAllCosts ? defaultCost : f.costPerKg).toFixed(2)}/kg</span>
                                {f.remaining_grams !== undefined && <span>• {f.remaining_grams}g left</span>}
                                {f.td_value !== null && f.td_value !== undefined && (
                                  <span>• TD: {f.td_value}</span>
                                )}
                                {f.location && <span>• 📍 {f.location}</span>}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                            {f.short_code && (
                              <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded border ${
                                isLight ? 'bg-black/10 border-black/20' : 'bg-white/15 border-white/20'
                              }`}>
                                {f.short_code}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Export Tab */
            <div className="space-y-5">
              {/* Export Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700">
                  <span className="text-slate-400 text-xs block">Total Spools</span>
                  <span className="text-2xl font-bold text-cyan-400">{filaments.length}</span>
                </div>
                <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700">
                  <span className="text-slate-400 text-xs block">Estimated Inventory</span>
                  <span className="text-2xl font-bold text-emerald-400">
                    {(totalWeightGrams / 1000).toFixed(2)} kg
                  </span>
                </div>
                <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700">
                  <span className="text-slate-400 text-xs block">Brands Represented</span>
                  <span className="text-2xl font-bold text-purple-400">
                    {Object.keys(brandCounts).length}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => download3DFilamentProfilesJson(filaments)}
                  className="bg-cyan-600 hover:bg-cyan-500 text-white font-semibold py-2.5 px-4 rounded-xl transition shadow flex items-center gap-2 text-sm"
                >
                  <span>💾 Download 3DFilamentProfiles.json</span>
                </button>
                <button
                  type="button"
                  onClick={handleCopyExport}
                  className={`font-semibold py-2.5 px-4 rounded-xl transition shadow flex items-center gap-2 text-sm ${
                    copied
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                  }`}
                >
                  <span>{copied ? '✓ Copied to Clipboard!' : '📋 Copy JSON to Clipboard'}</span>
                </button>
              </div>

              {/* Export Code Viewer */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Export Schema Output ({exportData.length} Spools)
                  </span>
                  <span className="text-xs text-slate-400">
                    Standard format compatible with https://3dfilamentprofiles.com/
                  </span>
                </div>
                <textarea
                  readOnly
                  value={exportJsonString}
                  rows={10}
                  className="w-full bg-slate-950 font-mono text-xs text-emerald-300 p-3 rounded-xl border border-slate-700 focus:outline-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex justify-between items-center">
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-slate-800 transition"
          >
            Cancel
          </button>

          {activeTab === 'import' ? (
            <button
              type="button"
              disabled={!parsedPreview || parsedPreview.filaments.length === 0}
              onClick={handleExecuteImport}
              className={`font-bold text-sm py-2.5 px-5 rounded-xl transition shadow-lg flex items-center gap-2 ${
                parsedPreview && parsedPreview.filaments.length > 0
                  ? 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-900/30 cursor-pointer'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              <span>
                {importMode === 'replace' ? 'Replace with' : 'Import'} {parsedPreview ? parsedPreview.filaments.length : 0} Spools
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => download3DFilamentProfilesJson(filaments)}
              className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-sm py-2.5 px-5 rounded-xl transition shadow"
            >
              Download Export File
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
