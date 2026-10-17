import React, { useState } from 'react';
import type { Quote, Filament, Printer } from '../types';
import { calculateJobPartRows } from '../utils/partCostCalculator';
import ImageModal from './ImageModal';
import { getFilamentBackgroundStyle } from '../utils/filamentProfilesSync';

interface JobPartsTableProps {
  quote: Quote;
  filaments?: Filament[];
  printers?: Printer[];
  onOpenPhotoModal?: (imageUrl: string, title: string) => void;
  title?: string;
  showPricingDetails?: boolean;
}

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

const formatHours = (hours: number) => {
  const h = Math.floor(hours || 0);
  const m = Math.round(((hours || 0) - h) * 60);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
};

export const JobPartsTable: React.FC<JobPartsTableProps> = ({
  quote,
  filaments = [],
  printers = [],
  onOpenPhotoModal,
  title = 'Job Parts Breakdown',
  showPricingDetails = true,
}) => {
  const [internalPreview, setInternalPreview] = useState<{ url: string; title: string } | null>(null);
  const [tableMode, setTableMode] = useState<'both' | 'price-only'>('both');

  const handleImageClick = (url: string, partName: string) => {
    if (onOpenPhotoModal) {
      onOpenPhotoModal(url, `Part: ${partName}`);
    } else {
      setInternalPreview({ url, title: partName });
    }
  };

  const {
    rows: computedRows,
    totalQuantity,
    totalQuantityRequired,
    grandTotalCost,
    grandTotalPrice,
  } = calculateJobPartRows(quote, filaments, printers);
  const parts = computedRows.map(r => r.part);
  const totalProfit = grandTotalPrice - grandTotalCost;
  const totalMargin = grandTotalCost > 0 ? (totalProfit / grandTotalCost) * 100 : 0;

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-700/80 pb-2.5 gap-2">
        <div className="flex items-center gap-2">
          <h4 className="font-semibold text-cyan-400 text-base">{title}</h4>
          <span className="text-xs bg-slate-800 text-slate-300 px-2.5 py-0.5 rounded-full border border-slate-700 font-semibold">
            {parts.length} {parts.length === 1 ? 'part' : 'parts'}
          </span>
          <span className="text-xs bg-cyan-950 text-cyan-300 border border-cyan-800/60 px-2 py-0.5 rounded-full font-bold">
            Quoted: {formatCurrency(quote.quotePrice)}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-900 rounded-lg p-0.5 border border-slate-700 text-xs">
            <button
              type="button"
              onClick={() => setTableMode('both')}
              className={`px-2.5 py-1 rounded font-medium transition ${
                tableMode === 'both'
                  ? 'bg-cyan-600 text-white font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Cost & Price
            </button>
            <button
              type="button"
              onClick={() => setTableMode('price-only')}
              className={`px-2.5 py-1 rounded font-medium transition ${
                tableMode === 'price-only'
                  ? 'bg-cyan-600 text-white font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Price Only
            </button>
          </div>

          <div className="text-xs text-slate-400 flex items-center gap-2 hidden md:flex">
            <span>Total Units: <strong className="text-slate-200">{totalQuantity}</strong></span>
            <span>•</span>
            <span>Req: <strong className="text-cyan-300">{totalQuantityRequired}</strong></span>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-700/80 shadow-md">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="bg-slate-800/90 text-slate-300 border-b border-slate-700 text-xs uppercase tracking-wider font-semibold">
              <th scope="col" className="py-3 px-3.5">The Part</th>
              <th scope="col" className="py-3 px-3 text-center">Quantity</th>
              <th scope="col" className="py-3 px-3 text-center">Required</th>
              {tableMode === 'both' && (
                <th scope="col" className="py-3 px-3 text-right text-slate-400">Unit Cost</th>
              )}
              <th scope="col" className="py-3 px-3 text-right text-cyan-400 font-bold bg-cyan-950/20">Unit Price</th>
              {tableMode === 'both' && (
                <th scope="col" className="py-3 px-3 text-right text-slate-400">Total Cost</th>
              )}
              <th scope="col" className="py-3 px-3.5 text-right text-white font-bold bg-cyan-950/30">Total Price</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/60 bg-slate-900/60">
            {computedRows.map(({ part, qty, qtyRequired, printer, perUnitCost, lineTotalCost, perUnitPrice, lineTotalPrice }, idx) => {
              const filament = filaments.find((f) => f.id === part.filamentId);
              const isMultiColor = Boolean(part.colors && part.colors.length > 1);
              const partProfit = lineTotalPrice - lineTotalCost;
              const partMargin = lineTotalCost > 0 ? (partProfit / lineTotalCost) * 100 : 0;

              return (
                <tr key={part.id || idx} className="hover:bg-slate-800/40 transition-colors">
                  {/* The Part */}
                  <td className="py-3 px-3.5 align-top min-w-[240px]">
                    <div className="flex items-start gap-3">
                      {part.imageUrl ? (
                        <img
                          src={part.imageUrl}
                          alt={part.name}
                          className="w-10 h-10 rounded-lg object-cover border border-slate-700 hover:border-cyan-400 cursor-pointer flex-shrink-0 transition shadow-sm"
                          onClick={() => handleImageClick(part.imageUrl!, part.name)}
                          title="Click to view part photo"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-slate-800/80 border border-dashed border-slate-700 flex items-center justify-center flex-shrink-0 text-slate-500 font-bold text-xs">
                          #{idx + 1}
                        </div>
                      )}

                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-100 text-sm truncate">{part.name}</span>
                          <span className="text-[10px] text-slate-400 font-mono">#{idx + 1}</span>
                        </div>

                        {/* Specs & Material Badges */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {filament ? (
                            <span className="inline-flex items-center gap-1 bg-slate-800 border border-slate-700 text-slate-300 text-[11px] px-1.5 py-0.5 rounded">
                              {filament.colorHex && (
                                <span
                                  className="w-2.5 h-2.5 rounded-full border border-slate-600 flex-shrink-0"
                                  style={getFilamentBackgroundStyle(filament.colorHex, filament.rgb)}
                                />
                              )}
                              <span className="truncate max-w-[120px]">{filament.brand} {filament.type}</span>
                            </span>
                          ) : null}

                          {/* Machine */}
                          {printer && (
                            <span className="inline-flex items-center gap-1 bg-slate-800 border border-slate-700 text-slate-300 text-[11px] px-1.5 py-0.5 rounded">
                              🖨️ <span className="truncate max-w-[130px]">{printer.brand} {printer.name}</span>
                            </span>
                          )}

                          {/* Print Specs */}
                          <span className="text-[11px] text-slate-400">
                            ⚖️ {part.filamentGrams}g
                          </span>
                          <span className="text-[11px] text-slate-400">
                            ⏱️ {formatHours(part.printHours)}
                          </span>
                          {part.postProcessingHours > 0 && (
                            <span className="text-[11px] text-slate-400">
                              🛠️ {formatHours(part.postProcessingHours)} post
                            </span>
                          )}
                        </div>

                        {/* Multi-color detail breakdown if expanded */}
                        {isMultiColor && part.colors && (
                          <div className="pt-1 flex flex-wrap gap-1">
                            {part.colors.map((c, ci) => {
                              const fil = filaments.find((f) => f.id === c.filamentId);
                              return (
                                <span key={c.id || ci} className="inline-flex items-center gap-1 text-[10px] bg-slate-800/80 text-slate-300 px-1 py-0.2 rounded border border-slate-700">
                                  <span
                                    className="w-2 h-2 rounded-full"
                                    style={getFilamentBackgroundStyle(fil?.colorHex, fil?.rgb)}
                                  />
                                  <span>{fil?.brand ? `${fil.brand} ${fil.type}` : 'Filament'}: {c.grams}g</span>
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* The Quantity */}
                  <td className="py-3 px-3 align-middle text-center whitespace-nowrap">
                    <span className="inline-block bg-slate-800 border border-slate-700 font-mono font-bold text-slate-200 px-2.5 py-1 rounded-md text-sm">
                      {qty}
                    </span>
                    <span className="block text-[10px] text-slate-500 mt-0.5">batch units</span>
                  </td>

                  {/* The Quantity Required */}
                  <td className="py-3 px-3 align-middle text-center whitespace-nowrap">
                    <div className="inline-flex flex-col items-center">
                      <span className={`inline-block font-mono font-bold px-2.5 py-1 rounded-md text-sm border ${
                        qty >= qtyRequired
                          ? 'bg-emerald-950/50 border-emerald-700/60 text-emerald-300'
                          : 'bg-amber-950/50 border-amber-700/60 text-amber-300'
                      }`}>
                        {qtyRequired}
                      </span>
                      <span className={`text-[10px] mt-0.5 font-medium ${
                        qty >= qtyRequired ? 'text-emerald-400' : 'text-amber-400'
                      }`}>
                        {qty >= qtyRequired ? '✓ Fulfilled' : `${qtyRequired - qty} remaining`}
                      </span>
                    </div>
                  </td>

                  {/* Per Unit Cost */}
                  {tableMode === 'both' && (
                    <td className="py-3 px-3 align-middle text-right whitespace-nowrap font-mono text-slate-400 text-sm">
                      {formatCurrency(perUnitCost)}
                    </td>
                  )}

                  {/* Per Unit Price */}
                  <td className="py-3 px-3 align-middle text-right whitespace-nowrap font-mono bg-cyan-950/10">
                    <span className="text-sm font-bold text-cyan-300 block">
                      {formatCurrency(perUnitPrice)}
                    </span>
                    <span className="text-[10px] text-slate-500 block font-sans">
                      / unit
                    </span>
                  </td>

                  {/* Total Cost */}
                  {tableMode === 'both' && (
                    <td className="py-3 px-3 align-middle text-right whitespace-nowrap font-mono text-slate-300 text-sm">
                      {formatCurrency(lineTotalCost)}
                    </td>
                  )}

                  {/* Total Price */}
                  <td className="py-3 px-3.5 align-middle text-right whitespace-nowrap font-mono bg-cyan-950/20">
                    <span className="text-base font-extrabold text-white block">
                      {formatCurrency(lineTotalPrice)}
                    </span>
                    {tableMode === 'both' && (
                      <span className="text-[10px] text-emerald-400 block font-sans">
                        +{formatCurrency(partProfit)} ({partMargin.toFixed(0)}%)
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>

          {/* Table Summary Footer */}
          <tfoot>
            <tr className="bg-slate-800/90 text-slate-200 font-semibold border-t-2 border-slate-700 text-xs">
              <td className="py-3 px-3.5">
                <span className="uppercase tracking-wider text-slate-300 font-bold">
                  Total ({parts.length} {parts.length === 1 ? 'part' : 'parts'})
                </span>
              </td>
              <td className="py-3 px-3 text-center font-mono font-bold text-slate-200">
                {totalQuantity}
              </td>
              <td className="py-3 px-3 text-center font-mono font-bold text-emerald-300">
                {totalQuantityRequired}
              </td>
              {tableMode === 'both' && (
                <td className="py-3 px-3 text-right font-mono text-slate-400">
                  <span className="text-[11px] block text-slate-400">Cost:</span>
                </td>
              )}
              <td className="py-3 px-3 text-right font-mono bg-cyan-950/30 text-cyan-300">
                <span className="text-[11px] text-slate-400 block font-normal">Avg / Unit:</span>
                <span className="font-bold">{formatCurrency(totalQuantity > 0 ? grandTotalPrice / totalQuantity : 0)}</span>
              </td>
              {tableMode === 'both' && (
                <td className="py-3 px-3 text-right font-mono text-slate-300 font-bold">
                  {formatCurrency(grandTotalCost)}
                </td>
              )}
              <td className="py-3 px-3.5 text-right font-mono bg-cyan-950/40">
                <span className="text-base font-extrabold text-cyan-300 block">
                  {formatCurrency(grandTotalPrice)}
                </span>
                {tableMode === 'both' && (
                  <span className="text-[10px] text-emerald-400 block font-normal">
                    Profit: +{formatCurrency(totalProfit)} ({totalMargin.toFixed(0)}%)
                  </span>
                )}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {internalPreview && (
        <ImageModal
          isOpen={true}
          onClose={() => setInternalPreview(null)}
          imageUrl={internalPreview.url}
          title={`Part: ${internalPreview.title}`}
          subtitle={`Job #${quote.jobNumber}: ${quote.jobName}`}
        />
      )}
    </div>
  );
};

export default JobPartsTable;
