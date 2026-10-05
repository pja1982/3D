import React, { useState, useEffect } from 'react';
import type { CostBreakdown, PrintParameters } from '../types';
import SaveIcon from './icons/SaveIcon';
import SaveQuoteModal from './SaveQuoteModal';

interface CostBreakdownDisplayProps {
  costBreakdown: CostBreakdown;
  quotePrice: number;
  onSaveQuote: (jobName: string, customerName: string, jobNumber: number, finalQuotePrice: number, params: PrintParameters, breakdown: CostBreakdown) => void;
  nextJobNumber: number;
  parameters: PrintParameters;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
};

const CostBreakdownDisplay: React.FC<CostBreakdownDisplayProps> = ({ costBreakdown, quotePrice, onSaveQuote, nextJobNumber, parameters }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editableQuotePrice, setEditableQuotePrice] = useState(quotePrice);

  useEffect(() => {
    setEditableQuotePrice(quotePrice);
  }, [quotePrice]);

  const handleSave = (jobName: string, customerName: string, jobNumber: number) => {
    onSaveQuote(jobName, customerName, jobNumber, editableQuotePrice, parameters, costBreakdown);
    setIsModalOpen(false);
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditableQuotePrice(parseFloat(e.target.value) || 0);
  };

  return (
    <div>
      <h2 className="text-2xl font-semibold text-cyan-400 border-b border-slate-600 pb-2 mb-4">Quote Breakdown</h2>
      <div className="space-y-3 text-lg mb-6">
        <div className="flex justify-between"><span>Filament Cost:</span> <span className="font-mono">{formatCurrency(costBreakdown.filamentCost)}</span></div>
        <div className="flex justify-between"><span>Electricity Cost:</span> <span className="font-mono">{formatCurrency(costBreakdown.electricityCost)}</span></div>
        <div className="flex justify-between"><span>Labor Cost:</span> <span className="font-mono">{formatCurrency(costBreakdown.laborCost)}</span></div>
        <div className="flex justify-between"><span>Hardware Cost:</span> <span className="font-mono">{formatCurrency(costBreakdown.hardwareCost)}</span></div>
        <hr className="border-slate-600 my-2" />
        <div className="flex justify-between font-semibold"><span>Subtotal:</span> <span className="font-mono">{formatCurrency(costBreakdown.subtotal)}</span></div>
        <div className="flex justify-between text-sm text-slate-400"><span>+ Failure Rate Adj:</span> <span className="font-mono">{formatCurrency(costBreakdown.costWithFailureRate - costBreakdown.subtotal)}</span></div>
        <div className="flex justify-between text-sm text-slate-400"><span>+ Profit:</span> <span className="font-mono">{formatCurrency(costBreakdown.profit)}</span></div>
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
            Save Quote
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
      />
    </div>
  );
};

export default CostBreakdownDisplay;