import React, { useState, useEffect, useMemo } from 'react';
import type { CostBreakdown, PrintParameters, Quote, QuotePartConfig, Printer, Filament, MultiColorBatchMode, GeneralSettings, OneOffFee } from '../types';
import { QuoteStatus } from '../types';
import SaveIcon from './icons/SaveIcon';
import PrinterIcon from './icons/PrinterIcon';
import SaveQuoteModal from './SaveQuoteModal';
import PrintDocumentModal, { DEFAULT_FEE_PRESETS } from './PrintDocumentModal';
import { calculateJobPartRows } from '../utils/partCostCalculator';
import { getFilamentBackgroundStyle } from '../utils/filamentProfilesSync';

interface CostBreakdownDisplayProps {
  costBreakdown: CostBreakdown;
  quotePrice: number;
  onSaveQuote: (
    jobName: string,
    customerName: string,
    jobNumber: number,
    finalQuotePrice: number,
    params: PrintParameters,
    breakdown: CostBreakdown,
    isCreateNew?: boolean
  ) => void;
  nextJobNumber: number;
  parameters: PrintParameters;
  revisingQuote?: Quote | null;
  onCancelRevision?: () => void;
  quoteParts?: QuotePartConfig[];
  printers?: Printer[];
  filaments?: Filament[];
  onUpdatePartUnitPrice?: (partId: string, unitPrice: number | null) => void;
  onResetAllPartUnitPrices?: () => void;
  multiColorBatchMode?: MultiColorBatchMode;
  onUpdateMultiColorBatchMode?: (mode: MultiColorBatchMode) => void;
  multiColorBedCount?: number;
  onUpdateMultiColorBedCount?: (count: number) => void;
  generalSettings?: GeneralSettings;
  onUpdateGeneralSettings?: (settings: Partial<GeneralSettings>) => void;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
};

const formatHours = (hours: number) => {
  const h = Math.floor(hours || 0);
  const m = Math.round(((hours || 0) - h) * 60);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
};

const CostBreakdownDisplay: React.FC<CostBreakdownDisplayProps> = ({ 
  costBreakdown, 
  quotePrice, 
  onSaveQuote, 
  nextJobNumber, 
  parameters,
  revisingQuote,
  onCancelRevision,
  quoteParts,
  printers = [],
  filaments = [],
  onUpdatePartUnitPrice,
  onResetAllPartUnitPrices,
  multiColorBatchMode,
  onUpdateMultiColorBatchMode,
  multiColorBedCount,
  onUpdateMultiColorBedCount,
  generalSettings,
  onUpdateGeneralSettings,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printDocType, setPrintDocType] = useState<'quote' | 'checklist'>('quote');
  const [editableQuotePrice, setEditableQuotePrice] = useState(quotePrice);
  const [expandedPartDetailsId, setExpandedPartDetailsId] = useState<string | null>(null);
  const [partsViewMode, setPartsViewMode] = useState<'cards' | 'table'>('cards');

  const totalPrintHours = quoteParts 
    ? quoteParts.reduce((sum, p) => sum + (p.printHours * p.quantity), 0)
    : parameters.printHours;

  // One-Off Fees State (Licensing, CAD Prep, Rush, Setup, Shipping)
  const [oneOffFees, setOneOffFees] = useState<OneOffFee[]>(() => {
    return revisingQuote?.oneOffFees || revisingQuote?.costBreakdown?.oneOffFees || [];
  });

  useEffect(() => {
    if (revisingQuote) {
      setOneOffFees(revisingQuote.oneOffFees || revisingQuote.costBreakdown?.oneOffFees || []);
    }
  }, [revisingQuote]);

  const oneOffFeesTotal = useMemo(() => {
    return oneOffFees.reduce((sum, f) => sum + (Number(f.amount) || 0), 0);
  }, [oneOffFees]);

  // Construct a live quote object to compute each part's exact proportional price and cost
  const liveQuote: Quote = useMemo(() => ({
    id: revisingQuote?.id || 'live-quote',
    jobNumber: revisingQuote?.jobNumber || nextJobNumber,
    jobName: revisingQuote?.jobName || 'Current Quote',
    customerName: revisingQuote?.customerName || '',
    createdAt: new Date().toISOString(),
    quotePrice: editableQuotePrice,
    status: revisingQuote?.status || QuoteStatus.Pending,
    parameters,
    costBreakdown: {
      ...costBreakdown,
      oneOffFees,
      oneOffFeesTotal,
    },
    parts: quoteParts,
    oneOffFees,
  }), [revisingQuote, nextJobNumber, editableQuotePrice, parameters, costBreakdown, quoteParts, oneOffFees, oneOffFeesTotal]);

  const partsSummary = useMemo(() => {
    return calculateJobPartRows(liveQuote, filaments, printers);
  }, [liveQuote, filaments, printers]);

  // Keep overall quote price synced when parts change or quotePrice prop changes
  const customPartsCount = useMemo(() => {
    return (quoteParts || []).filter(p => typeof p.customUnitPrice === 'number' && p.customUnitPrice >= 0).length;
  }, [quoteParts]);

  useEffect(() => {
    if (customPartsCount > 0) {
      setEditableQuotePrice(parseFloat((partsSummary.grandTotalPrice + oneOffFeesTotal).toFixed(2)));
    } else {
      setEditableQuotePrice(parseFloat((quotePrice + oneOffFeesTotal).toFixed(2)));
    }
  }, [quotePrice, partsSummary.grandTotalPrice, customPartsCount, oneOffFeesTotal]);

  const costWithFailure = costBreakdown.costWithFailureRate;
  const currentProfit = editableQuotePrice - costWithFailure;
  const currentProfitMargin = costWithFailure > 0 
    ? ((currentProfit / costWithFailure) * 100) 
    : 0;

  const handleSave = (jobName: string, customerName: string, jobNumber: number, isCreateNew?: boolean) => {
    const updatedBreakdown: CostBreakdown = {
      ...costBreakdown,
      profit: parseFloat(currentProfit.toFixed(2)),
      oneOffFees,
      oneOffFeesTotal,
    };
    const updatedParameters: PrintParameters = {
      ...parameters,
      profitMargin: parseFloat(currentProfitMargin.toFixed(1)),
    };
    onSaveQuote(jobName, customerName, jobNumber, editableQuotePrice, updatedParameters, updatedBreakdown, isCreateNew);
    setIsModalOpen(false);
  };

  const handleAddPresetFee = (preset: typeof DEFAULT_FEE_PRESETS[0]) => {
    const newFee: OneOffFee = {
      id: `fee-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      description: preset.description,
      amount: preset.amount,
      category: preset.category,
    };
    setOneOffFees(prev => [...prev, newFee]);
    setEditableQuotePrice(prev => parseFloat((prev + preset.amount).toFixed(2)));
  };

  const handleAddCustomFee = () => {
    const amount = 15.00;
    const newFee: OneOffFee = {
      id: `fee-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      description: 'Custom Service / Fee',
      amount,
      category: 'other',
    };
    setOneOffFees(prev => [...prev, newFee]);
    setEditableQuotePrice(prev => parseFloat((prev + amount).toFixed(2)));
  };

  const handleRemoveFee = (id: string) => {
    const target = oneOffFees.find(f => f.id === id);
    if (target) {
      setEditableQuotePrice(prev => Math.max(0, parseFloat((prev - target.amount).toFixed(2))));
    }
    setOneOffFees(prev => prev.filter(f => f.id !== id));
  };

  const handleUpdateFee = (id: string, updates: Partial<OneOffFee>) => {
    setOneOffFees(prev => prev.map(f => {
      if (f.id === id) {
        if (updates.amount !== undefined && updates.amount !== f.amount) {
          const diff = updates.amount - f.amount;
          setEditableQuotePrice(p => Math.max(0, parseFloat((p + diff).toFixed(2))));
        }
        return { ...f, ...updates };
      }
      return f;
    }));
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditableQuotePrice(parseFloat(e.target.value) || 0);
  };

  const handleUnitCostChange = (partId: string, valueStr: string) => {
    if (!onUpdatePartUnitPrice) return;
    if (valueStr.trim() === '') {
      onUpdatePartUnitPrice(partId, null);
    } else {
      const val = parseFloat(valueStr);
      onUpdatePartUnitPrice(partId, isNaN(val) ? null : Math.max(0, val));
    }
  };

  return (
    <div className="space-y-6">
      {/* Revision Notice Banner */}
      {revisingQuote && (
        <div className="p-3.5 bg-amber-500/15 border border-amber-500/40 rounded-xl flex items-center justify-between text-amber-200">
          <div className="flex items-center gap-2 text-sm min-w-0 pr-2">
            <span className="bg-amber-500/30 text-amber-300 font-bold px-2 py-0.5 rounded text-xs">
              REVISION MODE
            </span>
            <span className="font-semibold text-slate-100 truncate">
              Job #{revisingQuote.jobNumber}: {revisingQuote.jobName}
            </span>
            <span className="text-amber-400/80 text-xs hidden sm:inline">
              ({revisingQuote.customerName})
            </span>
          </div>
          {onCancelRevision && (
            <button
              onClick={onCancelRevision}
              className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-2.5 py-1 rounded-md border border-slate-600 transition shrink-0"
            >
              Cancel Revision
            </button>
          )}
        </div>
      )}

      {/* Main Header */}
      <div className="flex items-center justify-between border-b border-slate-700 pb-3">
        <div>
          <h2 className="text-2xl font-semibold text-cyan-400">Quote Breakdown</h2>
          <span className="text-xs text-slate-400">
            {partsSummary.rows.length} {partsSummary.rows.length === 1 ? 'part' : 'parts'} • {partsSummary.totalQuantity} total units
          </span>
        </div>
        <div className="flex items-center gap-1.5 bg-slate-900/80 p-1 rounded-lg border border-slate-700/80">
          <button
            type="button"
            onClick={() => setPartsViewMode('cards')}
            className={`text-xs px-2.5 py-1 rounded font-medium transition ${
              partsViewMode === 'cards'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Card View of Each Part Price"
          >
            Part Cards
          </button>
          <button
            type="button"
            onClick={() => setPartsViewMode('table')}
            className={`text-xs px-2.5 py-1 rounded font-medium transition ${
              partsViewMode === 'table'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Table View of Each Part Price"
          >
            Part Table
          </button>
        </div>
      </div>

      {/* FEATURED: Each Part Added with Its Exact Quoted Price & Unit Price Adjustment */}
      <div className="bg-slate-900/70 p-4 rounded-xl border border-slate-700/80 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-2.5 gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-lg">🏷️</span>
            <h3 className="font-bold text-white text-base">Each Part & Price</h3>
            {customPartsCount > 0 ? (
              <span className="text-xs bg-amber-950/80 text-amber-300 border border-amber-600/50 px-2 py-0.5 rounded-full font-semibold">
                {customPartsCount} with custom unit price
              </span>
            ) : (
              <span className="text-xs bg-cyan-950 text-cyan-300 border border-cyan-700/50 px-2 py-0.5 rounded-full font-semibold">
                Auto Markup Applied
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {customPartsCount > 0 && onResetAllPartUnitPrices && (
              <button
                type="button"
                onClick={onResetAllPartUnitPrices}
                className="text-xs text-amber-300 hover:text-amber-100 bg-amber-950/40 hover:bg-amber-900/50 border border-amber-700/50 px-2.5 py-1 rounded-lg transition"
                title="Reset all parts back to automatic markup formula"
              >
                ↺ Reset All to Auto Price
              </button>
            )}
            <span className="text-xs text-slate-400 hidden sm:inline">
              Adjust any unit price below
            </span>
          </div>
        </div>

        {partsViewMode === 'cards' ? (
          /* Cards View */
          <div className="space-y-3">
            {partsSummary.rows.map((row, idx) => {
              const part = row.part;
              const assignedFilament = filaments.find(f => f.id === part.filamentId);
              const assignedPrinter = printers.find(p => p.id === part.printerId);
              const partProfit = row.lineTotalPrice - row.lineTotalCost;
              const partProfitMargin = row.lineTotalCost > 0 ? (partProfit / row.lineTotalCost) * 100 : 0;
              const isExpanded = expandedPartDetailsId === (part.id || `part-${idx}`);
              const quoteShare = editableQuotePrice > 0 ? ((row.lineTotalPrice / editableQuotePrice) * 100).toFixed(0) : 0;
              const hasCustomPrice = typeof part.customUnitPrice === 'number' && part.customUnitPrice >= 0;
              const isBelowCost = row.perUnitPrice < row.perUnitCost;

              return (
                <div
                  key={part.id || idx}
                  className={`rounded-xl border p-3.5 transition shadow-sm space-y-2.5 ${
                    hasCustomPrice
                      ? 'bg-slate-800/90 border-amber-500/40 ring-1 ring-amber-500/20'
                      : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700/80'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    {/* Part info */}
                    <div className="flex items-start gap-3 min-w-0">
                      {part.imageUrl ? (
                        <img
                          src={part.imageUrl}
                          alt={part.name}
                          className="w-12 h-12 rounded-lg object-cover border border-slate-600 flex-shrink-0 shadow-sm"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center flex-shrink-0 text-cyan-400 font-bold text-sm">
                          #{idx + 1}
                        </div>
                      )}

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-slate-100 text-sm truncate">{part.name}</h4>
                          <span className="bg-slate-900 text-cyan-300 border border-cyan-800/60 font-mono text-xs font-bold px-2 py-0.5 rounded">
                            {row.qty} {row.qty === 1 ? 'unit' : 'units'}
                          </span>
                          <span className="text-[11px] text-slate-400 bg-slate-900/60 px-1.5 py-0.5 rounded border border-slate-800">
                            {quoteShare}% of job
                          </span>
                        </div>

                        {/* Specs badges */}
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-1 flex-wrap">
                          {assignedFilament && (
                            <span className="inline-flex items-center gap-1 bg-slate-900/80 px-1.5 py-0.2 rounded border border-slate-700 text-slate-300">
                              <span
                                className="w-2.5 h-2.5 rounded-full border border-slate-600"
                                style={getFilamentBackgroundStyle(assignedFilament.colorHex, assignedFilament.rgb)}
                              />
                              <span className="truncate max-w-[130px]">{assignedFilament.brand} {assignedFilament.type}</span>
                            </span>
                          )}

                          {assignedPrinter && (
                            <span className="inline-flex items-center gap-1 bg-slate-900/80 px-1.5 py-0.2 rounded border border-slate-700 text-slate-300">
                              <span>🖨️</span>
                              <span className="truncate max-w-[120px]">{assignedPrinter.name}</span>
                            </span>
                          )}

                          <span>⏱️ {formatHours(part.printHours)}</span>
                          <span>⚖️ {part.filamentGrams}g</span>
                        </div>
                      </div>
                    </div>

                    {/* Adjustable Part Unit Price & Line Total Box */}
                    <div className="flex items-center justify-between md:justify-end gap-3 bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
                      {/* Unit Price Adjustment Input */}
                      <div className="text-left">
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <label className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">
                            Unit Price ($/ea)
                          </label>
                          {hasCustomPrice && onUpdatePartUnitPrice && (
                            <button
                              type="button"
                              onClick={() => onUpdatePartUnitPrice(part.id, null)}
                              className="text-[10px] text-cyan-400 hover:text-cyan-200 underline"
                              title="Reset to auto formula markup"
                            >
                              ↺ Auto
                            </button>
                          )}
                        </div>

                        <div className="relative flex items-center">
                          <span className="absolute left-2.5 text-slate-400 font-mono text-xs">$</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={hasCustomPrice ? part.customUnitPrice! : parseFloat(row.perUnitPrice.toFixed(2))}
                            onChange={(e) => handleUnitCostChange(part.id, e.target.value)}
                            className={`w-28 bg-slate-900 border rounded-lg py-1 pl-6 pr-2 font-mono font-bold text-sm focus:outline-none transition ${
                              hasCustomPrice
                                ? 'border-amber-500/80 text-amber-300 focus:ring-1 focus:ring-amber-400'
                                : 'border-slate-700 text-cyan-300 hover:border-slate-600 focus:ring-1 focus:ring-cyan-500'
                            }`}
                            title="Directly type a custom unit price for this part"
                          />
                        </div>

                        {/* Status feedback & Cost warning */}
                        <div className="mt-1">
                          {isBelowCost ? (
                            <span className="text-[10px] text-rose-400 font-medium block">
                              ⚠️ Below cost ({formatCurrency(row.perUnitCost)})
                            </span>
                          ) : hasCustomPrice ? (
                            <span className="text-[10px] text-amber-400/90 font-medium block">
                              ✨ Custom (Auto: {formatCurrency(row.suggestedUnitPrice || row.perUnitCost * 1.3)})
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-500 block">
                              Cost: {formatCurrency(row.perUnitCost)}/ea
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Line Total Price */}
                      <div className="text-right border-l border-slate-800 pl-3">
                        <span className="text-[10px] text-slate-400 block uppercase tracking-wider font-semibold mb-1">
                          Part Total ({row.qty}x)
                        </span>
                        <span className="text-xl font-extrabold text-white font-mono block bg-gradient-to-r from-cyan-300 to-emerald-300 bg-clip-text text-transparent">
                          {formatCurrency(row.lineTotalPrice)}
                        </span>
                        <span className={`text-[10px] font-mono block mt-1 ${
                          partProfit >= 0 ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'
                        }`}>
                          {partProfit >= 0 ? '+' : ''}{formatCurrency(partProfit)} ({partProfitMargin.toFixed(0)}%)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Toggle Cost Breakdown for this Part */}
                  <div className="pt-1 flex justify-between items-center text-xs border-t border-slate-700/50">
                    <button
                      type="button"
                      onClick={() => setExpandedPartDetailsId(isExpanded ? null : (part.id || `part-${idx}`))}
                      className="text-cyan-400 hover:text-cyan-300 text-[11px] font-medium flex items-center gap-1"
                    >
                      <span>{isExpanded ? '▲ Hide cost breakdown' : '▼ View cost breakdown for this part'}</span>
                    </button>
                    <span className="text-[11px] text-slate-400 font-mono">
                      Batch cost: {formatCurrency(row.lineTotalCost)}
                    </span>
                  </div>

                  {/* Expanded Itemized Cost Sub-Breakdown for this Part */}
                  {isExpanded && (
                    <div className="p-2.5 bg-slate-950/80 rounded-lg border border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs animate-fadeIn">
                      <div>
                        <span className="text-slate-400 text-[10px] block">Material Cost</span>
                        <span className="font-mono text-slate-200">{formatCurrency((row.unitMaterialCost || 0) * row.qty)}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] block">Machine & Power</span>
                        <span className="font-mono text-slate-200">{formatCurrency(((row.unitMachineCost || 0) + (row.unitElectricityCost || 0)) * row.qty)}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] block">Labor & Post-process</span>
                        <span className="font-mono text-slate-200">{formatCurrency((row.unitLaborCost || 0) * row.qty)}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] block">Hardware & Extras</span>
                        <span className="font-mono text-slate-200">{formatCurrency(((row.unitHardwareCost || 0) + (row.unitMultiColorCost || 0)) * row.qty)}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* Table View with Inline Unit Price Editing */
          <div className="overflow-x-auto rounded-lg border border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/90 text-slate-300 uppercase tracking-wider border-b border-slate-700">
                <tr>
                  <th className="py-2.5 px-3">Part Name</th>
                  <th className="py-2.5 px-2 text-center">Qty</th>
                  <th className="py-2.5 px-2 text-right">Unit Cost</th>
                  <th className="py-2.5 px-3 text-right bg-cyan-950/20 text-cyan-300 font-bold">
                    Adjust Unit Price ($)
                  </th>
                  <th className="py-2.5 px-2 text-right">Line Cost</th>
                  <th className="py-2.5 px-3 text-right text-white font-bold bg-cyan-950/30">
                    Line Price
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 bg-slate-950/50">
                {partsSummary.rows.map((row, idx) => {
                  const part = row.part;
                  const hasCustomPrice = typeof part.customUnitPrice === 'number' && part.customUnitPrice >= 0;

                  return (
                    <tr key={part.id || idx} className="hover:bg-slate-800/40 transition">
                      <td className="py-2.5 px-3 font-semibold text-slate-100 truncate max-w-[150px]">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate">{part.name}</span>
                          {hasCustomPrice && (
                            <span className="text-[9px] bg-amber-950 text-amber-300 border border-amber-600/40 px-1 py-0.2 rounded font-mono">
                              custom
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-2 text-center font-mono font-bold text-cyan-300">
                        {row.qty}
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono text-slate-400">
                        {formatCurrency(row.perUnitCost)}
                      </td>
                      <td className="py-2 px-3 text-right bg-cyan-950/10">
                        <div className="flex items-center justify-end gap-1.5">
                          <span className="text-slate-400 font-mono text-xs">$</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={hasCustomPrice ? part.customUnitPrice! : parseFloat(row.perUnitPrice.toFixed(2))}
                            onChange={(e) => handleUnitCostChange(part.id, e.target.value)}
                            className={`w-20 bg-slate-900 border rounded py-1 px-1.5 font-mono text-right text-xs font-bold focus:outline-none ${
                              hasCustomPrice
                                ? 'border-amber-500 text-amber-300'
                                : 'border-slate-700 text-cyan-300 focus:border-cyan-400'
                            }`}
                            title="Adjust unit price for this part"
                          />
                          {hasCustomPrice && onUpdatePartUnitPrice && (
                            <button
                              type="button"
                              onClick={() => onUpdatePartUnitPrice(part.id, null)}
                              className="text-slate-400 hover:text-white text-xs"
                              title="Reset to auto formula markup"
                            >
                              ↺
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono text-slate-400">
                        {formatCurrency(row.lineTotalCost)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-white bg-cyan-950/20">
                        {formatCurrency(row.lineTotalPrice)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-800/90 font-bold border-t border-slate-700 text-slate-200">
                <tr>
                  <td className="py-2.5 px-3 uppercase text-slate-400">Total ({partsSummary.rows.length} parts)</td>
                  <td className="py-2.5 px-2 text-center text-cyan-300 font-mono">{partsSummary.totalQuantity}</td>
                  <td className="py-2.5 px-2 text-right text-slate-400 font-mono">-</td>
                  <td className="py-2.5 px-3 text-right text-cyan-300 font-mono text-xs font-normal">
                    Avg: {formatCurrency(partsSummary.totalQuantity > 0 ? partsSummary.grandTotalPrice / partsSummary.totalQuantity : 0)}/ea
                  </td>
                  <td className="py-2.5 px-2 text-right text-slate-300 font-mono">{formatCurrency(costBreakdown.costWithFailureRate)}</td>
                  <td className="py-2.5 px-3 text-right text-cyan-400 font-mono text-sm">{formatCurrency(partsSummary.grandTotalPrice)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Aggregate Cost Components Breakdown */}
      <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-700/80 space-y-2.5 text-sm">
        <h3 className="font-semibold text-slate-300 text-xs uppercase tracking-wider mb-2 border-b border-slate-800 pb-1.5">
          Overall Job Cost Breakdown
        </h3>
        <div className="flex justify-between text-slate-300">
          <span>Filament Material Cost:</span>
          <span className="font-mono">{formatCurrency(costBreakdown.filamentCost)}</span>
        </div>
        <div className="flex justify-between text-slate-300">
          <span>Electricity Cost:</span>
          <span className="font-mono">{formatCurrency(costBreakdown.electricityCost)}</span>
        </div>
        <div className="flex justify-between text-slate-300">
          <span>Labor & Post-processing:</span>
          <span className="font-mono">{formatCurrency(costBreakdown.laborCost)}</span>
        </div>
        <div className="flex justify-between text-slate-300">
          <span>Hardware & Fasteners:</span>
          <span className="font-mono">{formatCurrency(costBreakdown.hardwareCost)}</span>
        </div>

        {costBreakdown.printerCost !== undefined && (
          <div className="flex flex-col bg-slate-900/60 p-2.5 rounded-lg border border-slate-700/70">
            <div className="flex justify-between items-center text-sm">
              <span className="flex items-center gap-1.5 font-medium text-cyan-300">
                <span>⏱️ Printer Time & Depreciation:</span>
                {totalPrintHours > 0 && (
                  <span className="text-xs text-slate-400 font-normal">({formatHours(totalPrintHours)} total)</span>
                )}
              </span>
              <span className="font-mono font-semibold text-cyan-400">
                {formatCurrency(costBreakdown.printerCost || 0)}
              </span>
            </div>
            {((costBreakdown.printerDepreciationCost ?? 0) > 0 || (costBreakdown.printerMaintenanceCost ?? 0) > 0) && (
              <div className="flex justify-between text-[11px] text-slate-400 pt-1 mt-1 border-t border-slate-800">
                <span>Depreciation: {formatCurrency(costBreakdown.printerDepreciationCost || 0)}</span>
                <span>Maintenance & Fees: {formatCurrency(costBreakdown.printerMaintenanceCost || 0)}</span>
              </div>
            )}
          </div>
        )}

        {Boolean(costBreakdown.multiColorFee !== undefined && costBreakdown.multiColorFee > 0) && (
          <div className="flex flex-col bg-purple-950/30 p-2.5 rounded-lg border border-purple-500/30 space-y-1.5 text-sm">
            <div className="flex justify-between items-center text-purple-300">
              <span className="flex items-center gap-1.5 font-medium flex-wrap">
                <span>🎨 Multi-Color Fee:</span>
                {(costBreakdown.multiColorBatchMode || multiColorBatchMode) === 'different_plates' ? (
                  <span className="text-[10px] bg-cyan-950 text-cyan-300 border border-cyan-500/50 px-2 py-0.5 rounded-full font-semibold">
                    🥞 Diff Plates ({(costBreakdown.multiColorBedCount || multiColorBedCount || 1)} {((costBreakdown.multiColorBedCount || multiColorBedCount || 1) === 1) ? 'plate' : 'plates'})
                  </span>
                ) : (costBreakdown.multiColorBatchMode || multiColorBatchMode) === 'single_batch_per_bed' ? (
                  <span className="text-[10px] bg-purple-900/80 text-purple-200 border border-purple-400/40 px-2 py-0.5 rounded-full font-semibold">
                    1 Bed Batch ({(costBreakdown.multiColorBedCount || multiColorBedCount || 1)} {((costBreakdown.multiColorBedCount || multiColorBedCount || 1) === 1) ? 'plate' : 'plates'})
                  </span>
                ) : (
                  <span className="text-[10px] bg-slate-800 text-slate-300 border border-slate-600 px-2 py-0.5 rounded-full font-semibold">
                    Per Copy
                  </span>
                )}
              </span>
              <span className="font-mono font-semibold">{formatCurrency(costBreakdown.multiColorFee || 0)}</span>
            </div>

            {Boolean(costBreakdown.multiColorSavedFee && costBreakdown.multiColorSavedFee > 0) && (
              <div className="flex justify-between items-center text-[11px] text-emerald-300 bg-emerald-950/60 px-2 py-1 rounded border border-emerald-500/40 font-medium">
                <span>
                  {(costBreakdown.multiColorBatchMode || multiColorBatchMode) === 'different_plates'
                    ? '🎉 Multi-Plate Savings (0% purge waste):'
                    : '🎉 Batching Discount (parts on 1 bed):'}
                </span>
                <span className="font-mono font-bold">Saved {formatCurrency(costBreakdown.multiColorSavedFee)}</span>
              </div>
            )}

            {/* Quick Toggle for batching mode directly from cost breakdown */}
            {onUpdateMultiColorBatchMode && (
              <div className="flex items-center justify-between pt-1 border-t border-purple-900/50 text-xs">
                <span className="text-[11px] text-purple-300/80">Batching Mode:</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onUpdateMultiColorBatchMode('single_batch_per_bed')}
                    className={`px-2 py-0.5 rounded text-[10.5px] transition cursor-pointer ${
                      (costBreakdown.multiColorBatchMode || multiColorBatchMode) === 'single_batch_per_bed'
                        ? 'bg-purple-600 text-white font-semibold shadow-xs'
                        : 'bg-purple-950 text-purple-300 hover:bg-purple-900/60'
                    }`}
                    title="Fit parts on 1 bed: only add multi-color fee once for the whole bed batch"
                  >
                    1 Bed (AMS)
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateMultiColorBatchMode('different_plates')}
                    className={`px-2 py-0.5 rounded text-[10.5px] transition cursor-pointer ${
                      (costBreakdown.multiColorBatchMode || multiColorBatchMode) === 'different_plates'
                        ? 'bg-cyan-600 text-white font-semibold shadow-xs'
                        : 'bg-purple-950 text-purple-300 hover:bg-purple-900/60'
                    }`}
                    title="Separate build plates by color: zero purge waste and plate-by-plate fee"
                  >
                    Diff Plates
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateMultiColorBatchMode('per_copy')}
                    className={`px-2 py-0.5 rounded text-[10.5px] transition cursor-pointer ${
                      (costBreakdown.multiColorBatchMode || multiColorBatchMode) === 'per_copy'
                        ? 'bg-purple-600 text-white font-semibold shadow-xs'
                        : 'bg-purple-950 text-purple-300 hover:bg-purple-900/60'
                    }`}
                    title="Charge fee on each individual part copy"
                  >
                    Per Copy
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <hr className="border-slate-700 my-2" />
        <div className="flex justify-between font-semibold text-slate-200">
          <span>Subtotal (Direct Cost):</span>
          <span className="font-mono">{formatCurrency(costBreakdown.subtotal)}</span>
        </div>
        <div className="flex justify-between items-center text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <span>+ Failure Rate Risk Adj:</span>
            {costBreakdown.effectiveFailureRate !== undefined ? (
              <span className={`px-1.5 py-0.2 rounded font-mono font-medium text-[11px] ${
                costBreakdown.materialRiskApplied
                  ? 'bg-amber-950/80 text-amber-300 border border-amber-600/40'
                  : 'bg-slate-800 text-slate-300'
              }`}>
                {costBreakdown.effectiveFailureRate}%
                {costBreakdown.materialRiskApplied && ' ⚡ Technical Risk'}
              </span>
            ) : (
              <span>({parameters.failureRate}%)</span>
            )}
          </span>
          <span className="font-mono">{formatCurrency(costBreakdown.costWithFailureRate - costBreakdown.subtotal)}</span>
        </div>
        {Boolean(costBreakdown.materialRiskApplied && costBreakdown.materialRiskReason) && (
          <div className="text-[11px] text-amber-300/90 bg-amber-950/30 px-2 py-1 rounded border border-amber-600/30 flex items-center gap-1.5">
            <span>⚠️</span>
            <span>{costBreakdown.materialRiskReason}</span>
          </div>
        )}
        <div className="flex justify-between text-xs text-slate-400">
          <span>+ Total Net Profit:</span> 
          <span className={`font-mono font-medium ${currentProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {formatCurrency(currentProfit)} ({currentProfitMargin >= 0 ? '+' : ''}{currentProfitMargin.toFixed(1)}%)
          </span>
        </div>
      </div>

      {/* Suggested vs Quoted Price Card */}
      <div className="p-5 bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-700 rounded-2xl text-white shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
          <div>
            <span className="text-xs uppercase tracking-wider text-cyan-100 font-semibold block">
              Suggested Formula Price ({partsSummary.totalQuantity} total units)
            </span>
            <span className="text-3xl font-extrabold font-mono tracking-tight text-white">
              {formatCurrency(quotePrice)}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button 
              type="button"
              onClick={() => {
                setPrintDocType('quote');
                setIsPrintModalOpen(true);
              }}
              className="flex items-center justify-center gap-1.5 bg-white/15 hover:bg-white/25 text-white font-bold py-2.5 px-3.5 rounded-xl transition-colors shadow-md text-xs sm:text-sm border border-white/25 cursor-pointer"
              title="Print Customer Quote or Workshop Checklist to PDF or Paper"
            >
              <PrinterIcon className="w-4 h-4" />
              <span>Print / PDF</span>
            </button>

            <button 
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="flex items-center justify-center gap-2 bg-white/25 hover:bg-white/35 text-white font-bold py-2.5 px-4 rounded-xl transition-colors shadow-md text-sm border border-white/30 cursor-pointer"
            >
              <SaveIcon className="w-5 h-5" />
              <span>{revisingQuote ? 'Save Revised Quote' : 'Save Quote'}</span>
            </button>
          </div>
        </div>

        {/* One-Off Fees Card (Licensing, CAD Prep, Expedite, etc.) */}
        <div className="bg-white/10 rounded-xl p-3.5 border border-white/20 space-y-2.5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white flex items-center gap-1.5">
                <span>📜 One-Off Fees (Licensing, Design, Rush, Setup)</span>
              </span>
              {oneOffFees.length > 0 && (
                <span className="text-xs bg-amber-400 text-slate-950 font-black px-2 py-0.5 rounded-full shadow-xs">
                  +{formatCurrency(oneOffFeesTotal)}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={handleAddCustomFee}
              className="text-xs bg-white/20 hover:bg-white/30 text-white font-bold px-2.5 py-1 rounded-lg border border-white/30 transition cursor-pointer"
            >
              + Custom Fee
            </button>
          </div>

          {/* Quick Preset Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            <span className="text-[11px] text-white/70 font-semibold mr-0.5">Quick Add:</span>
            {DEFAULT_FEE_PRESETS.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleAddPresetFee(preset)}
                className="text-xs bg-black/25 hover:bg-black/40 text-white font-medium px-2 py-0.5 rounded-lg border border-white/20 transition cursor-pointer"
                title={`Add ${preset.description} ($${preset.amount.toFixed(2)})`}
              >
                {preset.label} (+${preset.amount})
              </button>
            ))}
          </div>

          {/* Active Fees List */}
          {oneOffFees.length > 0 && (
            <div className="space-y-1.5 pt-1">
              {oneOffFees.map((fee) => (
                <div key={fee.id} className="flex items-center justify-between gap-2 bg-black/35 p-2 rounded-lg border border-white/15 text-xs text-white">
                  <input
                    type="text"
                    value={fee.description}
                    onChange={(e) => handleUpdateFee(fee.id, { description: e.target.value })}
                    className="flex-1 bg-transparent border-0 focus:ring-1 focus:ring-white rounded px-1 py-0.5 font-medium text-white"
                  />
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-white/60">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={fee.amount}
                      onChange={(e) => handleUpdateFee(fee.id, { amount: parseFloat(e.target.value) || 0 })}
                      className="w-18 bg-white/15 border border-white/25 rounded px-1.5 py-0.5 text-right font-mono font-bold text-white text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveFee(fee.id)}
                      className="text-white/60 hover:text-red-300 p-1 transition cursor-pointer"
                      title="Remove fee"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <hr className="border-white/20" />

        {/* Quoted Price Input with Part Price Re-calculation feedback */}
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label htmlFor="quotedPrice" className="text-sm font-bold text-white flex items-center gap-1.5">
              <span>Final Quoted Price:</span>
              {customPartsCount > 0 && (
                <span className="text-[11px] bg-white/20 px-2 py-0.2 rounded font-normal">
                  (Sum of adjusted parts + fees)
                </span>
              )}
            </label>
            {editableQuotePrice !== (quotePrice + oneOffFeesTotal) && (
              <button
                type="button"
                onClick={() => {
                  setEditableQuotePrice(parseFloat((quotePrice + oneOffFeesTotal).toFixed(2)));
                  if (onResetAllPartUnitPrices) onResetAllPartUnitPrices();
                }}
                className="text-xs text-cyan-200 hover:text-white underline cursor-pointer"
              >
                Reset to Suggested ({formatCurrency(quotePrice + oneOffFeesTotal)})
              </button>
            )}
          </div>

          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
              <span className="text-white text-2xl font-mono">$</span>
            </div>
            <input
              type="number"
              id="quotedPrice"
              name="quotedPrice"
              value={editableQuotePrice}
              onChange={handlePriceChange}
              onBlur={e => {
                const value = parseFloat(e.target.value);
                setEditableQuotePrice(value ? parseFloat(value.toFixed(2)) : 0);
              }}
              min="0"
              step="0.01"
              className="w-full bg-white/20 border border-white/30 rounded-xl shadow-inner py-2.5 pl-10 pr-4 text-white text-2xl font-mono font-bold focus:outline-none focus:ring-2 focus:ring-white transition placeholder-white/50"
              aria-label="Quoted Price"
            />
          </div>

          <div className="flex justify-between items-center text-xs text-cyan-100 mt-2 font-medium">
            <span>
              Net Margin: <strong className="text-white">{currentProfitMargin.toFixed(1)}%</strong> (${currentProfit.toFixed(2)} profit)
            </span>
            <span>
              Avg: <strong className="text-white">{formatCurrency(partsSummary.totalQuantity > 0 ? editableQuotePrice / partsSummary.totalQuantity : 0)} / unit</strong>
            </span>
          </div>
        </div>
      </div>

      <SaveQuoteModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        nextJobNumber={nextJobNumber}
        initialJobName={revisingQuote ? revisingQuote.jobName : ''}
        initialCustomerName={revisingQuote ? revisingQuote.customerName : ''}
        initialJobNumber={revisingQuote ? revisingQuote.jobNumber : undefined}
        isRevision={!!revisingQuote}
      />

      <PrintDocumentModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        quote={liveQuote}
        filaments={filaments}
        printers={printers}
        initialDocType={printDocType}
        generalSettings={generalSettings}
        onUpdateGeneralSettings={onUpdateGeneralSettings}
        onUpdateQuote={(updated) => {
          if (updated.oneOffFees) {
            setOneOffFees(updated.oneOffFees);
          }
        }}
      />
    </div>
  );
};

export default CostBreakdownDisplay;