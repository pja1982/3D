import React, { useState, useMemo, useRef } from 'react';
import type { Part, Filament, Printer } from '../types';
import {
  generateSquareCatalogCsv,
  parseSquareTemplateCsv,
  downloadSquareCsvFile,
  STANDARD_SQUARE_HEADERS,
} from '../utils/squareCatalogExport';

interface SquareExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  parts: Part[];
  filaments: Filament[];
  printers: Printer[];
}

export const SquareExportModal: React.FC<SquareExportModalProps> = ({
  isOpen,
  onClose,
  parts,
  filaments,
  printers,
}) => {
  const [filterMode, setFilterMode] = useState<'all' | 'pod_only' | 'standard_only'>('all');
  const [categoryOverride, setCategoryOverride] = useState('');
  const [includeCost, setIncludeCost] = useState(true);
  const [templateFile, setTemplateFile] = useState<{
    name: string;
    headers: string[];
    locationCount: number;
    taxCount: number;
  } | null>(null);
  const [copiedStatus, setCopiedStatus] = useState(false);

  const templateInputRef = useRef<HTMLInputElement>(null);

  const podPartsCount = useMemo(() => {
    return parts.filter(p => p.isPrintOnDemand).length;
  }, [parts]);

  const standardPartsCount = useMemo(() => {
    return parts.filter(p => !p.isPrintOnDemand).length;
  }, [parts]);

  const activeParts = useMemo(() => {
    if (filterMode === 'pod_only') return parts.filter(p => p.isPrintOnDemand);
    if (filterMode === 'standard_only') return parts.filter(p => !p.isPrintOnDemand);
    return parts;
  }, [parts, filterMode]);

  if (!isOpen) return null;

  const handleTemplateUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = parseSquareTemplateCsv(text);
        setTemplateFile({
          name: file.name,
          headers: parsed.headers,
          locationCount: parsed.locationColumns.length,
          taxCount: parsed.taxColumns.length,
        });
      } catch (err) {
        console.error('Failed to parse Square template CSV:', err);
      }
    };
    reader.readAsText(file);
  };

  const handleClearTemplate = () => {
    setTemplateFile(null);
    if (templateInputRef.current) templateInputRef.current.value = '';
  };

  const handleDownload = () => {
    const csv = generateSquareCatalogCsv(parts, filaments, printers, {
      filterMode,
      categoryOverride: categoryOverride.trim() || undefined,
      includeCost,
      customTemplateHeaders: templateFile ? templateFile.headers : undefined,
    });

    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `Square_Catalog_Parts_${filterMode === 'pod_only' ? 'POD_' : ''}${dateStr}.csv`;
    downloadSquareCsvFile(filename, csv);

    setCopiedStatus(true);
    setTimeout(() => setCopiedStatus(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 text-slate-200 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 flex items-center justify-center text-xl font-bold">
              💳
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                Export Parts to Square POS Catalog
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Bulk export your 3D parts into a CSV formatted for direct import into Square Item Library.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            ✕
          </button>
        </div>

        {/* Part Selection Filter */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
            1. Select Parts to Export
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              className={`p-3 rounded-xl border text-left transition flex items-center justify-between ${
                filterMode === 'all'
                  ? 'bg-cyan-950/60 border-cyan-500 text-cyan-200 ring-1 ring-cyan-500/40'
                  : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:border-slate-600'
              }`}
            >
              <div>
                <div className="font-bold text-xs">All Parts</div>
                <div className="text-[11px] text-slate-400">Entire parts catalog</div>
              </div>
              <span className="text-xs font-mono bg-slate-900 px-2 py-0.5 rounded border border-slate-700">
                {parts.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setFilterMode('pod_only')}
              className={`p-3 rounded-xl border text-left transition flex items-center justify-between ${
                filterMode === 'pod_only'
                  ? 'bg-cyan-950/60 border-cyan-500 text-cyan-200 ring-1 ring-cyan-500/40'
                  : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:border-slate-600'
              }`}
            >
              <div>
                <div className="font-bold text-xs flex items-center gap-1">
                  <span>🖨️ POD Only</span>
                </div>
                <div className="text-[11px] text-slate-400">Print on Demand parts</div>
              </div>
              <span className="text-xs font-mono bg-slate-900 px-2 py-0.5 rounded border border-slate-700">
                {podPartsCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setFilterMode('standard_only')}
              className={`p-3 rounded-xl border text-left transition flex items-center justify-between ${
                filterMode === 'standard_only'
                  ? 'bg-cyan-950/60 border-cyan-500 text-cyan-200 ring-1 ring-cyan-500/40'
                  : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:border-slate-600'
              }`}
            >
              <div>
                <div className="font-bold text-xs">Standard Catalog</div>
                <div className="text-[11px] text-slate-400">In-house inventory models</div>
              </div>
              <span className="text-xs font-mono bg-slate-900 px-2 py-0.5 rounded border border-slate-700">
                {standardPartsCount}
              </span>
            </button>
          </div>
        </div>

        {/* Square Template Matcher (Optional CSV upload) */}
        <div className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
                <span>📑 Custom Square CSV Template (Optional)</span>
              </span>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Upload a sample CSV exported from your Square dashboard to auto-map your exact location names and taxes.
              </p>
            </div>
            {templateFile ? (
              <button
                type="button"
                onClick={handleClearTemplate}
                className="text-xs text-rose-400 hover:text-rose-300 underline"
              >
                Remove Template
              </button>
            ) : (
              <button
                type="button"
                onClick={() => templateInputRef.current?.click()}
                className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 px-2.5 py-1 rounded border border-slate-600 transition"
              >
                Upload Square CSV
              </button>
            )}
            <input
              type="file"
              ref={templateInputRef}
              accept=".csv"
              onChange={handleTemplateUpload}
              className="hidden"
            />
          </div>

          {templateFile ? (
            <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-lg p-3 text-xs text-emerald-300 flex items-center justify-between">
              <div>
                <span className="font-semibold">✓ Matching Custom Square Format: </span>
                <span className="font-mono text-[11px]">{templateFile.name}</span>
                <div className="text-[10px] text-emerald-400/80 mt-0.5">
                  Detected {templateFile.headers.length} columns (including {templateFile.locationCount} locations and {templateFile.taxCount} tax rules)
                </div>
              </div>
            </div>
          ) : (
            <div className="text-[11px] text-slate-400 bg-slate-900/50 p-2.5 rounded border border-slate-800">
              💡 <strong>Default Square Standard Format:</strong> Using official Square Item Library headers (<code className="text-cyan-300">Reference Handle, Item Name, Variation, SKU, Description, Category, Price, Cost</code>). Works with any Square store import.
            </div>
          )}
        </div>

        {/* Options */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Square Category Override (optional)
            </label>
            <input
              type="text"
              value={categoryOverride}
              onChange={(e) => setCategoryOverride(e.target.value)}
              placeholder="e.g. 3D Print Services or Print on Demand"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg py-1.5 px-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />
            <span className="text-[10px] text-slate-400 mt-0.5 block">
              Leave blank to use part categories (POD items default to &quot;Print on Demand&quot;)
            </span>
          </div>

          <div className="flex flex-col justify-center">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300 font-medium">
              <input
                type="checkbox"
                checked={includeCost}
                onChange={(e) => setIncludeCost(e.target.checked)}
                className="rounded border-slate-600 text-cyan-600 focus:ring-cyan-500"
              />
              <span>Include Estimated Production Cost in Square &quot;Cost&quot; column</span>
            </label>
            <span className="text-[10px] text-slate-400 mt-1 pl-5 block">
              Helps you track profit margins and COGS directly inside Square Analytics
            </span>
          </div>
        </div>

        {/* Preview Summary */}
        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold text-slate-300 uppercase tracking-wider text-[10px]">
              Catalog Export Preview ({activeParts.length} {activeParts.length === 1 ? 'part' : 'parts'})
            </span>
            <span className="text-[10px] font-mono text-cyan-400">
              {templateFile ? 'Custom Template' : 'Square Standard v2'}
            </span>
          </div>

          <div className="max-h-36 overflow-y-auto divide-y divide-slate-800 text-xs">
            {activeParts.slice(0, 4).map(part => (
              <div key={part.id} className="py-2 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold text-slate-200 truncate flex items-center gap-1.5">
                    <span>{part.name}</span>
                    {part.isPrintOnDemand && (
                      <span className="text-[9px] bg-cyan-950 text-cyan-300 border border-cyan-500/50 px-1.5 py-0.2 rounded font-bold">
                        POD
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-500 truncate">
                    SKU: {part.sku || `3DP-${part.id.substring(0, 6)}`} • Cat: {part.category || (part.isPrintOnDemand ? 'Print on Demand' : '3D Printed Parts')}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-mono font-bold text-cyan-400">
                    ${(part.customUnitPrice || 15.00).toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
            {activeParts.length > 4 && (
              <div className="py-1 text-center text-[10px] text-slate-500 italic">
                + {activeParts.length - 4} more parts will be included in the CSV
              </div>
            )}
          </div>
        </div>

        {/* Square Import Steps */}
        <div className="bg-cyan-950/20 border border-cyan-800/40 rounded-xl p-3 text-xs space-y-1.5">
          <span className="font-semibold text-cyan-300 flex items-center gap-1.5">
            <span>ℹ️</span> How to import into Square:
          </span>
          <ol className="list-decimal list-inside text-slate-300 text-[11px] space-y-0.5">
            <li>Download the CSV below.</li>
            <li>In your Square Dashboard, go to <strong>Items → Item Library</strong>.</li>
            <li>Click <strong>Actions → Import Items</strong> in the upper right.</li>
            <li>Upload this file and click <strong>Confirm</strong> to add all items to your Square POS.</li>
          </ol>
        </div>

        {/* Actions */}
        <div className="border-t border-slate-800 pt-3 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-slate-400 hover:text-white px-3 py-2 rounded-lg hover:bg-slate-800 transition"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleDownload}
            disabled={activeParts.length === 0}
            className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold px-5 py-2.5 rounded-xl transition text-xs flex items-center gap-2 shadow-lg"
          >
            <span>📥</span>
            <span>{copiedStatus ? '✓ Downloaded!' : `Download Square CSV (${activeParts.length} parts)`}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
