import React, { useState, useEffect, useMemo } from 'react';
import type { CostBreakdown, PrintParameters, Quote, QuotePartConfig, Printer, Filament } from '../types';
import { QuoteStatus } from '../types';
import SaveIcon from './icons/SaveIcon';
import SaveQuoteModal from './SaveQuoteModal';
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
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editableQuotePrice, setEditableQuotePrice] = useState(quotePrice);
  const [expandedPartDetailsId, setExpandedPartDetailsId] = useState<string | null>(null);
  const [partsViewMode, setPartsViewMode] = useState<'cards' | 'table'>('cards');

  const totalPrintHours = quoteParts 
    ? quoteParts.reduce((sum, p) => sum + (p.printHours * p.quantity), 0)
    : parameters.printHours;

  useEffect(() => {
    setEditableQuotePrice(quotePrice);
  }, [quotePrice]);

  const costWithFailure = costBreakdown.costWithFailureRate;
  const currentProfit = editableQuotePrice - costWithFailure;
  const currentProfitMargin = costWithFailure > 0 
    ? ((currentProfit / costWithFailure) * 100) 
    : 0;

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
    costBreakdown,
    parts: quoteParts,
  }), [revisingQuote, nextJobNumber, editableQuotePrice, parameters, costBreakdown, quoteParts]);

  const partsSummary = useMemo(() => {
    return calculateJobPartRows(liveQuote, filaments, printers);
  }, [liveQuote, filaments, printers]);

  const handleSave = (jobName: string, customerName: string, jobNumber: number, isCreateNew?: boolean) => {
    const updatedBreakdown: CostBreakdown = {
      ...costBreakdown,
      profit: parseFloat(currentProfit.toFixed(2)),
    };
    const updatedParameters: PrintParameters = {
      ...parameters,
      profitMargin: parseFloat(currentProfitMargin.toFixed(1)),
    };
    onSaveQuote(jobName, customerName, jobNumber, editableQuotePrice, updatedParameters, updatedBreakdown, isCreateNew);
    setIsModalOpen(false);
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditableQuotePrice(parseFloat(e.target.value) || 0);
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

      {/* FEATURED: Each Part Added with Its Exact Quoted Price & Unit Price */}
      <div className="bg-slate-900/70 p-4 rounded-xl border border-slate-700/80 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">🏷️</span>
            <h3 className="font-bold text-white text-base">Each Part & Price</h3>
            <span className="text-xs bg-cyan-950 text-cyan-300 border border-cyan-700/50 px-2 py-0.5 rounded-full font-semibold">
              Itemized Quote
            </span>
          </div>
          <span className="text-xs text-slate-400">
            Prices scale automatically with your quoted price
          </span>
        </div>

        {partsViewMode === 'cards' ? (
          /* Cards View */
          <div className="space-y-2.5">
            {partsSummary.rows.map((row, idx) => {
              const part = row.part;
              const assignedFilament = filaments.find(f => f.id === part.filamentId);
              const assignedPrinter = printers.find(p => p.id === part.printerId);
              const partProfit = row.lineTotalPrice - row.lineTotalCost;
              const partProfitMargin = row.lineTotalCost > 0 ? (partProfit / row.lineTotalCost) * 100 : 0;
              const isExpanded = expandedPartDetailsId === (part.id || `part-${idx}`);
              const quoteShare = editableQuotePrice > 0 ? ((row.lineTotalPrice / editableQuotePrice) * 100).toFixed(0) : 0;

              return (
                <div
                  key={part.id || idx}
                  className="bg-slate-800/80 hover:bg-slate-800 rounded-xl border border-slate-700/80 p-3.5 transition shadow-sm space-y-2"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    {/* Part info */}
                    <div className="flex items-start gap-3 min-w-0">
                      {part.imageUrl ? (
                        <img
                          src={part.imageUrl}
                          alt={part.name}
                          className="w-11 h-11 rounded-lg object-cover border border-slate-600 flex-shrink-0 shadow-sm"
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-lg bg-slate-900/90 border border-slate-700 flex items-center justify-center flex-shrink-0 text-cyan-400 font-bold text-sm">
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
                            {quoteShare}% of quote
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

                    {/* Prominent Part Price Box */}
                    <div className="flex items-center justify-between sm:justify-end gap-3 bg-slate-950/70 sm:bg-transparent p-2.5 sm:p-0 rounded-lg border border-slate-800 sm:border-0">
                      <div className="text-left sm:text-right">
                        <span className="text-[11px] text-slate-400 block uppercase tracking-wider font-semibold">
                          Unit Price
                        </span>
                        <span className="text-base font-bold text-cyan-300 font-mono block">
                          {formatCurrency(row.perUnitPrice)}
                          <span className="text-[11px] text-slate-400 font-normal"> / ea</span>
                        </span>
                        <span className="text-[11px] text-slate-500 block font-mono">
                          cost: {formatCurrency(row.perUnitCost)}/ea
                        </span>
                      </div>

                      <div className="text-right border-l border-slate-800 pl-3">
                        <span className="text-[11px] text-slate-400 block uppercase tracking-wider font-semibold">
                          Total Price
                        </span>
                        <span className="text-lg font-extrabold text-white font-mono block bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent">
                          {formatCurrency(row.lineTotalPrice)}
                        </span>
                        <span className="text-[11px] text-emerald-400 block font-mono">
                          +{formatCurrency(partProfit)} ({partProfitMargin.toFixed(0)}%)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Toggle Cost Breakdown for this Part */}
                  <div className="pt-1 flex justify-between items-center text-xs">
                    <button
                      type="button"
                      onClick={() => setExpandedPartDetailsId(isExpanded ? null : (part.id || `part-${idx}`))}
                      className="text-cyan-400 hover:text-cyan-300 text-[11px] font-medium flex items-center gap-1"
                    >
                      <span>{isExpanded ? '▲ Hide cost breakdown' : '▼ View cost breakdown for this part'}</span>
                    </button>
                    <span className="text-[11px] text-slate-400">
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
          /* Table View */
          <div className="overflow-x-auto rounded-lg border border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/90 text-slate-300 uppercase tracking-wider border-b border-slate-700">
                <tr>
                  <th className="py-2.5 px-3">Part Name</th>
                  <th className="py-2.5 px-2 text-center">Qty</th>
                  <th className="py-2.5 px-2 text-right">Unit Cost</th>
                  <th className="py-2.5 px-2 text-right">Unit Price</th>
                  <th className="py-2.5 px-2 text-right">Total Cost</th>
                  <th className="py-2.5 px-3 text-right">Total Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 bg-slate-950/50">
                {partsSummary.rows.map((row, idx) => (
                  <tr key={row.part.id || idx} className="hover:bg-slate-800/40 transition">
                    <td className="py-2 px-3 font-semibold text-slate-100 truncate max-w-[150px]">
                      {row.part.name}
                    </td>
                    <td className="py-2 px-2 text-center font-mono font-bold text-cyan-300">
                      {row.qty}
                    </td>
                    <td className="py-2 px-2 text-right font-mono text-slate-400">
                      {formatCurrency(row.perUnitCost)}
                    </td>
                    <td className="py-2 px-2 text-right font-mono font-bold text-cyan-300">
                      {formatCurrency(row.perUnitPrice)}
                    </td>
                    <td className="py-2 px-2 text-right font-mono text-slate-400">
                      {formatCurrency(row.lineTotalCost)}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-white">
                      {formatCurrency(row.lineTotalPrice)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-800/90 font-bold border-t border-slate-700 text-slate-200">
                <tr>
                  <td className="py-2 px-3 uppercase text-slate-400">Total ({partsSummary.rows.length} parts)</td>
                  <td className="py-2 px-2 text-center text-cyan-300 font-mono">{partsSummary.totalQuantity}</td>
                  <td className="py-2 px-2 text-right text-slate-400 font-mono">-</td>
                  <td className="py-2 px-2 text-right text-slate-400 font-mono">-</td>
                  <td className="py-2 px-2 text-right text-slate-300 font-mono">{formatCurrency(costBreakdown.costWithFailureRate)}</td>
                  <td className="py-2 px-3 text-right text-cyan-400 font-mono text-sm">{formatCurrency(editableQuotePrice)}</td>
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

        {Boolean(costBreakdown.multiColorFee && costBreakdown.multiColorFee > 0) && (
          <div className="flex justify-between items-center text-purple-300 bg-purple-950/30 px-2.5 py-1 rounded-lg border border-purple-500/30 text-sm">
            <span className="flex items-center gap-1.5 font-medium">
              <span>🎨 Multi-Color Fee:</span>
            </span>
            <span className="font-mono font-semibold">{formatCurrency(costBreakdown.multiColorFee || 0)}</span>
          </div>
        )}

        <hr className="border-slate-700 my-2" />
        <div className="flex justify-between font-semibold text-slate-200">
          <span>Subtotal (Direct Cost):</span>
          <span className="font-mono">{formatCurrency(costBreakdown.subtotal)}</span>
        </div>
        <div className="flex justify-between text-xs text-slate-400">
          <span>+ Failure Rate Risk Adj:</span>
          <span className="font-mono">{formatCurrency(costBreakdown.costWithFailureRate - costBreakdown.subtotal)}</span>
        </div>
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
              Suggested Quoted Price ({partsSummary.totalQuantity} total units)
            </span>
            <span className="text-3xl font-extrabold font-mono tracking-tight text-white">
              {formatCurrency(quotePrice)}
            </span>
          </div>

          <button 
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center gap-2 bg-white/20 hover:bg-white/30 text-white font-bold py-2.5 px-4 rounded-xl transition-colors shadow-md text-sm border border-white/20"
          >
            <SaveIcon className="w-5 h-5" />
            <span>{revisingQuote ? 'Save Revised Quote' : 'Save Quote'}</span>
          </button>
        </div>

        <hr className="border-white/20" />

        {/* Quoted Price Input with Part Price Re-calculation feedback */}
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label htmlFor="quotedPrice" className="text-sm font-bold text-white flex items-center gap-1.5">
              <span>Final Quoted Price:</span>
            </label>
            {editableQuotePrice !== quotePrice && (
              <button
                type="button"
                onClick={() => setEditableQuotePrice(quotePrice)}
                className="text-xs text-cyan-200 hover:text-white underline"
              >
                Reset to Suggested ({formatCurrency(quotePrice)})
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
    </div>
  );
};

export default CostBreakdownDisplay;