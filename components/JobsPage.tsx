import React, { useState } from 'react';
import type { Quote, Filament, Printer, Order } from '../types';
import { QuoteStatus } from '../types';
import TrashIcon from './icons/TrashIcon';
import CheckIcon from './icons/CheckIcon';
import XIcon from './icons/XIcon';
import SaveIcon from './icons/SaveIcon';
import ChevronDownIcon from './icons/ChevronDownIcon';
import CreateOrderIcon from './icons/CreateOrderIcon';

interface JobsPageProps {
  quotes: Quote[];
  filaments: Filament[];
  printers: Printer[];
  orders: Order[];
  onDelete: (id: string) => void;
  onUpdateStatus: (id: string, status: QuoteStatus) => void;
  onCreateOrder: (quoteId: string) => void;
}

const statusColors: Record<QuoteStatus, string> = {
  [QuoteStatus.Pending]: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  [QuoteStatus.Accepted]: 'bg-green-500/20 text-green-300 border-green-500/30',
  [QuoteStatus.Rejected]: 'bg-red-500/20 text-red-300 border-red-500/30',
};

const formatCurrency = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString();

const DetailItem: React.FC<{ label: string; value: string | number }> = ({ label, value }) => (
  <div className="flex justify-between text-sm py-1">
    <span className="text-slate-400">{label}:</span>
    <span className="font-medium text-slate-200 text-right">{value}</span>
  </div>
);

const QuoteDetailView: React.FC<{ quote: Quote; filaments: Filament[]; printers: Printer[] }> = ({ quote, filaments, printers }) => {
    const { parameters, costBreakdown, parts } = quote;

    const formatHours = (hours: number) => {
      const h = Math.floor(hours);
      const m = Math.round((hours - h) * 60);
      if (h > 0 && m > 0) return `${h}h ${m}m`;
      if (h > 0) return `${h}h`;
      return `${m}m`;
    };

    // Render detailed multi-part grid if parts are stored inside the quote
    if (parts && parts.length > 0) {
      return (
        <div className="bg-slate-900/60 p-5 space-y-6">
          <div>
            <h4 className="font-semibold text-cyan-400 text-lg mb-3 border-b border-slate-700 pb-1">Quote Parts ({parts.length})</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {parts.map((part, idx) => {
                const filament = filaments.find(f => f.id === part.filamentId);
                const printer = printers.find(p => p.id === part.printerId);
                return (
                  <div key={part.id || idx} className="bg-slate-800/40 border border-slate-700/80 rounded-xl p-4 space-y-2 hover:border-slate-600 transition">
                    <div className="flex justify-between items-center border-b border-slate-700 pb-1.5 mb-2">
                      <span className="font-bold text-slate-100 truncate">{part.name}</span>
                      <span className="px-2 py-0.5 text-xs font-semibold rounded bg-slate-700/80 text-slate-300">
                        Qty: {part.quantity}
                      </span>
                    </div>
                    <DetailItem label="Filament" value={filament ? `${filament.brand} - ${filament.name}` : 'N/A'} />
                    <DetailItem label="Weight per unit" value={`${part.filamentGrams}g (total: ${part.filamentGrams * part.quantity}g)`} />
                    <DetailItem label="Printer" value={printer ? `${printer.brand} - ${printer.name}` : 'N/A'} />
                    <DetailItem label="Print Time" value={`${formatHours(part.printHours)} (total: ${formatHours(part.printHours * part.quantity)})`} />
                    <DetailItem label="Post-Processing" value={`${formatHours(part.postProcessingHours)} (total: ${formatHours(part.postProcessingHours * part.quantity)})`} />
                    <DetailItem label="Hardware Cost" value={`${formatCurrency(part.hardwareCost)} (total: ${formatCurrency(part.hardwareCost * part.quantity)})`} />
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-cyan-400 text-base mb-2 border-b border-slate-700 pb-1">Financial Summary</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-8 gap-y-2">
              <div>
                <DetailItem label="Subtotal (All Parts)" value={formatCurrency(costBreakdown.subtotal)} />
              </div>
              <div>
                <DetailItem label="Failure Adj." value={`${formatCurrency(costBreakdown.costWithFailureRate - costBreakdown.subtotal)} (${parameters.failureRate}%)`} />
              </div>
              <div>
                <DetailItem label="Profit" value={`${formatCurrency(costBreakdown.profit)} (${parameters.profitMargin}%)`} />
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Fallback/Legacy Single-Part Quote View
    const filament = filaments.find(f => f.id === parameters.filamentId);
    const printer = printers.find(p => p.id === parameters.printerId);

    return (
      <div className="bg-slate-900/50 p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4">
        <div>
          <h4 className="font-semibold text-cyan-400 text-base mb-2 border-b border-slate-700 pb-1">Material</h4>
          <DetailItem label="Filament" value={filament ? `${filament.brand} - ${filament.name}` : 'N/A (Deleted)'} />
          <DetailItem label="Weight" value={`${parameters.filamentGrams} g`} />
          <DetailItem label="Material Cost" value={formatCurrency(costBreakdown.filamentCost)} />
        </div>

        <div>
          <h4 className="font-semibold text-cyan-400 text-base mb-2 border-b border-slate-700 pb-1">Machine & Time</h4>
          <DetailItem label="Printer" value={printer ? `${printer.brand} - ${printer.name}` : 'N/A (Deleted)'} />
          <DetailItem label="Print Time" value={formatHours(parameters.printHours)} />
          <DetailItem label="Electricity Cost" value={formatCurrency(costBreakdown.electricityCost)} />
        </div>
        
        <div>
          <h4 className="font-semibold text-cyan-400 text-base mb-2 border-b border-slate-700 pb-1">Labor & Other</h4>
          <DetailItem label="Post-Processing" value={formatHours(parameters.postProcessingHours)} />
          <DetailItem label="Labor Cost" value={formatCurrency(costBreakdown.laborCost)} />
          <DetailItem label="Hardware Cost" value={formatCurrency(parameters.hardwareCost)} />
        </div>

        <div className="md:col-span-2 lg:col-span-3">
            <h4 className="font-semibold text-cyan-400 text-base mb-2 border-b border-slate-700 pb-1 mt-2">Financial Summary</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-8">
              <div>
                <DetailItem label="Subtotal" value={formatCurrency(costBreakdown.subtotal)} />
              </div>
              <div>
                <DetailItem label="Failure Adj." value={`${formatCurrency(costBreakdown.costWithFailureRate - costBreakdown.subtotal)} (${parameters.failureRate}%)`} />
              </div>
              <div>
                <DetailItem label="Profit" value={`${formatCurrency(costBreakdown.profit)} (${parameters.profitMargin}%)`} />
              </div>
            </div>
        </div>
      </div>
    );
};


const JobsPage: React.FC<JobsPageProps> = ({ quotes, filaments, printers, orders, onDelete, onUpdateStatus, onCreateOrder }) => {
  const [expandedQuoteId, setExpandedQuoteId] = useState<string | null>(null);

  const handleToggleExpand = (quoteId: string) => {
      setExpandedQuoteId(prevId => prevId === quoteId ? null : quoteId);
  };
  
  const handleExportCSV = () => {
    if (quotes.length === 0) return;

    const headers = ["Job #", "Job Name", "Customer Name", "Date", "Price", "Status"];
    
    const escapeCsvField = (field: any): string => {
      const stringField = String(field);
      if (/[",\n\r]/.test(stringField)) {
        return `"${stringField.replace(/"/g, '""')}"`;
      }
      return stringField;
    };

    const csvRows = quotes.map(q => 
      [
        q.jobNumber,
        escapeCsvField(q.jobName),
        escapeCsvField(q.customerName),
        new Date(q.createdAt).toISOString().split('T')[0],
        q.quotePrice,
        q.status
      ].join(',')
    );

    const csvString = [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    const url = URL.createObjectURL(blob);
    const today = new Date().toISOString().split('T')[0];
    link.setAttribute('href', url);
    link.setAttribute('download', `quotes_export_${today}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mt-8">
      <div className="bg-slate-800/50 p-6 rounded-2xl shadow-lg border border-slate-700">
        <div className="flex justify-between items-center border-b border-slate-600 pb-2 mb-6">
          <h2 className="text-2xl font-semibold text-cyan-400">
            Saved Jobs & Quotes
          </h2>
          {quotes.length > 0 && (
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-slate-300 font-semibold py-2 px-4 rounded-lg transition-colors text-sm"
              title="Export all jobs to a CSV file"
            >
              <SaveIcon className="w-4 h-4" />
              <span>Export to CSV</span>
            </button>
          )}
        </div>

        {quotes.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            <h3 className="text-xl font-semibold">No Jobs Found</h3>
            <p className="mt-2">Use the calculator to create a quote and save it as a new job.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="text-xs text-slate-400 uppercase bg-slate-800">
                <tr>
                  <th scope="col" className="px-2 py-3 w-12"><span className="sr-only">Details</span></th>
                  <th scope="col" className="px-6 py-3">Job #</th>
                  <th scope="col" className="px-6 py-3">Job Name</th>
                  <th scope="col" className="px-6 py-3">Customer</th>
                  <th scope="col" className="px-6 py-3">Date</th>
                  <th scope="col" className="px-6 py-3">Price</th>
                  <th scope="col" className="px-6 py-3">Status</th>
                  <th scope="col" className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {quotes.map(quote => {
                  const orderExists = orders.some(o => o.quoteId === quote.id);
                  return (
                  <React.Fragment key={quote.id}>
                    <tr 
                      className={`border-b border-slate-700 transition-colors cursor-pointer ${expandedQuoteId === quote.id ? 'bg-slate-700/80' : 'hover:bg-slate-700/50'}`}
                      onClick={() => handleToggleExpand(quote.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleToggleExpand(quote.id)}
                      aria-expanded={expandedQuoteId === quote.id}
                    >
                      <td className="px-2 py-4 text-center">
                        <ChevronDownIcon className={`w-5 h-5 text-slate-400 transition-transform ${expandedQuoteId === quote.id ? 'rotate-180' : ''}`} />
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-300">#{quote.jobNumber}</td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-100">{quote.jobName}</div>
                        {quote.parts && quote.parts.length > 0 ? (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {quote.parts.map((p, idx) => (
                              <span key={p.id || idx} className="bg-slate-900/60 border border-slate-700/80 text-[10px] px-1.5 py-0.5 rounded text-slate-400">
                                {p.name} <span className="text-cyan-400 font-bold">x{p.quantity}</span>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-500 italic">1x Part (Legacy)</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-300">{quote.customerName}</td>
                      <td className="px-6 py-4 text-slate-400">{formatDate(quote.createdAt)}</td>
                      <td className="px-6 py-4 font-mono text-cyan-400">{formatCurrency(quote.quotePrice)}</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${statusColors[quote.status]}`}>
                          {quote.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                       <div className="flex items-center justify-end gap-2" onClick={e => e.stopPropagation()}>
                          {quote.status === QuoteStatus.Accepted && !orderExists && (
                              <button onClick={() => onCreateOrder(quote.id)} className="p-1.5 rounded-full bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-300 transition-colors" title="Create Order"><CreateOrderIcon className="w-4 h-4" /></button>
                          )}
                          <button onClick={() => onUpdateStatus(quote.id, QuoteStatus.Accepted)} className="p-1.5 rounded-full bg-green-500/20 hover:bg-green-500/40 text-green-300 transition-colors" title="Accept"><CheckIcon className="w-4 h-4" /></button>
                          <button onClick={() => onUpdateStatus(quote.id, QuoteStatus.Rejected)} className="p-1.5 rounded-full bg-red-500/20 hover:bg-red-500/40 text-red-300 transition-colors" title="Reject"><XIcon className="w-4 h-4" /></button>
                          <button onClick={() => onDelete(quote.id)} className="p-1.5 rounded-full bg-slate-600 hover:bg-red-500/40 text-slate-300 hover:text-red-300 transition-colors" title="Delete"><TrashIcon className="w-4 h-4" /></button>
                       </div>
                      </td>
                    </tr>
                    {expandedQuoteId === quote.id && (
                      <tr className="bg-slate-800 border-b border-slate-700">
                        <td colSpan={8} className="p-0">
                          <QuoteDetailView quote={quote} filaments={filaments} printers={printers} />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                )})}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default JobsPage;