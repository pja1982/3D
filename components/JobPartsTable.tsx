import React, { useState } from 'react';
import type { Quote, QuotePartConfig, Filament, Printer } from '../types';
import { calculatePrinterRates } from '../utils/printerRates';
import ImageModal from './ImageModal';

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

  const handleImageClick = (url: string, partName: string) => {
    if (onOpenPhotoModal) {
      onOpenPhotoModal(url, `Part: ${partName}`);
    } else {
      setInternalPreview({ url, title: partName });
    }
  };

  // Resolve parts list (handling both multi-part and legacy single-part quotes)
  const parts: QuotePartConfig[] = (quote.parts && quote.parts.length > 0)
    ? quote.parts
    : [
        {
          id: 'part-primary',
          name: quote.jobName || 'Primary Part',
          quantity: 1,
          quantityRequired: 1,
          filamentGrams: quote.parameters?.filamentGrams ?? 0,
          filamentId: quote.parameters?.filamentId ?? null,
          printHours: quote.parameters?.printHours ?? 0,
          printerId: quote.parameters?.printerId ?? null,
          postProcessingHours: quote.parameters?.postProcessingHours ?? 0,
          hardwareCost: quote.parameters?.hardwareCost ?? 0,
          colors: quote.parameters?.colors,
        },
      ];

  // Calculate direct cost for each part
  const partCostItems = parts.map((part) => {
    const qty = Math.max(1, part.quantity || 1);
    const qtyRequired = part.quantityRequired !== undefined ? part.quantityRequired : qty;

    // 1. Material cost
    let unitMaterialCost = 0;
    if (part.colors && part.colors.length > 0) {
      unitMaterialCost = part.colors.reduce((sum, c) => {
        const fil = filaments.find((f) => f.id === c.filamentId);
        return sum + ((c.grams || 0) / 1000) * (fil?.costPerKg || 0);
      }, 0);
    } else {
      const fil = filaments.find((f) => f.id === part.filamentId);
      unitMaterialCost = ((part.filamentGrams || 0) / 1000) * (fil?.costPerKg || 0);
    }

    // 2. Machine & electricity
    const printer = printers.find((p) => p.id === part.printerId);
    const printerWatts = printer?.watts || 0;
    const printerRates = calculatePrinterRates(printer);
    const kwhRate = quote.parameters?.electricityCostKwh ?? 0.15;

    const unitElectricity = (part.printHours || 0) * (printerWatts / 1000) * kwhRate;
    const unitMachineDepreciation = (part.printHours || 0) * (printerRates.totalHourlyRate || 0);

    // 3. Labor & hardware
    const laborRate = quote.parameters?.laborCostPerHour ?? 20;
    const unitLabor = (part.postProcessingHours || 0) * laborRate;
    const unitHardware = part.hardwareCost || 0;

    // 4. Multi-color fee
    let unitMultiColor = 0;
    if (part.colors && part.colors.length > 1) {
      unitMultiColor = 3.0 * (part.colors.length - 1);
    }

    const unitDirectCost =
      unitMaterialCost +
      unitElectricity +
      unitMachineDepreciation +
      unitLabor +
      unitHardware +
      unitMultiColor;

    const totalDirectCost = unitDirectCost * qty;

    return {
      part,
      qty,
      qtyRequired,
      printer,
      unitDirectCost,
      totalDirectCost,
    };
  });

  const sumAllDirectCost = partCostItems.reduce((sum, item) => sum + item.totalDirectCost, 0);
  const targetTotalCost = quote.costBreakdown?.costWithFailureRate ?? sumAllDirectCost;
  const targetTotalPrice = quote.quotePrice ?? (targetTotalCost * (1 + (quote.parameters?.profitMargin || 0) / 100));

  // Compute proportional per unit cost & total cost matching quote totals
  const computedRows = partCostItems.map((item) => {
    let lineTotalCost: number;
    let lineTotalPrice: number;

    if (sumAllDirectCost > 0 && targetTotalCost > 0) {
      const ratio = item.totalDirectCost / sumAllDirectCost;
      lineTotalCost = ratio * targetTotalCost;
      lineTotalPrice = ratio * targetTotalPrice;
    } else {
      const failureRate = quote.parameters?.failureRate || 0;
      const failureMultiplier = failureRate < 100 ? 1 / (1 - failureRate / 100) : 1;
      lineTotalCost = item.unitDirectCost * failureMultiplier * item.qty;
      lineTotalPrice = lineTotalCost * (1 + (quote.parameters?.profitMargin || 0) / 100);
    }

    const perUnitCost = lineTotalCost / item.qty;
    const perUnitPrice = lineTotalPrice / item.qty;

    return {
      ...item,
      perUnitCost,
      lineTotalCost,
      perUnitPrice,
      lineTotalPrice,
    };
  });

  const totalQuantity = computedRows.reduce((sum, r) => sum + r.qty, 0);
  const totalQuantityRequired = computedRows.reduce((sum, r) => sum + r.qtyRequired, 0);
  const grandTotalCost = computedRows.reduce((sum, r) => sum + r.lineTotalCost, 0);
  const grandTotalPrice = computedRows.reduce((sum, r) => sum + r.lineTotalPrice, 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between border-b border-slate-700/80 pb-2">
        <div className="flex items-center gap-2">
          <h4 className="font-semibold text-cyan-400 text-base">{title}</h4>
          <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full border border-slate-700">
            {parts.length} {parts.length === 1 ? 'part' : 'parts'}
          </span>
        </div>
        <div className="text-xs text-slate-400 flex items-center gap-3">
          <span>Total Units: <strong className="text-slate-200">{totalQuantity}</strong></span>
          <span>•</span>
          <span>Required: <strong className="text-cyan-300">{totalQuantityRequired}</strong></span>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-700/80 shadow-md">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="bg-slate-800/90 text-slate-300 border-b border-slate-700 text-xs uppercase tracking-wider font-semibold">
              <th scope="col" className="py-3 px-3.5">The Part</th>
              <th scope="col" className="py-3 px-3 text-center">Quantity</th>
              <th scope="col" className="py-3 px-3 text-center">Quantity Required</th>
              <th scope="col" className="py-3 px-3 text-right">Per Unit Cost</th>
              <th scope="col" className="py-3 px-3 text-right">Total Cost</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/60 bg-slate-900/60">
            {computedRows.map(({ part, qty, qtyRequired, printer, perUnitCost, lineTotalCost, perUnitPrice, lineTotalPrice }, idx) => {
              const filament = filaments.find((f) => f.id === part.filamentId);
              const isMultiColor = Boolean(part.colors && part.colors.length > 1);

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
                        <div className="w-10 h-10 rounded-lg bg-slate-800/80 border border-dashed border-slate-700 flex items-center justify-center flex-shrink-0 text-slate-500">
                          <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                          </svg>
                        </div>
                      )}

                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-100 text-sm truncate">{part.name}</span>
                          <span className="text-[10px] text-slate-400 font-mono">#{idx + 1}</span>
                        </div>

                        {/* Part Specifications & Metadata */}
                        <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-400 pt-0.5">
                          {/* Material */}
                          {isMultiColor && part.colors ? (
                            <span className="inline-flex items-center gap-1 bg-purple-950/60 border border-purple-800/50 text-purple-300 text-[11px] px-1.5 py-0.5 rounded font-medium">
                              🎨 Multi-Color ({part.colors.length})
                            </span>
                          ) : filament ? (
                            <span className="inline-flex items-center gap-1 bg-slate-800 border border-slate-700 text-slate-300 text-[11px] px-1.5 py-0.5 rounded">
                              {filament.colorHex && (
                                <span
                                  className="w-2 h-2 rounded-full border border-slate-600 flex-shrink-0"
                                  style={{ backgroundColor: filament.colorHex }}
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
                          {part.hardwareCost > 0 && (
                            <span className="text-[11px] text-slate-400">
                              🔩 {formatCurrency(part.hardwareCost)}
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
                                    className="w-1.5 h-1.5 rounded-full"
                                    style={{ backgroundColor: fil?.colorHex || '#94a3b8' }}
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
                  <td className="py-3 px-3 align-middle text-right whitespace-nowrap font-mono">
                    <span className="text-sm font-semibold text-slate-200 block">
                      {formatCurrency(perUnitCost)}
                    </span>
                    {showPricingDetails && (
                      <span className="text-[11px] text-slate-400 block font-sans">
                        Price: <strong className="text-cyan-400">{formatCurrency(perUnitPrice)}</strong>
                      </span>
                    )}
                  </td>

                  {/* Total Cost */}
                  <td className="py-3 px-3 align-middle text-right whitespace-nowrap font-mono">
                    <span className="text-sm font-bold text-slate-100 block">
                      {formatCurrency(lineTotalCost)}
                    </span>
                    {showPricingDetails && (
                      <span className="text-[11px] text-slate-400 block font-sans">
                        Price: <strong className="text-cyan-400 font-semibold">{formatCurrency(lineTotalPrice)}</strong>
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
                <div className="flex items-center gap-2">
                  <span className="uppercase tracking-wider text-slate-400">Total ({parts.length} {parts.length === 1 ? 'part' : 'parts'})</span>
                </div>
              </td>
              <td className="py-3 px-3 text-center font-mono font-bold text-slate-200">
                {totalQuantity}
              </td>
              <td className="py-3 px-3 text-center font-mono font-bold text-emerald-300">
                {totalQuantityRequired}
              </td>
              <td className="py-3 px-3 text-right font-mono text-slate-400">
                <span className="text-[11px] uppercase tracking-wider block">Line Totals:</span>
              </td>
              <td className="py-3 px-3 text-right font-mono">
                <span className="text-sm font-bold text-slate-100 block">
                  {formatCurrency(grandTotalCost)}
                </span>
                {showPricingDetails && (
                  <span className="text-[11px] text-cyan-400 block font-sans font-normal">
                    Quote: <strong>{formatCurrency(grandTotalPrice)}</strong>
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
