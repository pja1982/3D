import React, { useState } from 'react';
import type { Quote, Filament, Printer, Order } from '../types';
import { QuoteStatus } from '../types';
import TrashIcon from './icons/TrashIcon';
import CheckIcon from './icons/CheckIcon';
import XIcon from './icons/XIcon';
import SaveIcon from './icons/SaveIcon';
import ChevronDownIcon from './icons/ChevronDownIcon';
import CreateOrderIcon from './icons/CreateOrderIcon';
import PencilIcon from './icons/PencilIcon';
import ReviseIcon from './icons/ReviseIcon';
import MarkdownIcon from './icons/MarkdownIcon';
import PhotoIcon from './icons/PhotoIcon';
import ArchiveIcon from './icons/ArchiveIcon';
import RestoreIcon from './icons/RestoreIcon';
import PrinterIcon from './icons/PrinterIcon';
import ClipboardCheckIcon from './icons/ClipboardCheckIcon';
import ImageModal from './ImageModal';
import JobPartsTable from './JobPartsTable';
import PrintDocumentModal from './PrintDocumentModal';
import type { GeneralSettings } from '../types';
import { 
  generateJobMarkdown, 
  generateAllJobsMarkdown, 
  generateInvoiceMarkdown, 
  generateAllInvoicesMarkdown, 
  downloadMarkdownFile, 
  copyMarkdownToClipboard 
} from '../utils/markdownExport';

interface JobsPageProps {
  quotes: Quote[];
  filaments: Filament[];
  printers: Printer[];
  orders: Order[];
  onDelete: (id: string) => void;
  onUpdateStatus: (id: string, status: QuoteStatus) => void;
  onCreateOrder: (quoteId: string) => void;
  onUpdatePrice?: (id: string, newPrice: number) => void;
  onReviseQuote: (quote: Quote) => void;
  onUseAsTemplate?: (quote: Quote) => void;
  onOpenGoogleSheets?: () => void;
  onArchive?: (id: string, archive: boolean) => void;
  generalSettings?: GeneralSettings;
  onUpdateGeneralSettings?: (settings: Partial<GeneralSettings>) => void;
  onUpdateQuote?: (quote: Quote) => void;
}

const statusColors: Record<QuoteStatus, string> = {
  [QuoteStatus.Pending]: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  [QuoteStatus.Accepted]: 'bg-green-500/20 text-green-300 border-green-500/30',
  [QuoteStatus.Rejected]: 'bg-red-500/20 text-red-300 border-red-500/30',
};

const formatCurrency = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString();

const DetailItem: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="flex justify-between text-sm py-1">
    <span className="text-slate-400">{label}:</span>
    <span className="font-medium text-slate-200 text-right">{value}</span>
  </div>
);

const QuoteDetailView: React.FC<{ 
  quote: Quote; 
  filaments: Filament[]; 
  printers: Printer[]; 
  onReviseQuote?: (quote: Quote) => void;
  onUseAsTemplate?: (quote: Quote) => void;
  onArchive?: (id: string, archive: boolean) => void;
  onPrint?: (quote: Quote, docType: 'quote' | 'checklist') => void;
}> = ({ quote, filaments, printers, onReviseQuote, onUseAsTemplate, onArchive, onPrint }) => {
    const [copied, setCopied] = useState(false);
    const [copiedInvoice, setCopiedInvoice] = useState(false);
    const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);
    const { parameters, costBreakdown } = quote;

    const costWithFailure = costBreakdown.costWithFailureRate;
    const actualProfit = quote.quotePrice - costWithFailure;
    const actualProfitMargin = costWithFailure > 0 
      ? ((actualProfit / costWithFailure) * 100) 
      : 0;

    return (
      <div className="bg-slate-900/60 p-5 space-y-6">
        {/* Expanded Job Parts Table */}
        <JobPartsTable
          quote={quote}
          filaments={filaments}
          printers={printers}
          onOpenPhotoModal={(url, title) => setPreviewImage({ url, title })}
          title={`Job #${quote.jobNumber} Parts Table`}
        />

        {/* Financial Summary */}
        <div>
          <h4 className="font-semibold text-cyan-400 text-base mb-2 border-b border-slate-700 pb-1">Financial Summary</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-2">
            <div>
              <DetailItem label="Subtotal (All Parts)" value={formatCurrency(costBreakdown.subtotal)} />
            </div>
            <div>
              <DetailItem label="Failure Adj." value={`${formatCurrency(costBreakdown.costWithFailureRate - costBreakdown.subtotal)} (${costBreakdown.effectiveFailureRate ?? parameters.failureRate}%${costBreakdown.materialRiskApplied ? ' ⚡' : ''})`} />
            </div>
            <div>
              <DetailItem label="Total Cost" value={formatCurrency(costWithFailure)} />
            </div>
            <div>
              <DetailItem 
                label="Profit" 
                value={`${formatCurrency(actualProfit)} (${actualProfitMargin >= 0 ? '+' : ''}${actualProfitMargin.toFixed(1)}%)`} 
              />
            </div>
            {costBreakdown.printerCost !== undefined && (
              <div className="sm:col-span-2">
                <DetailItem 
                  label="⏱️ Printer Time & Depreciation" 
                  value={
                    <span>
                      {formatCurrency(costBreakdown.printerCost)}
                      {((costBreakdown.printerDepreciationCost ?? 0) > 0 || (costBreakdown.printerMaintenanceCost ?? 0) > 0) && (
                        <span className="text-xs text-slate-400 ml-1 font-normal">
                          (dep: {formatCurrency(costBreakdown.printerDepreciationCost || 0)}, maint: {formatCurrency(costBreakdown.printerMaintenanceCost || 0)})
                        </span>
                      )}
                    </span>
                  } 
                />
              </div>
            )}
            {Boolean(costBreakdown.multiColorFee && costBreakdown.multiColorFee > 0) && (
              <div className="sm:col-span-2">
                <DetailItem 
                  label="🎨 Multi-Color Fee Included" 
                  value={
                    <span className="flex items-center gap-1.5 flex-wrap">
                      <span>{formatCurrency(costBreakdown.multiColorFee || 0)}</span>
                      {costBreakdown.multiColorBatchMode === 'different_plates' ? (
                        <span className="text-xs text-cyan-300 font-normal bg-cyan-950/70 border border-cyan-500/50 px-2 py-0.5 rounded-full">
                          🥞 Different Build Plates ({costBreakdown.multiColorBedCount || 1} {((costBreakdown.multiColorBedCount || 1) === 1) ? 'plate' : 'plates'})
                          {costBreakdown.multiColorSavedFee ? ` • Saved ${formatCurrency(costBreakdown.multiColorSavedFee)}` : ''}
                        </span>
                      ) : costBreakdown.multiColorBatchMode === 'single_batch_per_bed' ? (
                        <span className="text-xs text-purple-300 font-normal bg-purple-950/70 border border-purple-600/40 px-2 py-0.5 rounded-full">
                          Single Bed Batch ({costBreakdown.multiColorBedCount || 1} {((costBreakdown.multiColorBedCount || 1) === 1) ? 'plate' : 'plates'})
                          {costBreakdown.multiColorSavedFee ? ` • Saved ${formatCurrency(costBreakdown.multiColorSavedFee)}` : ''}
                        </span>
                      ) : null}
                    </span>
                  } 
                />
              </div>
            )}
          </div>
        </div>

        {/* Actions & Obsidian Markdown Exports */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-700/60">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const cleanName = quote.jobName.replace(/[^a-zA-Z0-9_-]/g, '_');
                downloadMarkdownFile(`Job_${quote.jobNumber}_${cleanName}.md`, generateJobMarkdown(quote, filaments, printers));
              }}
              className="flex items-center gap-1.5 bg-purple-700 hover:bg-purple-600 text-purple-100 font-semibold py-1.5 px-3 rounded-lg text-xs shadow transition-colors"
              title="Download this job as an Obsidian Markdown note (.md)"
            >
              <MarkdownIcon className="w-3.5 h-3.5" />
              <span>Export Job (.md)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                const cleanName = quote.jobName.replace(/[^a-zA-Z0-9_-]/g, '_');
                downloadMarkdownFile(`Invoice_${quote.jobNumber}_${cleanName}.md`, generateInvoiceMarkdown(quote, filaments, printers));
              }}
              className="flex items-center gap-1.5 bg-indigo-700 hover:bg-indigo-600 text-indigo-100 font-semibold py-1.5 px-3 rounded-lg text-xs shadow transition-colors"
              title="Download formatted customer invoice as an Obsidian Markdown note (.md) linking to parts/"
            >
              <span>🧾 Export Invoice (.md)</span>
            </button>
            <button
              type="button"
              onClick={async () => {
                const ok = await copyMarkdownToClipboard(generateJobMarkdown(quote, filaments, printers));
                if (ok) {
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }
              }}
              className="flex items-center gap-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium py-1.5 px-3 rounded-lg text-xs transition"
              title="Copy Obsidian Markdown to clipboard"
            >
              <span>{copied ? '✓ Copied Job!' : 'Copy Job'}</span>
            </button>
            <button
              type="button"
              onClick={async () => {
                const ok = await copyMarkdownToClipboard(generateInvoiceMarkdown(quote, filaments, printers));
                if (ok) {
                  setCopiedInvoice(true);
                  setTimeout(() => setCopiedInvoice(false), 2000);
                }
              }}
              className="flex items-center gap-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium py-1.5 px-3 rounded-lg text-xs transition"
              title="Copy Invoice Markdown to clipboard"
            >
              <span>{copiedInvoice ? '✓ Copied Invoice!' : 'Copy Invoice'}</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onPrint && (
              <>
                <button
                  type="button"
                  onClick={() => onPrint(quote, 'quote')}
                  className="flex items-center gap-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold py-1.5 px-3 rounded-lg text-xs shadow transition-colors cursor-pointer"
                  title="Print Customer Quote or Invoice to PDF or physical paper"
                >
                  <PrinterIcon className="w-3.5 h-3.5" />
                  <span>Print Quote (PDF)</span>
                </button>
                <button
                  type="button"
                  onClick={() => onPrint(quote, 'checklist')}
                  className="flex items-center gap-1.5 bg-purple-700 hover:bg-purple-600 text-purple-100 font-semibold py-1.5 px-3 rounded-lg text-xs shadow transition-colors cursor-pointer"
                  title="Print Workshop Fabrication Checklist & Tracking Traveler to PDF or paper"
                >
                  <ClipboardCheckIcon className="w-3.5 h-3.5" />
                  <span>Print Checklist (PDF)</span>
                </button>
              </>
            )}
            {onUseAsTemplate && (
              <button
                onClick={() => onUseAsTemplate(quote)}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-1.5 px-3 rounded-lg text-xs shadow transition-colors"
                title="Load quote settings into Calculator as a new draft template"
              >
                <span>📋 Use as Template</span>
              </button>
            )}
            {onReviseQuote && (
              <button
                onClick={() => onReviseQuote(quote)}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-1.5 px-3 rounded-lg text-xs shadow transition-colors cursor-pointer"
                title="Update and revise this existing quote"
              >
                <ReviseIcon className="w-3.5 h-3.5" />
                <span>Revise Quote</span>
              </button>
            )}
            {onArchive && (
              <button
                onClick={() => onArchive(quote.id, !quote.isArchived)}
                className={`flex items-center gap-1.5 font-semibold py-1.5 px-3 rounded-lg text-xs shadow transition-colors cursor-pointer ${
                  quote.isArchived
                    ? 'bg-amber-600 hover:bg-amber-500 text-white'
                    : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                }`}
                title={quote.isArchived ? "Restore this quote to active jobs" : "Archive this quote to remove from active list"}
              >
                {quote.isArchived ? <RestoreIcon className="w-3.5 h-3.5" /> : <ArchiveIcon className="w-3.5 h-3.5" />}
                <span>{quote.isArchived ? 'Restore to Active' : 'Archive Job'}</span>
              </button>
            )}
          </div>
        </div>

        {previewImage && (
          <ImageModal
            isOpen={true}
            onClose={() => setPreviewImage(null)}
            imageUrl={previewImage.url}
            title={`Part: ${previewImage.title}`}
            subtitle={`Job #${quote.jobNumber}: ${quote.jobName}`}
          />
        )}
      </div>
    );
};


const JobsPage: React.FC<JobsPageProps> = ({ 
  quotes, 
  filaments, 
  printers, 
  orders, 
  onDelete, 
  onUpdateStatus, 
  onCreateOrder, 
  onUpdatePrice, 
  onReviseQuote, 
  onUseAsTemplate, 
  onOpenGoogleSheets,
  onArchive,
  generalSettings,
  onUpdateGeneralSettings,
  onUpdateQuote,
}) => {
  const [expandedQuoteId, setExpandedQuoteId] = useState<string | null>(null);
  const [editingPriceQuoteId, setEditingPriceQuoteId] = useState<string | null>(null);
  const [tempPrice, setTempPrice] = useState<string>('');
  const [archiveFilter, setArchiveFilter] = useState<'active' | 'archived' | 'all'>('active');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [printModalState, setPrintModalState] = useState<{
    isOpen: boolean;
    quote: Quote | null;
    docType: 'quote' | 'checklist';
  }>({
    isOpen: false,
    quote: null,
    docType: 'quote',
  });

  const activeCount = quotes.filter(q => !q.isArchived).length;
  const archivedCount = quotes.filter(q => q.isArchived).length;
  const totalCount = quotes.length;

  const displayQuotes = quotes.filter(q => {
    if (archiveFilter === 'active' && q.isArchived) return false;
    if (archiveFilter === 'archived' && !q.isArchived) return false;
    if (searchQuery.trim()) {
      const qLower = searchQuery.toLowerCase();
      const matchName = q.jobName.toLowerCase().includes(qLower);
      const matchCustomer = q.customerName.toLowerCase().includes(qLower);
      const matchNum = q.jobNumber.toString().includes(qLower);
      if (!matchName && !matchCustomer && !matchNum) return false;
    }
    return true;
  });

  const handleStartEditPrice = (quote: Quote, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingPriceQuoteId(quote.id);
    setTempPrice(quote.quotePrice.toString());
  };

  const handleSavePrice = (quoteId: string, e?: React.MouseEvent | React.KeyboardEvent) => {
    if (e) e.stopPropagation();
    const parsed = parseFloat(tempPrice);
    if (!isNaN(parsed) && parsed >= 0 && onUpdatePrice) {
      onUpdatePrice(quoteId, parseFloat(parsed.toFixed(2)));
    }
    setEditingPriceQuoteId(null);
  };

  const handleCancelEditPrice = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingPriceQuoteId(null);
  };

  const handleToggleExpand = (quoteId: string) => {
      setExpandedQuoteId(prevId => prevId === quoteId ? null : quoteId);
  };
  
  const handleExportCSV = () => {
    const listToExport = displayQuotes.length > 0 ? displayQuotes : quotes;
    if (listToExport.length === 0) return;

    const headers = ["Job #", "Job Name", "Customer Name", "Date", "Price", "Status", "Archived"];
    
    const escapeCsvField = (field: any): string => {
      const stringField = String(field);
      if (/[",\n\r]/.test(stringField)) {
        return `"${stringField.replace(/"/g, '""')}"`;
      }
      return stringField;
    };

    const csvRows = listToExport.map(q => 
      [
        q.jobNumber,
        escapeCsvField(q.jobName),
        escapeCsvField(q.customerName),
        new Date(q.createdAt).toISOString().split('T')[0],
        q.quotePrice,
        q.status,
        q.isArchived ? 'Yes' : 'No'
      ].join(',')
    );

    const csvString = [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    const url = URL.createObjectURL(blob);
    const today = new Date().toISOString().split('T')[0];
    link.setAttribute('href', url);
    link.setAttribute('download', `quotes_${archiveFilter}_${today}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportAllMarkdown = () => {
    const listToExport = displayQuotes.length > 0 ? displayQuotes : quotes;
    if (listToExport.length === 0) return;
    const today = new Date().toISOString().split('T')[0];
    const md = generateAllJobsMarkdown(listToExport, filaments, printers);
    downloadMarkdownFile(`3D_Print_Jobs_${archiveFilter}_${today}.md`, md);
  };

  const handleExportAllInvoicesMarkdown = () => {
    const listToExport = displayQuotes.length > 0 ? displayQuotes : quotes;
    if (listToExport.length === 0) return;
    const today = new Date().toISOString().split('T')[0];
    const md = generateAllInvoicesMarkdown(listToExport, filaments, printers);
    downloadMarkdownFile(`3D_Print_Invoices_${archiveFilter}_${today}.md`, md);
  };

  return (
    <div className="mt-8">
      <div className="bg-slate-800/50 p-6 rounded-2xl shadow-lg border border-slate-700">
        <div className="flex flex-wrap justify-between items-center gap-3 border-b border-slate-600 pb-3 mb-6">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-semibold text-cyan-400">
              Saved Jobs & Quotes
            </h2>
            <span className="text-xs text-slate-400 bg-slate-800 px-2.5 py-1 rounded-full border border-slate-700">
              {displayQuotes.length} shown ({activeCount} active{archivedCount > 0 ? `, ${archivedCount} archived` : ''})
            </span>
          </div>

          {quotes.length > 0 && (
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={handleExportAllMarkdown}
                className="flex items-center gap-2 bg-purple-700 hover:bg-purple-600 text-purple-100 font-semibold py-2 px-3.5 rounded-lg transition-colors text-sm shadow-sm"
                title="Export shown jobs as an Obsidian-ready Markdown note (.md)"
              >
                <MarkdownIcon className="w-4 h-4" />
                <span>Export Jobs (.md)</span>
              </button>
              <button
                onClick={handleExportAllInvoicesMarkdown}
                className="flex items-center gap-2 bg-indigo-700 hover:bg-indigo-600 text-indigo-100 font-semibold py-2 px-3.5 rounded-lg transition-colors text-sm shadow-sm"
                title="Export customer invoices for shown jobs as an Obsidian-ready note (.md)"
              >
                <span>🧾 Export Invoices (.md)</span>
              </button>
              {onOpenGoogleSheets && (
                <button
                  onClick={onOpenGoogleSheets}
                  className="flex items-center gap-2 bg-emerald-800 hover:bg-emerald-700 text-emerald-100 font-semibold py-2 px-3.5 rounded-lg transition-colors text-sm shadow-sm"
                  title="Open Google Sheets sync and export tools"
                >
                  <span>📊 Google Sheets</span>
                </button>
              )}
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-slate-300 font-semibold py-2 px-3.5 rounded-lg transition-colors text-sm"
                title="Export shown jobs to a CSV file"
              >
                <SaveIcon className="w-4 h-4" />
                <span>Export to CSV</span>
              </button>
            </div>
          )}
        </div>

        {/* View Filter Tabs & Search Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-6 bg-slate-900/40 p-3 rounded-xl border border-slate-700/60">
          <div className="flex items-center gap-1.5 p-1 bg-slate-800/90 rounded-lg border border-slate-700">
            <button
              type="button"
              onClick={() => setArchiveFilter('active')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                archiveFilter === 'active'
                  ? 'bg-cyan-500 text-slate-950 shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <span>Active Jobs</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${archiveFilter === 'active' ? 'bg-slate-900/30 text-slate-950 font-bold' : 'bg-slate-700 text-slate-300'}`}>
                {activeCount}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setArchiveFilter('archived')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                archiveFilter === 'archived'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <ArchiveIcon className="w-3.5 h-3.5" />
              <span>Archived</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${archiveFilter === 'archived' ? 'bg-slate-900/30 text-slate-950 font-bold' : 'bg-slate-700 text-slate-300'}`}>
                {archivedCount}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setArchiveFilter('all')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                archiveFilter === 'all'
                  ? 'bg-purple-500 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <span>All Jobs</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${archiveFilter === 'all' ? 'bg-purple-900/60 text-purple-200' : 'bg-slate-700 text-slate-300'}`}>
                {totalCount}
              </span>
            </button>
          </div>

          {/* Quick Search */}
          <div className="relative flex-1 max-w-xs">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by job #, name, customer..."
              className="w-full bg-slate-900/90 border border-slate-700 rounded-lg pl-3 pr-8 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 text-xs"
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {quotes.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            <h3 className="text-xl font-semibold">No Jobs Found</h3>
            <p className="mt-2">Use the calculator to create a quote and save it as a new job.</p>
          </div>
        ) : displayQuotes.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            <h3 className="text-xl font-semibold">
              {searchQuery
                ? `No jobs match "${searchQuery}"`
                : archiveFilter === 'archived'
                ? 'No Archived Jobs'
                : 'No Active Jobs Found'}
            </h3>
            <p className="mt-2 text-sm text-slate-400">
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-cyan-400 underline hover:text-cyan-300"
                >
                  Clear search query
                </button>
              ) : archiveFilter === 'archived' ? (
                'Jobs you archive will be kept here safely without cluttering active workflows.'
              ) : (
                'All your jobs are currently archived. Switch to the Archived tab to view or restore them.'
              )}
            </p>
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
                {displayQuotes.map(quote => {
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
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-100">{quote.jobName}</span>
                          {quote.isArchived && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full">
                              🗄️ Archived
                            </span>
                          )}
                        </div>
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
                      <td className="px-6 py-4" onClick={(e) => editingPriceQuoteId === quote.id && e.stopPropagation()}>
                        {editingPriceQuoteId === quote.id ? (
                          <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                            <span className="text-cyan-400 font-mono text-sm">$</span>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={tempPrice}
                              onChange={(e) => setTempPrice(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSavePrice(quote.id, e);
                                if (e.key === 'Escape') {
                                  e.stopPropagation();
                                  setEditingPriceQuoteId(null);
                                }
                              }}
                              className="w-24 bg-slate-900 border border-cyan-500 rounded px-2 py-1 text-cyan-300 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-cyan-400"
                              autoFocus
                            />
                            <button
                              onClick={(e) => handleSavePrice(quote.id, e)}
                              className="p-1 rounded bg-cyan-600/40 hover:bg-cyan-600/70 text-cyan-200 transition"
                              title="Save price"
                            >
                              <CheckIcon className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={handleCancelEditPrice}
                              className="p-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 transition"
                              title="Cancel"
                            >
                              <XIcon className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 group">
                            <span className="font-mono text-cyan-400 font-semibold">{formatCurrency(quote.quotePrice)}</span>
                            {onUpdatePrice && (
                              <button
                                onClick={(e) => handleStartEditPrice(quote, e)}
                                className="opacity-0 group-hover:opacity-100 hover:text-cyan-300 text-slate-400 p-1 rounded transition"
                                title="Edit Quoted Price"
                              >
                                <PencilIcon className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        )}
                      </td>
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
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setPrintModalState({ isOpen: true, quote, docType: 'quote' });
                            }}
                            className="p-1.5 rounded-full bg-cyan-500/20 hover:bg-cyan-500/40 text-cyan-300 transition-colors cursor-pointer"
                            title="Print Customer Quote (PDF or Paper)"
                          >
                            <PrinterIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setPrintModalState({ isOpen: true, quote, docType: 'checklist' });
                            }}
                            className="p-1.5 rounded-full bg-purple-500/20 hover:bg-purple-500/40 text-purple-300 transition-colors cursor-pointer"
                            title="Print Workshop Fabrication Checklist (PDF or Paper)"
                          >
                            <ClipboardCheckIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const cleanName = quote.jobName.replace(/[^a-zA-Z0-9_-]/g, '_');
                              downloadMarkdownFile(`Job_${quote.jobNumber}_${cleanName}.md`, generateJobMarkdown(quote, filaments, printers));
                            }}
                            className="p-1.5 rounded-full bg-purple-500/20 hover:bg-purple-500/40 text-purple-300 transition-colors"
                            title="Export to Obsidian Job Markdown (.md)"
                          >
                            <MarkdownIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const cleanName = quote.jobName.replace(/[^a-zA-Z0-9_-]/g, '_');
                              downloadMarkdownFile(`Invoice_${quote.jobNumber}_${cleanName}.md`, generateInvoiceMarkdown(quote, filaments, printers));
                            }}
                            className="p-1.5 rounded-full bg-indigo-500/20 hover:bg-indigo-500/40 text-indigo-300 transition-colors text-xs flex items-center justify-center font-bold"
                            title="Export to Obsidian Customer Invoice (.md)"
                          >
                            🧾
                          </button>
                          <button
                            onClick={() => onUseAsTemplate ? onUseAsTemplate(quote) : onReviseQuote(quote)}
                            className="p-1.5 rounded-full bg-emerald-500/20 hover:bg-emerald-500/35 text-emerald-300 transition-colors"
                            title="Use as Template (Create New Quote from this)"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </button>
                          <button onClick={() => onReviseQuote(quote)} className="p-1.5 rounded-full bg-blue-500/20 hover:bg-blue-500/40 text-blue-300 transition-colors" title="Revise Quote in Calculator"><ReviseIcon className="w-4 h-4" /></button>
                          {onArchive && (
                            <button
                              onClick={() => onArchive(quote.id, !quote.isArchived)}
                              className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                                quote.isArchived
                                  ? 'bg-amber-500/20 hover:bg-amber-500/40 text-amber-300'
                                  : 'bg-slate-700/60 hover:bg-amber-500/30 text-slate-300 hover:text-amber-300'
                              }`}
                              title={quote.isArchived ? "Restore to Active Jobs" : "Archive Job"}
                            >
                              {quote.isArchived ? <RestoreIcon className="w-4 h-4" /> : <ArchiveIcon className="w-4 h-4" />}
                            </button>
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
                          <QuoteDetailView
                            quote={quote}
                            filaments={filaments}
                            printers={printers}
                            onReviseQuote={onReviseQuote}
                            onUseAsTemplate={onUseAsTemplate}
                            onArchive={onArchive}
                            onPrint={(q, docType) => setPrintModalState({ isOpen: true, quote: q, docType })}
                          />
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

      {printModalState.isOpen && printModalState.quote && (
        <PrintDocumentModal
          isOpen={printModalState.isOpen}
          onClose={() => setPrintModalState(prev => ({ ...prev, isOpen: false }))}
          quote={printModalState.quote}
          filaments={filaments}
          printers={printers}
          initialDocType={printModalState.docType}
          generalSettings={generalSettings}
          onUpdateGeneralSettings={onUpdateGeneralSettings}
          onUpdateQuote={(updated) => {
            setPrintModalState(prev => ({ ...prev, quote: updated }));
            if (onUpdateQuote) onUpdateQuote(updated);
          }}
        />
      )}
    </div>
  );
};

export default JobsPage;