import React, { useState, useEffect } from 'react';
import type { CostBreakdown, PrintParameters, Quote, QuotePartConfig, Printer } from '../types';
import SaveIcon from './icons/SaveIcon';
import SaveQuoteModal from './SaveQuoteModal';

interface CostBreakdownDisplayProps {
  costBreakdown: CostBreakdown;
  quotePrice: number;
  onSaveQuote: (jobName: string, customerName: string, jobNumber: number, finalQuotePrice: number, params: PrintParameters, breakdown: CostBreakdown, isCreateNew?: boolean) => void;
  nextJobNumber: number;
  parameters: PrintParameters;
  revisingQuote?: Quote | null;
  onCancelRevision?: () => void;
  quoteParts?: QuotePartConfig[];
  printers?: Printer[];
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
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
  printers,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editableQuotePrice, setEditableQuotePrice] = useState(quotePrice);

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
    <div>
      {revisingQuote && (
        <div className="mb-5 p-3.5 bg-amber-500/15 border border-amber-500/40 rounded-xl flex items-center justify-between text-amber-200">
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

      <h2 className="text-2xl font-semibold text-cyan-400 border-b border-slate-600 pb-2 mb-4">Quote Breakdown</h2>
      <div className="space-y-3 text-lg mb-6">
        <div className="flex justify-between"><span>Filament Cost:</span> <span className="font-mono">{formatCurrency(costBreakdown.filamentCost)}</span></div>
        <div className="flex justify-between"><span>Electricity Cost:</span> <span className="font-mono">{formatCurrency(costBreakdown.electricityCost)}</span></div>
        <div className="flex justify-between"><span>Labor Cost:</span> <span className="font-mono">{formatCurrency(costBreakdown.laborCost)}</span></div>
        <div className="flex justify-between"><span>Hardware Cost:</span> <span className="font-mono">{formatCurrency(costBreakdown.hardwareCost)}</span></div>
        {costBreakdown.printerCost !== undefined && (
          <div className="flex flex-col bg-slate-900/40 p-2.5 rounded-lg border border-slate-700/80">
            <div className="flex justify-between items-center text-base">
              <span className="flex items-center gap-1.5 font-medium text-cyan-300">
                <span>⏱️ Printer Time & Depreciation:</span>
                {totalPrintHours > 0 && (() => {
                  const h = Math.floor(totalPrintHours);
                  const m = Math.round((totalPrintHours - h) * 60);
                  const durationStr = h > 0 && m > 0 ? `${h}h ${m}m` : h > 0 ? `${h}h` : `${m}m`;
                  return (
                    <span className="text-xs text-slate-400 font-normal">({durationStr} total)</span>
                  );
                })()}
              </span>
              <span className="font-mono font-semibold text-cyan-400">
                {formatCurrency(costBreakdown.printerCost || 0)}
              </span>
            </div>
            {((costBreakdown.printerDepreciationCost ?? 0) > 0 || (costBreakdown.printerMaintenanceCost ?? 0) > 0) && (
              <div className="flex justify-between text-xs text-slate-400 pt-1 mt-1 border-t border-slate-800">
                <span>Depreciation: {formatCurrency(costBreakdown.printerDepreciationCost || 0)}</span>
                <span>Maint & Fees: {formatCurrency(costBreakdown.printerMaintenanceCost || 0)}</span>
              </div>
            )}
          </div>
        )}

        {/* Multi-Part & Multi-Printer Production Allocation */}
        {quoteParts && quoteParts.length > 1 && (
          <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-700/80 space-y-2 text-xs">
            <div className="flex justify-between items-center text-slate-300 font-semibold border-b border-slate-800 pb-1.5">
              <span className="flex items-center gap-1.5 text-cyan-400">
                <span>🏭 Machine Routing ({quoteParts.length} Parts):</span>
              </span>
              <span className="text-[11px] text-slate-400 font-normal">
                {new Set(quoteParts.map(p => p.printerId)).size} distinct printer{new Set(quoteParts.map(p => p.printerId)).size > 1 ? 's' : ''}
              </span>
            </div>
            <div className="space-y-1.5">
              {quoteParts.map((part, idx) => {
                const assignedPrinter = printers?.find(p => p.id === part.printerId);
                const h = Math.floor(part.printHours || 0);
                const m = Math.round(((part.printHours || 0) - h) * 60);
                const timeStr = h > 0 && m > 0 ? `${h}h ${m}m` : h > 0 ? `${h}h` : `${m}m`;
                return (
                  <div key={part.id || idx} className="flex justify-between items-center bg-slate-800/70 px-2 py-1.5 rounded border border-slate-700/50">
                    <div className="flex items-center gap-2 truncate">
                      <span className="font-semibold text-slate-200 truncate">{part.name}</span>
                      <span className="text-slate-400 text-[11px]">×{part.quantity}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 text-right">
                      <span className="bg-cyan-950/70 text-cyan-300 px-2 py-0.5 rounded border border-cyan-800/50 text-[11px] font-medium flex items-center gap-1 truncate max-w-[150px]">
                        <span>🖨️</span>
                        <span className="truncate">{assignedPrinter ? `${assignedPrinter.brand} ${assignedPrinter.name}` : 'Default Printer'}</span>
                      </span>
                      <span className="font-mono text-slate-300 text-[11px]">{timeStr}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {Boolean(costBreakdown.multiColorFee && costBreakdown.multiColorFee > 0) && (
          <div className="flex justify-between items-center text-purple-300 bg-purple-950/30 px-2.5 py-1 rounded-lg border border-purple-500/30 text-base">
            <span className="flex items-center gap-1.5 font-medium">
              <span>🎨 Multi-Color Fee:</span>
            </span>
            <span className="font-mono font-semibold">{formatCurrency(costBreakdown.multiColorFee || 0)}</span>
          </div>
        )}
        <hr className="border-slate-600 my-2" />
        <div className="flex justify-between font-semibold"><span>Subtotal:</span> <span className="font-mono">{formatCurrency(costBreakdown.subtotal)}</span></div>
        <div className="flex justify-between text-sm text-slate-400"><span>+ Failure Rate Adj:</span> <span className="font-mono">{formatCurrency(costBreakdown.costWithFailureRate - costBreakdown.subtotal)}</span></div>
        <div className="flex justify-between text-sm text-slate-400">
          <span>+ Profit:</span> 
          <span className={`font-mono font-medium ${currentProfit >= 0 ? 'text-slate-200' : 'text-red-400'}`}>
            {formatCurrency(currentProfit)} ({currentProfitMargin >= 0 ? '+' : ''}{currentProfitMargin.toFixed(1)}%)
          </span>
        </div>
      </div>
      <div className="mt-6 p-4 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg text-white shadow-lg">
        <div className="flex justify-between items-center">
          <div>
            <span className="text-xl font-bold">Suggested Price:</span>
            <span className="text-3xl font-extrabold ml-3 font-mono">{formatCurrency(quotePrice)}</span>
          </div>
           <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white font-bold py-2 px-4 rounded-lg transition-colors"
          >
            <SaveIcon className="w-5 h-5" />
            {revisingQuote ? 'Save Revised Quote' : 'Save Quote'}
          </button>
        </div>
        <hr className="border-white/20 my-4" />
        <div>
            <label htmlFor="quotedPrice" className="block text-lg font-bold mb-1">Quoted Price:</label>
            <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
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
                    className="w-full bg-white/20 border border-transparent rounded-md shadow-sm py-2 pl-10 pr-3 text-white text-2xl font-mono focus:outline-none focus:ring-2 focus:ring-white transition"
                    aria-label="Quoted Price"
                />
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