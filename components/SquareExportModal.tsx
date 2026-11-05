import React, { useState, useMemo, useRef } from 'react';
import type { Part, Filament, Printer } from '../types';
import {
  generateSquareCatalogCsv,
  parseSquareTemplateCsv,
  downloadSquareCsvFile,
  findMatchingSquareItem,
  type SquareExistingItem,
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
  const [prefixPodItems, setPrefixPodItems] = useState(true);
  const [skuMode, setSkuMode] = useState<'blank_if_unset' | 'unique_sequential'>('blank_if_unset');
  const [taxRateValue, setTaxRateValue] = useState<'N' | 'Y'>('N');
  
  const [templateFile, setTemplateFile] = useState<{
    name: string;
    headers: string[];
    locationCount: number;
    taxCount: number;
    existingItems: SquareExistingItem[];
    defaultTaxValue: string;
  } | null>(null);

  const [downloadSuccess, setDownloadSuccess] = useState(false);
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

  // Count how many parts in current filter match existing items from Square template
  const matchStats = useMemo(() => {
    if (!templateFile || templateFile.existingItems.length === 0) {
      return { matched: 0, newItems: activeParts.length };
    }
    let matched = 0;
    activeParts.forEach(p => {
      if (findMatchingSquareItem(p, templateFile.existingItems)) {
        matched++;
      }
    });
    return {
      matched,
      newItems: activeParts.length - matched,
    };
  }, [activeParts, templateFile]);

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
          existingItems: parsed.existingItems,
          defaultTaxValue: parsed.defaultTaxValue,
        });
        if (parsed.defaultTaxValue === 'Y' || parsed.defaultTaxValue === 'N') {
          setTaxRateValue(parsed.defaultTaxValue as 'N' | 'Y');
        }
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
      existingItems: templateFile?.existingItems,
      prefixPodItems,
      defaultVariationName: 'Regular',
      skuMode,
      taxRateValue,
    });

    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `Square_Catalog_Parts_${filterMode === 'pod_only' ? 'POD_' : ''}${dateStr}.csv`;
    downloadSquareCsvFile(filename, csv);

    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 3500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full max-h-[92vh] overflow-y-auto shadow-2xl p-6 text-slate-200 space-y-5">
        
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 flex items-center justify-center text-xl font-bold">
              💳
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                Export Parts to Square POS Catalog
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Bulk export or sync parts directly with your Square Item Library.
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

        {/* 1. Part Filter */}
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
                <div className="text-[11px] text-slate-400">Print on Demand only</div>
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
                <div className="text-[11px] text-slate-400">In-house models only</div>
              </div>
              <span className="text-xs font-mono bg-slate-900 px-2 py-0.5 rounded border border-slate-700">
                {standardPartsCount}
              </span>
            </button>
          </div>
        </div>

        {/* 2. Square CSV Template Matcher & Token Sync */}
        <div className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
                <span>📑 Square Catalogue Template &amp; Item Sync</span>
              </span>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Upload your export from Square (<strong>Items → Actions → Export</strong>) to match store locations, tax columns, and update existing items with tokens.
              </p>
            </div>
            {templateFile ? (
              <button
                type="button"
                onClick={handleClearTemplate}
                className="text-xs text-rose-400 hover:text-rose-300 underline shrink-0"
              >
                Clear Template
              </button>
            ) : (
              <button
                type="button"
                onClick={() => templateInputRef.current?.click()}
                className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-1.5 rounded-lg border border-slate-600 transition shrink-0 font-medium"
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
            <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-lg p-3 text-xs text-emerald-300 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold">✓ Matching Your Square Store:</span>
                <span className="font-mono text-[11px] bg-emerald-900/40 px-2 py-0.5 rounded">
                  {templateFile.name}
                </span>
              </div>
              <div className="text-[11px] text-emerald-200/90 flex flex-wrap gap-x-3 gap-y-1">
                <span>• Columns: <strong>{templateFile.headers.length}</strong></span>
                <span>• Square items found: <strong>{templateFile.existingItems.length}</strong></span>
                <span>• Matched to update: <strong className="text-white">{matchStats.matched}</strong></span>
                <span>• New to create: <strong className="text-white">{matchStats.newItems}</strong></span>
              </div>
              {matchStats.matched > 0 && (
                <div className="text-[10px] text-emerald-400/80 pt-0.5">
                  ⚡ Items matched to your Square catalog will preserve their Square Token so Square <strong>updates</strong> them instead of creating duplicates.
                </div>
              )}
            </div>
          ) : (
            <div className="text-[11px] text-slate-400 bg-slate-900/50 p-2.5 rounded border border-slate-800 flex items-start gap-2">
              <span className="text-amber-400 text-sm">💡</span>
              <div>
                <strong>Using Square Standard Format:</strong> Standard Square Item Library columns (<code className="text-cyan-300">Token, Item Name, Variation, SKU, Description, Categories, Price, Cost, Tax</code>). Upload your Square export anytime to preserve custom store names.
              </div>
            </div>
          )}
        </div>

        {/* 3. SKU Conflict Resolution (The Fix for 'SKU already in use') */}
        <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-3.5 space-y-2">
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
            2. SKU Handling (Square Tracking)
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <label className={`p-2.5 rounded-lg border cursor-pointer transition flex items-start gap-2.5 ${
              skuMode === 'blank_if_unset'
                ? 'bg-cyan-950/50 border-cyan-500 text-cyan-200'
                : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-600'
            }`}>
              <input
                type="radio"
                name="skuMode"
                checked={skuMode === 'blank_if_unset'}
                onChange={() => setSkuMode('blank_if_unset')}
                className="mt-0.5 text-cyan-600 focus:ring-cyan-500"
              />
              <div className="text-xs">
                <div className="font-semibold text-slate-100 flex items-center gap-1.5">
                  <span>Leave unset SKUs blank</span>
                  <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-700/60 px-1 rounded">Recommended</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                  Square allows blank SKUs. Prevents &quot;SKU already in use&quot; warnings when items don&apos;t have custom barcodes.
                </div>
              </div>
            </label>

            <label className={`p-2.5 rounded-lg border cursor-pointer transition flex items-start gap-2.5 ${
              skuMode === 'unique_sequential'
                ? 'bg-cyan-950/50 border-cyan-500 text-cyan-200'
                : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-600'
            }`}>
              <input
                type="radio"
                name="skuMode"
                checked={skuMode === 'unique_sequential'}
                onChange={() => setSkuMode('unique_sequential')}
                className="mt-0.5 text-cyan-600 focus:ring-cyan-500"
              />
              <div className="text-xs">
                <div className="font-semibold text-slate-100">
                  Generate unique sequential SKUs
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                  Auto-generates clean, conflict-free unique IDs (<code className="text-cyan-300">POD-001</code>, <code className="text-cyan-300">3DP-001</code>).
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* 4. Additional Options */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Square Category (default: &quot;POD&quot; / &quot;3D Prints&quot;)
              </label>
              <input
                type="text"
                value={categoryOverride}
                onChange={(e) => setCategoryOverride(e.target.value)}
                placeholder="e.g. POD or 3D Printing"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg py-1.5 px-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300 select-none">
              <input
                type="checkbox"
                checked={prefixPodItems}
                onChange={(e) => setPrefixPodItems(e.target.checked)}
                className="rounded border-slate-600 text-cyan-600 focus:ring-cyan-500"
              />
              <span>Prefix POD items with &quot;POD - &quot; (e.g. <code className="text-cyan-300">POD - Kitchen Tool</code>)</span>
            </label>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Tax - GST (10%) Setting
              </label>
              <select
                value={taxRateValue}
                onChange={(e) => setTaxRateValue(e.target.value as 'N' | 'Y')}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg py-1.5 px-3 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              >
                <option value="N">N — Tax Exempt / Not Applied (Matches your Square export)</option>
                <option value="Y">Y — Tax Applied (GST 10%)</option>
              </select>
            </div>

            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300 select-none">
              <input
                type="checkbox"
                checked={includeCost}
                onChange={(e) => setIncludeCost(e.target.checked)}
                className="rounded border-slate-600 text-cyan-600 focus:ring-cyan-500"
              />
              <span>Include Estimated Production Cost in &quot;Cost&quot; column</span>
            </label>
          </div>
        </div>

        {/* 5. Live Table Preview */}
        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold text-slate-300 uppercase tracking-wider text-[10px]">
              Export Preview ({activeParts.length} {activeParts.length === 1 ? 'part' : 'parts'})
            </span>
            <span className="text-[10px] font-mono text-cyan-400">
              {templateFile ? 'Matched Template' : 'Square Standard'}
            </span>
          </div>

          <div className="max-h-36 overflow-y-auto divide-y divide-slate-800 text-xs">
            {activeParts.slice(0, 5).map((part, idx) => {
              const matched = findMatchingSquareItem(part, templateFile?.existingItems);
              const displayName = matched?.itemName || (part.isPrintOnDemand && prefixPodItems && !part.name.startsWith('POD') ? `POD - ${part.name}` : part.name);
              const previewSku = skuMode === 'blank_if_unset' 
                ? (part.sku || matched?.sku || '(blank)')
                : (part.sku || matched?.sku || (part.isPrintOnDemand ? `POD-${String(idx + 1).padStart(3, '0')}` : `3DP-${String(idx + 1).padStart(3, '0')}`));
              
              return (
                <div key={part.id || idx} className="py-2 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-slate-200 truncate flex items-center gap-1.5">
                      <span>{displayName}</span>
                      {matched && (
                        <span className="text-[9px] bg-purple-950 text-purple-300 border border-purple-700/60 px-1 rounded font-mono" title={`Existing Token: ${matched.token}`}>
                          Token: {matched.token.substring(0, 8)}...
                        </span>
                      )}
                      {part.isPrintOnDemand && (
                        <span className="text-[9px] bg-emerald-950 text-emerald-300 border border-emerald-600/60 px-1 py-0.2 rounded font-bold">
                          POD
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate flex items-center gap-2 mt-0.5">
                      <span className="font-mono">SKU: {previewSku}</span>
                      <span>•</span>
                      <span>Var: {matched?.variationName || 'Regular'}</span>
                      <span>•</span>
                      <span>Cat: {categoryOverride || part.category || (part.isPrintOnDemand ? 'POD' : '3D Prints')}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    {typeof part.customUnitPrice === 'number' && part.customUnitPrice >= 0 ? (
                      <div>
                        <span className="font-mono font-bold text-amber-300">
                          ${part.customUnitPrice.toFixed(2)}
                        </span>
                        <span className="text-[9px] text-amber-400 block font-sans">Custom Price</span>
                      </div>
                    ) : (
                      <div>
                        <span className="font-mono font-bold text-cyan-400">
                          ${(matched?.price ? parseFloat(matched.price) : 15.00).toFixed(2)}
                        </span>
                        <span className="text-[9px] text-slate-500 block font-sans">{matched?.price ? 'From Square' : 'Auto Price'}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {activeParts.length > 5 && (
              <div className="py-1 text-center text-[10px] text-slate-500 italic">
                + {activeParts.length - 5} more parts will be exported cleanly with zero SKU conflicts
              </div>
            )}
          </div>
        </div>

        {/* Modal Actions */}
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
            className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold px-5 py-2.5 rounded-xl transition text-xs flex items-center gap-2 shadow-lg cursor-pointer"
          >
            <span>📥</span>
            <span>{downloadSuccess ? '✓ Downloaded Conflict-Free CSV!' : `Download Square CSV (${activeParts.length} parts)`}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
