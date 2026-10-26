import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { Quote, Filament, Printer, Order, GeneralSettings, OneOffFee } from '../types';
import { QuoteStatus } from '../types';
import PrinterIcon from './icons/PrinterIcon';
import ClipboardCheckIcon from './icons/ClipboardCheckIcon';
import XIcon from './icons/XIcon';
import { calculateJobPartRows } from '../utils/partCostCalculator';
import { MILESTONES, getOrderMilestoneRows, MilestonePartColorItem } from '../utils/orderMilestones';
import { getFilamentBackgroundStyle } from '../utils/filamentProfilesSync';
import { MYSTERY_PLA_ID } from '../utils/randomFilamentSelector';

interface PrintDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  quote: Quote | null;
  filaments: Filament[];
  printers: Printer[];
  initialDocType?: 'quote' | 'checklist';
  order?: Order | null;
  generalSettings?: GeneralSettings;
  onUpdateGeneralSettings?: (settings: Partial<GeneralSettings>) => void;
  onUpdateQuote?: (quote: Quote) => void;
}

export const DEFAULT_FEE_PRESETS = [
  { label: '📜 Commercial License', description: 'Commercial 3D Model Reseller License', amount: 25.00, category: 'licensing' as const },
  { label: '✏️ CAD / File Prep', description: 'CAD Engineering & Slicing File Preparation', amount: 35.00, category: 'design' as const },
  { label: '⚡ Rush Order Fee', description: 'Rush Order Expedited Fabrication', amount: 20.00, category: 'rush' as const },
  { label: '⚙️ Setup & Tooling', description: 'Specialized Machine Setup & Bed Tooling', amount: 15.00, category: 'setup' as const },
  { label: '📦 Courier Shipping', description: 'Protective Packaging & Courier Delivery', amount: 12.50, category: 'shipping' as const },
];

export interface JobSpoolAllocation {
  filament: Filament | null;
  filamentId: string | null;
  brand: string;
  type: string;
  colorName?: string;
  colorHex?: string;
  rgb?: string;
  masterCode?: string;
  totalGrams: number;
  partsUsed: string[];
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
};

const formatDate = (dateString?: string) => {
  if (!dateString) return new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const PrintDocumentModal: React.FC<PrintDocumentModalProps> = ({
  isOpen,
  onClose,
  quote,
  filaments = [],
  printers = [],
  initialDocType = 'quote',
  order,
  generalSettings,
  onUpdateGeneralSettings,
  onUpdateQuote,
}) => {
  const [docType, setDocType] = useState<'quote' | 'checklist'>(initialDocType);
  const [showSettingsDrawer, setShowSettingsDrawer] = useState(false);

  // One-Off Fees State (Licensing, CAD Design, Rush, Setup, Shipping, etc.)
  const [oneOffFees, setOneOffFees] = useState<OneOffFee[]>(() => {
    return quote?.oneOffFees || quote?.costBreakdown?.oneOffFees || [];
  });

  useEffect(() => {
    if (quote) {
      setOneOffFees(quote.oneOffFees || quote.costBreakdown?.oneOffFees || []);
    }
  }, [quote]);

  const triggerQuoteUpdate = (newFees: OneOffFee[]) => {
    if (onUpdateQuote && quote) {
      const feesSum = newFees.reduce((sum, f) => sum + (Number(f.amount) || 0), 0);
      onUpdateQuote({
        ...quote,
        oneOffFees: newFees,
        costBreakdown: {
          ...quote.costBreakdown,
          oneOffFees: newFees,
          oneOffFeesTotal: feesSum,
        },
      });
    }
  };

  const handleAddPresetFee = (preset: typeof DEFAULT_FEE_PRESETS[0]) => {
    const newFee: OneOffFee = {
      id: `fee-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      description: preset.description,
      amount: preset.amount,
      category: preset.category,
    };
    const updated = [...oneOffFees, newFee];
    setOneOffFees(updated);
    triggerQuoteUpdate(updated);
  };

  const handleAddCustomFee = () => {
    const newFee: OneOffFee = {
      id: `fee-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      description: 'Custom Service / Fee',
      amount: 15.00,
      category: 'other',
    };
    const updated = [...oneOffFees, newFee];
    setOneOffFees(updated);
    triggerQuoteUpdate(updated);
  };

  const handleRemoveFee = (id: string) => {
    const updated = oneOffFees.filter(f => f.id !== id);
    setOneOffFees(updated);
    triggerQuoteUpdate(updated);
  };

  const handleUpdateFee = (id: string, updates: Partial<OneOffFee>) => {
    const updated = oneOffFees.map(f => f.id === id ? { ...f, ...updates } : f);
    setOneOffFees(updated);
    triggerQuoteUpdate(updated);
  };

  const getFeeCategoryBadge = (category?: string) => {
    switch (category) {
      case 'licensing':
        return { icon: '📜', label: 'License', bg: 'bg-amber-100 text-amber-800 border-amber-300' };
      case 'design':
        return { icon: '✏️', label: 'CAD / Prep', bg: 'bg-blue-100 text-blue-800 border-blue-300' };
      case 'rush':
        return { icon: '⚡', label: 'Rush Order', bg: 'bg-red-100 text-red-800 border-red-300' };
      case 'setup':
        return { icon: '⚙️', label: 'Setup / Tooling', bg: 'bg-purple-100 text-purple-800 border-purple-300' };
      case 'shipping':
        return { icon: '📦', label: 'Shipping', bg: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
      default:
        return { icon: '🏷️', label: 'Service Fee', bg: 'bg-slate-100 text-slate-800 border-slate-300' };
    }
  };

  const partsSubtotal = useMemo(() => {
    return quote?.quotePrice || 0;
  }, [quote]);

  const oneOffFeesTotal = useMemo(() => {
    return oneOffFees.reduce((sum, f) => sum + (Number(f.amount) || 0), 0);
  }, [oneOffFees]);

  const grandTotalInvoiced = useMemo(() => {
    return partsSubtotal + oneOffFeesTotal;
  }, [partsSubtotal, oneOffFeesTotal]);

  // Editable Studio / Business Profile
  const [studioName, setStudioName] = useState(generalSettings?.studioName || '3D Printing Studio');
  const [studioTagline, setStudioTagline] = useState(generalSettings?.studioTagline || 'Custom Additive Manufacturing & Rapid Prototyping');
  const [studioEmail, setStudioEmail] = useState(generalSettings?.studioEmail || 'quotes@3dprintstudio.com');
  const [studioPhone, setStudioPhone] = useState(generalSettings?.studioPhone || '(555) 019-3820');
  const [studioAddress, setStudioAddress] = useState(generalSettings?.studioAddress || '');
  const [studioWebsite, setStudioWebsite] = useState(generalSettings?.studioWebsite || '');
  const [customTerms, setCustomTerms] = useState(
    generalSettings?.studioTerms || 'Quotation valid for 30 days. Custom 3D fabricated parts are made to order. 50% deposit required for fabrication to begin.'
  );

  // Sync state if generalSettings prop updates
  React.useEffect(() => {
    if (generalSettings) {
      if (generalSettings.studioName) setStudioName(generalSettings.studioName);
      if (generalSettings.studioTagline) setStudioTagline(generalSettings.studioTagline);
      if (generalSettings.studioEmail) setStudioEmail(generalSettings.studioEmail);
      if (generalSettings.studioPhone) setStudioPhone(generalSettings.studioPhone);
      if (generalSettings.studioAddress !== undefined) setStudioAddress(generalSettings.studioAddress);
      if (generalSettings.studioWebsite !== undefined) setStudioWebsite(generalSettings.studioWebsite);
      if (generalSettings.studioTerms) setCustomTerms(generalSettings.studioTerms);
    }
  }, [generalSettings]);

  // Manage print-active body class so the rest of the application is completely hidden during print
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('print-document-active');
    } else {
      document.body.classList.remove('print-document-active');
    }
    return () => {
      document.body.classList.remove('print-document-active');
    };
  }, [isOpen]);

  // Print customization toggles
  const [includeTerms, setIncludeTerms] = useState(true);
  const [includeSignature, setIncludeSignature] = useState(true);
  const [includeTechnicalNotes, setIncludeTechnicalNotes] = useState(true);
  const [milestoneGrouping, setMilestoneGrouping] = useState<'per_unit' | 'per_line_item'>('per_unit');
  const [includeManifestSummary, setIncludeManifestSummary] = useState(true);
  const [includeSpoolManifest, setIncludeSpoolManifest] = useState(true);

  if (!isOpen || !quote) return null;

  // Compute itemized part prices and breakdown
  const computedParts = useMemo(() => {
    return calculateJobPartRows(quote, filaments, printers);
  }, [quote, filaments, printers]);

  // Compute individual print lines (one line per quantity required / print unit)
  const milestonePrintRows = useMemo(() => {
    if (!quote) return [];
    return getOrderMilestoneRows(quote, filaments, printers, milestoneGrouping);
  }, [quote, filaments, printers, milestoneGrouping]);

  // Comprehensive deduplicated list of all filament spools and colors used across the entire job
  const jobSpoolsSummary = useMemo<JobSpoolAllocation[]>(() => {
    if (!quote) return [];
    const map = new Map<string, JobSpoolAllocation>();

    const parts = (quote.parts && quote.parts.length > 0)
      ? quote.parts
      : [
          {
            id: 'primary',
            name: quote.jobName || 'Primary Part',
            quantity: 1,
            filamentGrams: quote.parameters?.filamentGrams ?? 0,
            filamentId: quote.parameters?.filamentId ?? null,
            colors: quote.parameters?.colors,
          },
        ];

    parts.forEach((p) => {
      const qty = Math.max(1, p.quantity || 1);
      const hasMultiple = Boolean(p.colors && p.colors.length > 1);

      if (hasMultiple && p.colors) {
        p.colors.forEach((c) => {
          const key = c.filamentId || 'unassigned';
          const gramsForPart = Math.round(((c.grams || 0) * qty) * 10) / 10;
          if (!map.has(key)) {
            const fil = filaments.find(f => f.id === c.filamentId);
            map.set(key, {
              filament: fil || null,
              filamentId: c.filamentId,
              brand: fil?.brand || 'Generic',
              type: fil?.type || 'Filament',
              colorName: fil?.colorName,
              colorHex: fil?.colorHex,
              rgb: fil?.rgb,
              masterCode: fil?.masterCode,
              totalGrams: gramsForPart,
              partsUsed: [p.name || 'Part'],
            });
          } else {
            const entry = map.get(key)!;
            entry.totalGrams = Math.round((entry.totalGrams + gramsForPart) * 10) / 10;
            const partName = p.name || 'Part';
            if (!entry.partsUsed.includes(partName)) {
              entry.partsUsed.push(partName);
            }
          }
        });
      } else {
        const primaryId = p.colors?.[0]?.filamentId || p.filamentId;
        const key = primaryId || 'unassigned';
        const gramsForPart = Math.round(((p.filamentGrams || 0) * qty) * 10) / 10;
        if (!map.has(key)) {
          const fil = filaments.find(f => f.id === primaryId);
          map.set(key, {
            filament: fil || null,
            filamentId: primaryId || null,
            brand: fil?.brand || 'Generic',
            type: fil?.type || 'Filament',
            colorName: fil?.colorName,
            colorHex: fil?.colorHex,
            rgb: fil?.rgb,
            masterCode: fil?.masterCode,
            totalGrams: gramsForPart,
            partsUsed: [p.name || 'Part'],
          });
        } else {
          const entry = map.get(key)!;
          entry.totalGrams = Math.round((entry.totalGrams + gramsForPart) * 10) / 10;
          const partName = p.name || 'Part';
          if (!entry.partsUsed.includes(partName)) {
            entry.partsUsed.push(partName);
          }
        }
      }
    });

    return Array.from(map.values());
  }, [quote, filaments]);

  const hasMultiColorInJob = useMemo(() => {
    if (!quote) return false;
    if (quote.parts && quote.parts.some(p => p.colors && p.colors.length > 1)) return true;
    if (quote.parameters?.colors && quote.parameters.colors.length > 1) return true;
    return false;
  }, [quote]);

  const isDifferentPlates = useMemo(() => {
    return (quote.costBreakdown?.multiColorBatchMode || quote.parameters?.multiColorBatchMode) === 'different_plates';
  }, [quote]);

  const bedCount = useMemo(() => {
    return quote.costBreakdown?.multiColorBedCount || quote.parameters?.multiColorBedCount || (isDifferentPlates ? Math.max(1, jobSpoolsSummary.length) : 1);
  }, [quote, isDifferentPlates, jobSpoolsSummary]);

  const primaryPrinter = useMemo(() => {
    const firstPartPrinterId = quote.parts?.[0]?.printerId || quote.parameters?.printerId;
    return printers.find(p => p.id === firstPartPrinterId) || printers[0];
  }, [quote, printers]);

  const totalFilamentGrams = useMemo(() => {
    if (quote.parts && quote.parts.length > 0) {
      return quote.parts.reduce((sum, p) => sum + ((p.filamentGrams || 0) * (p.quantity || 1)), 0);
    }
    return quote.parameters?.filamentGrams || 0;
  }, [quote]);

  const totalPrintHours = useMemo(() => {
    if (quote.parts && quote.parts.length > 0) {
      return quote.parts.reduce((sum, p) => sum + ((p.printHours || 0) * (p.quantity || 1)), 0);
    }
    return quote.parameters?.printHours || 0;
  }, [quote]);

  const handleSaveSettings = () => {
    if (onUpdateGeneralSettings) {
      onUpdateGeneralSettings({
        studioName,
        studioTagline,
        studioEmail,
        studioPhone,
        studioAddress,
        studioWebsite,
        studioTerms: customTerms,
      });
    }
    setShowSettingsDrawer(false);
  };

  const handlePrint = () => {
    window.print();
  };

  const modalContent = (
    <div className="print-modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-sm overflow-y-auto print:static print:p-0 print:m-0 print:bg-white print:overflow-visible">
      <div className="print-modal-dialog relative w-full max-w-4xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col max-h-[94vh] overflow-hidden my-auto print:static print:border-none print:shadow-none print:rounded-none print:max-h-none print:max-w-none print:w-full print:bg-white print:overflow-visible print:m-0 print:p-0">
        
        {/* Top Control Bar (Screen Only - Hidden in Print via .no-print) */}
        <div className="no-print p-4 bg-slate-800 border-b border-slate-700 flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 p-1 bg-slate-900 rounded-xl border border-slate-700">
              <button
                type="button"
                onClick={() => setDocType('quote')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  docType === 'quote'
                    ? 'bg-cyan-500 text-slate-950 shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <PrinterIcon className="w-3.5 h-3.5" />
                <span>Customer Quote / Invoice</span>
              </button>
              <button
                type="button"
                onClick={() => setDocType('checklist')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  docType === 'checklist'
                    ? 'bg-purple-500 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <ClipboardCheckIcon className="w-3.5 h-3.5" />
                <span>Job Workshop Checklist</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowSettingsDrawer(!showSettingsDrawer)}
              className="text-xs text-slate-400 hover:text-cyan-300 underline px-2 py-1"
            >
              {showSettingsDrawer ? 'Hide Studio Settings' : '⚙️ Studio & Terms'}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs sm:text-sm shadow-lg transition-transform active:scale-95 cursor-pointer"
              title="Print to physical printer or save as PDF via your browser's print dialog"
            >
              <PrinterIcon className="w-4 h-4" />
              <span>Print / Save as PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition"
              title="Close modal"
            >
              <XIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Studio / Invoice Details Editor (Screen Only) */}
        {showSettingsDrawer && (
          <div className="no-print p-4 bg-slate-850 border-b border-slate-700 text-xs space-y-3 bg-slate-900/90 flex-shrink-0 max-h-56 overflow-y-auto">
            <div className="font-semibold text-slate-200 flex items-center justify-between">
              <span>Edit Document Branding & Information</span>
              <button
                type="button"
                onClick={handleSaveSettings}
                className="bg-cyan-600 hover:bg-cyan-500 text-white px-2.5 py-1 rounded text-[11px] font-bold"
              >
                Save as Default
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              <div>
                <label className="block text-slate-400 text-[10px] mb-0.5">Studio / Business Name</label>
                <input
                  type="text"
                  value={studioName}
                  onChange={(e) => setStudioName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-200"
                />
              </div>
              <div>
                <label className="block text-slate-400 text-[10px] mb-0.5">Tagline / Services</label>
                <input
                  type="text"
                  value={studioTagline}
                  onChange={(e) => setStudioTagline(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-200"
                />
              </div>
              <div>
                <label className="block text-slate-400 text-[10px] mb-0.5">Email</label>
                <input
                  type="email"
                  value={studioEmail}
                  onChange={(e) => setStudioEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-200"
                />
              </div>
              <div>
                <label className="block text-slate-400 text-[10px] mb-0.5">Phone Number</label>
                <input
                  type="text"
                  value={studioPhone}
                  onChange={(e) => setStudioPhone(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-200"
                />
              </div>
              <div>
                <label className="block text-slate-400 text-[10px] mb-0.5">Shop Address / Location</label>
                <input
                  type="text"
                  value={studioAddress}
                  onChange={(e) => setStudioAddress(e.target.value)}
                  placeholder="e.g. 123 Maker Way, Suite 4"
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-200"
                />
              </div>
              <div>
                <label className="block text-slate-400 text-[10px] mb-0.5">Website / Portfolio</label>
                <input
                  type="text"
                  value={studioWebsite}
                  onChange={(e) => setStudioWebsite(e.target.value)}
                  placeholder="e.g. www.3dprintstudio.com"
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-200"
                />
              </div>
              <div className="sm:col-span-2 md:col-span-3">
                <label className="block text-slate-400 text-[10px] mb-0.5">Print Options & Toggles</label>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1">
                  <label className="flex items-center gap-1.5 text-[11px] text-slate-300">
                    <input type="checkbox" checked={includeTerms} onChange={e => setIncludeTerms(e.target.checked)} />
                    <span>Quote Terms</span>
                  </label>
                  <label className="flex items-center gap-1.5 text-[11px] text-slate-300">
                    <input type="checkbox" checked={includeSignature} onChange={e => setIncludeSignature(e.target.checked)} />
                    <span>Sign-off Box</span>
                  </label>
                  <label className="flex items-center gap-1.5 text-[11px] text-slate-300">
                    <input type="checkbox" checked={includeTechnicalNotes} onChange={e => setIncludeTechnicalNotes(e.target.checked)} />
                    <span>Machine Specs</span>
                  </label>
                  <label className="flex items-center gap-1.5 text-[11px] text-slate-300">
                    <input type="checkbox" checked={includeManifestSummary} onChange={e => setIncludeManifestSummary(e.target.checked)} />
                    <span>Manifest Summary Table</span>
                  </label>
                  <label className="flex items-center gap-1.5 text-[11px] text-slate-300">
                    <input type="checkbox" checked={includeSpoolManifest} onChange={e => setIncludeSpoolManifest(e.target.checked)} />
                    <span>Spools & Materials Manifest</span>
                  </label>
                  <label className="flex items-center gap-1.5 text-[11px] text-slate-300">
                    <input
                      type="checkbox"
                      checked={milestoneGrouping === 'per_unit'}
                      onChange={e => setMilestoneGrouping(e.target.checked ? 'per_unit' : 'per_line_item')}
                    />
                    <span>Line per Unit ({milestonePrintRows.length})</span>
                  </label>
                </div>
              </div>
              <div className="sm:col-span-2 md:col-span-3">
                <label className="block text-slate-400 text-[10px] mb-0.5">Customer Terms & Notes</label>
                <input
                  type="text"
                  value={customTerms}
                  onChange={(e) => setCustomTerms(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-200"
                />
              </div>
            </div>
          </div>
        )}

        {/* Document Preview & Printable Area */}
        <div className="print-modal-scroll-area flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-950/60 flex justify-center print:static print:bg-white print:p-0 print:m-0 print:overflow-visible print:block print:w-full">
          
          <div
            id="printable-document-content"
            className="w-full max-w-[800px] bg-white text-slate-900 rounded-sm shadow-xl p-8 sm:p-10 font-sans print:shadow-none print:p-0 print:m-0 print:max-w-none print:w-full print:rounded-none print:border-none"
            style={{ minHeight: 'auto' }}
          >
            {docType === 'quote' ? (
              /* ========================================================================= */
              /* 1. CUSTOMER QUOTE & INVOICE DOCUMENT                                      */
              /* ========================================================================= */
              <div className="space-y-6 text-slate-800">
                {/* Header */}
                <div className="flex justify-between items-start border-b-2 border-slate-800 pb-5">
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
                      {studioName}
                    </h1>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">{studioTagline}</p>
                    <div className="text-[11px] text-slate-600 mt-2 space-y-0.5">
                      {studioAddress && <div>{studioAddress}</div>}
                      <div className="flex flex-wrap gap-x-3">
                        {studioPhone && <span>Tel: {studioPhone}</span>}
                        {studioEmail && <span>Email: {studioEmail}</span>}
                        {studioWebsite && <span>Web: {studioWebsite}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="inline-block bg-slate-900 text-white font-black text-sm uppercase px-3 py-1 rounded tracking-wider mb-2">
                      {order ? 'CUSTOMER INVOICE' : '3D PRINT QUOTE'}
                    </div>
                    <div className="text-xs text-slate-600 font-medium">
                      <div>
                        <span className="text-slate-400">Ref #:</span> <strong className="text-slate-900">#{order ? order.orderNumber : quote.jobNumber}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400">Date:</span> {formatDate(quote.createdAt)}
                      </div>
                      <div>
                        <span className="text-slate-400">Valid For:</span> 30 Days
                      </div>
                      <div>
                        <span className="text-slate-400">Status:</span>{' '}
                        <span className="font-semibold text-slate-900 uppercase text-[10px] bg-slate-100 px-1.5 py-0.5 rounded border border-slate-300">
                          {order ? order.status : quote.status}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bill To & Project Info */}
                <div className="grid grid-cols-2 gap-6 bg-slate-50 p-4 rounded-lg border border-slate-200">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                      Customer / Client
                    </span>
                    <h2 className="text-base font-bold text-slate-900 mt-0.5">
                      {quote.customerName || 'Valued Customer'}
                    </h2>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                      Job Name / Description
                    </span>
                    <h2 className="text-base font-bold text-slate-900 mt-0.5">
                      {quote.jobName || '3D Printed Fabrication Project'}
                    </h2>
                  </div>
                </div>

                {/* Itemized Parts Table */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                    Itemized Fabrication Details
                  </h3>
                  <table className="w-full text-left text-xs border border-slate-200 border-collapse">
                    <thead>
                      <tr className="bg-slate-800 text-white text-[11px] uppercase tracking-wider">
                        <th className="py-2.5 px-3 font-semibold w-10 text-center">#</th>
                        <th className="py-2.5 px-3 font-semibold">Part / Model Description</th>
                        <th className="py-2.5 px-3 font-semibold">Material / Color Spec</th>
                        <th className="py-2.5 px-3 font-semibold text-center w-16">Qty</th>
                        <th className="py-2.5 px-3 font-semibold text-right w-24">Unit Price</th>
                        <th className="py-2.5 px-3 font-semibold text-right w-28">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {computedParts.rows.map((row, idx) => {
                        const isMulti = Boolean(row.part.colors && row.part.colors.length > 1);
                        const primaryFil = filaments.find(f => f.id === (row.part.colors?.[0]?.filamentId || row.part.filamentId));

                        return (
                          <tr key={row.part.id || idx} className="hover:bg-slate-50/50 print-avoid-break">
                            <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[11px] align-top">{idx + 1}</td>
                            <td className="py-2.5 px-3 font-medium text-slate-900 align-top">
                              <div className="font-semibold text-slate-900">{row.part.name || `Part ${idx + 1}`}</div>
                              <div className="text-[10px] text-slate-500 font-normal mt-0.5">
                                ⚖️ {row.part.filamentGrams}g total • ⏱️ {row.part.printHours}h print
                                {isMulti && row.part.colors && (
                                  <span className="ml-1.5 font-semibold text-purple-700">
                                    • {isDifferentPlates 
                                        ? `🥞 Multi-Plate (${row.part.colors.length} Separate Build Plates)` 
                                        : `🎨 ${row.part.colors.length}-Color Co-extrusion`}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-slate-700 text-[11px] align-top">
                              {isMulti && row.part.colors ? (
                                <div className="space-y-1">
                                  <div className="flex items-center gap-1.5 font-bold text-purple-900 text-[10.5px]">
                                    <span>🎨 Multi-Color</span>
                                    <span className="font-normal text-[10px] text-slate-500 bg-purple-50 text-purple-700 border border-purple-200 px-1.5 py-0.2 rounded-full">
                                      {row.part.colors.length} spools
                                    </span>
                                  </div>
                                  <div className="space-y-1 pl-0.5">
                                    {row.part.colors.map((c, cIdx) => {
                                      const cFil = filaments.find(f => f.id === c.filamentId);
                                      const isMystery = c.isMysteryColor || c.filamentId === MYSTERY_PLA_ID;
                                      return (
                                        <div key={c.id || cIdx} className="flex items-center gap-1.5 text-[10.5px] leading-tight">
                                          <span
                                            className="w-2.5 h-2.5 rounded-full border border-slate-300 flex-shrink-0 shadow-xs"
                                            style={isMystery ? { backgroundColor: '#a855f7' } : getFilamentBackgroundStyle(cFil?.colorHex, cFil?.rgb)}
                                          />
                                          <span className="font-medium text-slate-900">
                                            {isMystery ? (
                                              <span className="font-semibold text-purple-950">🎨 Surprise / Maker's Choice PLA</span>
                                            ) : (
                                              <>
                                                {cFil?.masterCode && (
                                                  <span className="font-mono font-bold text-slate-900 bg-slate-100 border border-slate-300 px-1 py-0.2 rounded text-[9.5px] mr-1">
                                                    #{cFil.masterCode}
                                                  </span>
                                                )}
                                                {cFil ? `${cFil.brand} ${cFil.type}` : 'Filament'}
                                                {cFil?.colorName ? ` (${cFil.colorName})` : ''}
                                              </>
                                            )}
                                          </span>
                                          <span className="text-slate-500 font-mono text-[10px]">
                                            {c.grams}g
                                          </span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              ) : (row.part.isMysteryColor || row.part.filamentId === MYSTERY_PLA_ID) ? (
                                <div className="flex items-start gap-1.5">
                                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500 border border-purple-300 flex-shrink-0 mt-0.5 shadow-xs" />
                                  <div>
                                    <div className="font-bold text-purple-950 flex items-center gap-1.5">
                                      <span>🎨 Surprise / Maker's Choice PLA</span>
                                      <span className="text-[9.5px] bg-purple-100 text-purple-800 border border-purple-300 px-1 py-0.2 rounded font-medium">
                                        Client Surprise
                                      </span>
                                    </div>
                                    <div className="text-[10px] text-slate-500 font-normal">
                                      Decorative Print Finish: Maker's choice selected from premium PLA collection
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-start gap-1.5">
                                  {primaryFil?.colorHex && (
                                    <span
                                      className="w-2.5 h-2.5 rounded-full border border-slate-300 flex-shrink-0 mt-0.5"
                                      style={getFilamentBackgroundStyle(primaryFil?.colorHex, primaryFil?.rgb)}
                                    />
                                  )}
                                  <div>
                                    <div className="font-medium text-slate-900">
                                      {primaryFil?.masterCode && (
                                        <span className="font-mono font-bold text-slate-900 bg-slate-100 border border-slate-300 px-1 py-0.2 rounded text-[9.5px] mr-1">
                                          #{primaryFil.masterCode}
                                        </span>
                                      )}
                                      {primaryFil ? `${primaryFil.brand} ${primaryFil.type}` : 'Standard Resin / Filament'}
                                    </div>
                                    {primaryFil?.colorName && (
                                      <div className="text-[10px] text-slate-500 font-normal">
                                        Color: {primaryFil.colorName}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-center font-semibold text-slate-800 align-top">
                              {row.qty}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-slate-700 align-top">
                              {formatCurrency(row.perUnitPrice)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 align-top">
                              {formatCurrency(row.lineTotalPrice)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  {/* Multi-Filament / Color Specification Palette Summary */}
                  {jobSpoolsSummary.length > 1 && (
                    <div className="mt-3 bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs print-avoid-break">
                      <div className="font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-2 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <span>🎨 Job Color Palette Specification</span>
                        </span>
                        <span className="text-purple-700 font-semibold text-[10px] bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full">
                          {jobSpoolsSummary.length} Colors / Spools in Project
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                        {jobSpoolsSummary.map((spool, sIdx) => (
                          <div key={spool.filamentId || sIdx} className="flex items-center gap-2 bg-white border border-slate-200 rounded p-1.5 shadow-2xs">
                            <span
                              className="w-3.5 h-3.5 rounded-full border border-slate-300 flex-shrink-0 shadow-xs"
                              style={getFilamentBackgroundStyle(spool.colorHex, spool.rgb)}
                            />
                            <div className="min-w-0 flex-1">
                              <div className="truncate font-semibold text-slate-900 text-[11px]">
                                {spool.masterCode && (
                                  <span className="font-mono font-bold text-slate-900 bg-slate-100 border border-slate-300 px-1 py-0.2 rounded text-[9.5px] mr-1">
                                    #{spool.masterCode}
                                  </span>
                                )}
                                {spool.colorName || `${spool.brand} ${spool.type}`}
                              </div>
                              <div className="text-[10px] text-slate-500 truncate">
                                {spool.brand} {spool.type} • {spool.totalGrams}g total
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* ========================================================================= */}
                {/* ONE-OFF & SERVICE FEES SECTION (Licensing, CAD Prep, Rush, Tooling, etc.)   */}
                {/* ========================================================================= */}
                <div className="pt-3 border-t border-slate-200 print-avoid-break">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                        <span>📜 One-Off & Specialized Service Fees</span>
                      </h3>
                      {oneOffFees.length > 0 && (
                        <span className="text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.2 rounded-full">
                          {oneOffFees.length} {oneOffFees.length === 1 ? 'item' : 'items'} (+{formatCurrency(oneOffFeesTotal)})
                        </span>
                      )}
                    </div>

                    {/* Quick Add Presets Bar (Screen Only) */}
                    <div className="no-print flex items-center gap-1 flex-wrap">
                      <span className="text-[10px] text-slate-400 font-semibold uppercase mr-0.5">Add:</span>
                      {DEFAULT_FEE_PRESETS.map((preset, pIdx) => (
                        <button
                          key={pIdx}
                          type="button"
                          onClick={() => handleAddPresetFee(preset)}
                          className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-2 py-0.5 rounded border border-slate-300 transition cursor-pointer"
                          title={`Add ${preset.description} ($${preset.amount.toFixed(2)})`}
                        >
                          {preset.label}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={handleAddCustomFee}
                        className="text-[10px] bg-cyan-50 hover:bg-cyan-100 text-cyan-800 font-bold px-2 py-0.5 rounded border border-cyan-300 transition cursor-pointer"
                      >
                        + Custom
                      </button>
                    </div>
                  </div>

                  {oneOffFees.length > 0 ? (
                    <div className="overflow-hidden rounded border border-slate-200 mb-2">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-100 text-slate-700 text-[10.5px] uppercase tracking-wider border-b border-slate-200">
                            <th className="py-2 px-3 font-semibold w-10 text-center">#</th>
                            <th className="py-2 px-3 font-semibold">Service / Fee Description</th>
                            <th className="py-2 px-3 font-semibold w-36">Category</th>
                            <th className="py-2 px-3 font-semibold text-right w-28">Amount</th>
                            <th className="py-2 px-2 text-center w-12 no-print">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 bg-white">
                          {oneOffFees.map((fee, fIdx) => {
                            const badge = getFeeCategoryBadge(fee.category);
                            return (
                              <tr key={fee.id || fIdx} className="hover:bg-slate-50/50 print-avoid-break">
                                <td className="py-2 px-3 text-center text-slate-400 font-mono text-[11px] align-middle">{fIdx + 1}</td>
                                <td className="py-2 px-3 font-medium text-slate-900 align-middle">
                                  <input
                                    type="text"
                                    value={fee.description}
                                    onChange={(e) => handleUpdateFee(fee.id, { description: e.target.value })}
                                    className="w-full bg-slate-50 hover:bg-white focus:bg-white border border-transparent focus:border-slate-300 rounded px-1.5 py-0.5 text-xs font-semibold text-slate-900 no-print"
                                    placeholder="Fee description..."
                                  />
                                  <span className="print-only hidden print:inline font-semibold">{fee.description}</span>
                                </td>
                                <td className="py-2 px-3 align-middle">
                                  <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${badge.bg}`}>
                                    <span>{badge.icon}</span>
                                    <span>{badge.label}</span>
                                  </span>
                                </td>
                                <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 align-middle">
                                  <span className="no-print inline-flex items-center justify-end gap-1">
                                    <span className="text-slate-400 font-normal">$</span>
                                    <input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      value={fee.amount}
                                      onChange={(e) => handleUpdateFee(fee.id, { amount: parseFloat(e.target.value) || 0 })}
                                      className="w-20 text-right bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-xs font-mono font-bold"
                                    />
                                  </span>
                                  <span className="print-only hidden print:inline">{formatCurrency(fee.amount)}</span>
                                </td>
                                <td className="py-2 px-2 text-center align-middle no-print">
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveFee(fee.id)}
                                    className="text-slate-400 hover:text-red-600 p-1 rounded hover:bg-red-50 text-xs font-bold transition cursor-pointer"
                                    title="Remove Fee"
                                  >
                                    ✕
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="no-print bg-slate-50 border border-dashed border-slate-300 rounded-lg p-2.5 text-center text-slate-500 text-xs mb-2">
                      <span>No one-off fees added. Click presets above (e.g. <strong>📜 Commercial License</strong>, <strong>✏️ CAD / File Prep</strong>, <strong>⚡ Rush Order</strong>) to add line items to this invoice.</span>
                    </div>
                  )}
                </div>

                {/* Financial Summary & Totals Block */}
                <div className="flex justify-end pt-2">
                  <div className="w-full max-w-xs space-y-2 text-xs">
                    <div className="flex justify-between text-slate-600 py-1 border-b border-slate-100">
                      <span>Parts & Fabrication Subtotal:</span>
                      <span className="font-mono">{formatCurrency(quote.quotePrice)}</span>
                    </div>

                    {oneOffFees.length > 0 && (
                      <div className="flex justify-between text-slate-700 py-1 border-b border-slate-100 font-medium">
                        <span>One-Off Fees & Services ({oneOffFees.length}):</span>
                        <span className="font-mono font-bold text-amber-700">+{formatCurrency(oneOffFeesTotal)}</span>
                      </div>
                    )}

                    {Boolean(quote.costBreakdown?.multiColorFee && quote.costBreakdown.multiColorFee > 0) && (
                      <div className="flex justify-between text-slate-600 py-1 border-b border-slate-100">
                        <span>
                          {isDifferentPlates
                            ? `Multi-Plate Production (${bedCount} Build Plates):`
                            : 'Multi-Color Material Prep:'}
                        </span>
                        <span className="font-mono text-purple-700 font-semibold">Included</span>
                      </div>
                    )}

                    {/* Total Amount Box */}
                    <div className="p-3 bg-slate-900 text-white rounded-lg flex justify-between items-center mt-3 shadow-sm">
                      <span className="text-xs font-bold uppercase tracking-wider">
                        {order ? 'Total Invoiced Amount:' : 'Total Quoted Price:'}
                      </span>
                      <span className="text-xl font-mono font-black">{formatCurrency(grandTotalInvoiced)}</span>
                    </div>
                  </div>
                </div>

                {/* Terms and Acceptance */}
                <div className="pt-6 border-t border-slate-200 space-y-6">
                  {includeTerms && (
                    <div>
                      <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                        Terms & Conditions
                      </h4>
                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        {customTerms}
                      </p>
                    </div>
                  )}

                  {includeSignature && (
                    <div className="grid grid-cols-2 gap-8 pt-4">
                      <div>
                        <div className="border-b border-slate-400 h-8"></div>
                        <span className="text-[10px] uppercase font-bold text-slate-500 block mt-1">
                          Customer Approval Signature
                        </span>
                      </div>
                      <div>
                        <div className="border-b border-slate-400 h-8"></div>
                        <span className="text-[10px] uppercase font-bold text-slate-500 block mt-1">
                          Date
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="text-center text-[10px] text-slate-400 pt-3 border-t border-slate-100">
                    Thank you for choosing {studioName} for your 3D printing needs!
                  </div>
                </div>
              </div>
            ) : (
              /* ========================================================================= */
              /* 2. JOB WORKSHOP & FABRICATION CHECKLIST                                   */
              /* ========================================================================= */
              <div className="space-y-6 text-slate-800">
                {/* Header */}
                <div className="flex justify-between items-start border-b-2 border-slate-800 pb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="inline-block bg-purple-900 text-white font-black text-xs uppercase px-2.5 py-1 rounded tracking-wider">
                        PRODUCTION TRAVELER
                      </span>
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        {studioName}
                      </span>
                    </div>
                    <h1 className="text-2xl font-black tracking-tight text-slate-900">
                      Workshop Fabrication Checklist
                    </h1>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Job #{quote.jobNumber}: <strong className="text-slate-900">{quote.jobName}</strong>
                    </p>
                  </div>

                  <div className="text-right text-xs text-slate-600">
                    <div><span className="text-slate-400">Date:</span> {formatDate(quote.createdAt)}</div>
                    <div><span className="text-slate-400">Customer:</span> <strong className="text-slate-900">{quote.customerName || 'N/A'}</strong></div>
                    <div>
                      <span className="text-slate-400">Status:</span>{' '}
                      <span className="font-semibold text-slate-900 uppercase text-[10px] bg-slate-100 px-1.5 py-0.5 rounded border border-slate-300">
                        {order ? order.status : quote.status}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Machine & Production Setup Specs */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 bg-slate-100 p-3 rounded-lg border border-slate-300 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Assigned Machine</span>
                    <strong className="text-slate-900">{primaryPrinter ? `${primaryPrinter.brand} ${primaryPrinter.name}` : 'Default 3D Printer'}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Est. Runtime</span>
                    <strong className="text-slate-900">{totalPrintHours.toFixed(1)} hrs</strong>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Estimated Filament</span>
                    <strong className="text-slate-900">{totalFilamentGrams} grams</strong>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Units to Build</span>
                    <strong className="text-slate-900">{computedParts.totalQuantity} items</strong>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Print Method</span>
                    <strong className="text-slate-900">
                      {isDifferentPlates 
                        ? `🥞 Diff Plates (${bedCount} Beds)` 
                        : hasMultiColorInJob 
                        ? `🎨 1 Bed (${bedCount} AMS Bed)` 
                        : 'Standard Print'}
                    </strong>
                  </div>
                </div>

                {/* Spools & Materials Preparation Manifest */}
                {includeSpoolManifest && jobSpoolsSummary.length > 0 && (
                  <div className="border border-slate-300 rounded-lg p-3 bg-purple-50/30 print:bg-white print-avoid-break">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-purple-950 flex items-center gap-1.5">
                        <span>{isDifferentPlates ? '🥞 Different Build Plates & Spools Prep' : '🧵 Spools & Multi-Color Prep Manifest'}</span>
                        <span className="text-[10px] font-normal text-purple-800 bg-purple-100 px-1.5 py-0.2 rounded border border-purple-200">
                          {isDifferentPlates ? `${bedCount} Build Plates • 0% Purge Waste` : `${jobSpoolsSummary.length} ${jobSpoolsSummary.length === 1 ? 'spool required' : 'spools required'}`}
                        </span>
                      </h3>
                      <span className="text-[10px] text-slate-500">
                        {isDifferentPlates 
                          ? 'Prep and label build plates by color/part for separate print runs' 
                          : 'Inspect & load spools into AMS / MMU prior to fabrication'}
                      </span>
                    </div>
                    <table className="w-full text-left text-xs border border-slate-300 border-collapse">
                      <thead>
                        <tr className="bg-slate-800 text-white text-[10px] uppercase tracking-wider">
                          <th className="py-1.5 px-2 text-center w-8">Loaded</th>
                          <th className="py-1.5 px-2 text-center w-14">{isDifferentPlates ? 'Plate #' : 'Slot'}</th>
                          <th className="py-1.5 px-3 font-semibold">Master Code & Color Name</th>
                          <th className="py-1.5 px-3 font-semibold">Filament Spec / Type</th>
                          <th className="py-1.5 px-3 text-right w-24">Req. Grams</th>
                          <th className="py-1.5 px-3 font-semibold">Used in Parts</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {jobSpoolsSummary.map((spool, sIdx) => (
                          <tr key={spool.filamentId || sIdx} className="hover:bg-slate-50/50 print-avoid-break">
                            <td className="py-2 px-2 text-center">
                              <span className="inline-block w-3.5 h-3.5 border-2 border-slate-400 rounded-xs"></span>
                            </td>
                            <td className="py-2 px-2 text-center font-mono font-bold text-slate-700 text-[10.5px]">
                              {isDifferentPlates ? `Plate ${sIdx + 1}` : `[${sIdx + 1}]`}
                            </td>
                            <td className="py-2 px-3 font-semibold text-slate-900">
                              <div className="flex items-center gap-1.5">
                                <span
                                  className="w-3 h-3 rounded-full border border-slate-300 flex-shrink-0 shadow-2xs"
                                  style={getFilamentBackgroundStyle(spool.colorHex, spool.rgb)}
                                />
                                {spool.masterCode && (
                                  <span className="font-mono font-bold text-purple-900 bg-purple-100 border border-purple-300 px-1 py-0.2 rounded text-[10px]">
                                    #{spool.masterCode}
                                  </span>
                                )}
                                <span>{spool.colorName || 'Standard Color'}</span>
                              </div>
                            </td>
                            <td className="py-2 px-3 text-slate-700 text-[11px]">
                              {spool.brand} {spool.type}
                              {spool.filament?.location && (
                                <span className="text-[10px] text-slate-500 ml-1.5">
                                  • Loc: {spool.filament.location}
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                              {spool.totalGrams}g
                            </td>
                            <td className="py-2 px-3 text-slate-600 text-[10px] truncate max-w-[150px]">
                              {spool.partsUsed.join(', ')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Parts Checklist Table (Optional Overview Manifest) */}
                {includeManifestSummary && (
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center justify-between">
                      <span>Parts Fabrication Manifest</span>
                      <span className="text-[10px] font-normal text-slate-500">Summary overview by model</span>
                    </h3>
                    <table className="w-full text-left text-xs border border-slate-300 border-collapse">
                      <thead>
                        <tr className="bg-slate-800 text-white text-[10px] uppercase tracking-wider">
                          <th className="py-2 px-2 text-center w-8">Done</th>
                          <th className="py-2 px-3 font-semibold">Part / Model Name</th>
                          <th className="py-2 px-3 font-semibold text-center w-20">Req. Qty</th>
                          <th className="py-2 px-3 font-semibold text-center w-28">Progress</th>
                          <th className="py-2 px-3 font-semibold">Material / Color</th>
                          <th className="py-2 px-2 text-center w-14">QA</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {computedParts.rows.map((row, idx) => {
                          const isMulti = Boolean(row.part.colors && row.part.colors.length > 1);
                          const primaryFil = filaments.find(f => f.id === (row.part.colors?.[0]?.filamentId || row.part.filamentId));

                          return (
                            <tr key={row.part.id || idx} className="hover:bg-slate-50/50 print-avoid-break">
                              <td className="py-2.5 px-2 text-center align-top">
                                <span className="inline-block w-4 h-4 border-2 border-slate-400 rounded-sm"></span>
                              </td>
                              <td className="py-2.5 px-3 font-semibold text-slate-900 align-top">
                                {row.part.name}
                                <div className="text-[10px] text-slate-500 font-normal mt-0.5">
                                  ⚖️ {row.part.filamentGrams}g • ⏱️ {row.part.printHours}h print
                                  {isMulti && row.part.colors && (
                                    <span className="ml-1 text-purple-800 font-semibold">
                                      • 🎨 {row.part.colors.length}-Color
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-2.5 px-3 text-center font-bold text-slate-800 text-sm align-top">
                                {row.qty}
                              </td>
                              <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[11px] align-top">
                                [ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; / {row.qty} ]
                              </td>
                              <td className="py-2.5 px-3 text-slate-700 text-[11px] align-top">
                                {isMulti && row.part.colors ? (
                                  <div className="space-y-1">
                                    <div className="text-[10.5px] font-bold text-purple-900 flex items-center gap-1">
                                      <span>🎨 Multi-Color ({row.part.colors.length} Filaments)</span>
                                    </div>
                                    <div className="space-y-0.5 pl-0.5">
                                      {row.part.colors.map((c, ci) => {
                                        const f = filaments.find(item => item.id === c.filamentId);
                                        return (
                                          <div key={c.id || ci} className="flex items-center gap-1.5 text-[10px] leading-tight">
                                            <span
                                              className="w-2.5 h-2.5 rounded-full border border-slate-300 flex-shrink-0"
                                              style={getFilamentBackgroundStyle(f?.colorHex, f?.rgb)}
                                            />
                                            <span className="font-semibold text-slate-900">
                                              {f?.masterCode && (
                                                <span className="font-mono text-purple-900 font-bold mr-1">
                                                  #{f.masterCode}
                                                </span>
                                              )}
                                              {f ? `${f.brand} ${f.type}` : 'Filament'}
                                              {f?.colorName ? ` (${f.colorName})` : ''}:
                                            </span>
                                            <span className="text-slate-600 font-mono text-[9.5px]">
                                              {c.grams}g
                                            </span>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                ) : (row.part.isMysteryColor || row.part.filamentId === MYSTERY_PLA_ID) ? (
                                  <div className="flex items-center gap-1.5">
                                    <span className="w-2.5 h-2.5 rounded-full bg-purple-500 border border-purple-300 flex-shrink-0" />
                                    <span>
                                      <strong className="text-purple-900 mr-1">🎲 Surprise PLA:</strong>
                                      {primaryFil ? `${primaryFil.brand} ${primaryFil.type}${primaryFil.colorName ? ` (${primaryFil.colorName})` : ''}` : 'Pick from Random PLA Shelf'}
                                    </span>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1.5">
                                    {primaryFil?.colorHex && (
                                      <span
                                        className="w-2.5 h-2.5 rounded-full border border-slate-300 flex-shrink-0"
                                        style={getFilamentBackgroundStyle(primaryFil?.colorHex, primaryFil?.rgb)}
                                      />
                                    )}
                                    <span>
                                      {primaryFil?.masterCode && (
                                        <strong className="font-mono text-purple-900 mr-1">#{primaryFil.masterCode}</strong>
                                      )}
                                      {primaryFil ? `${primaryFil.brand} ${primaryFil.type}${primaryFil.colorName ? ` (${primaryFil.colorName})` : ''}` : 'Standard Material'}
                                    </span>
                                  </div>
                                )}
                              </td>
                              <td className="py-2.5 px-2 text-center align-top">
                                <span className="inline-block w-4 h-4 border-2 border-slate-400 rounded-sm"></span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Fabrication & Quality Milestones (One line per quantity required / each print) */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                      <span>Fabrication & Quality Milestones</span>
                      <span className="text-[10px] font-normal text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
                        {milestonePrintRows.length} {milestonePrintRows.length === 1 ? 'print item' : 'print items'}
                      </span>
                    </h3>
                    <span className="text-[10px] text-slate-500">
                      Check off milestones per individual print
                    </span>
                  </div>

                  <table className="w-full text-left text-xs border border-slate-300 border-collapse print:text-[9.5px]">
                    <thead>
                      <tr className="bg-slate-800 text-white text-[9px] uppercase tracking-wider">
                        <th className="py-2 px-1 text-center w-7">#</th>
                        <th className="py-2 px-2 font-semibold min-w-[120px]">Print / Model Item</th>
                        <th className="py-2 px-2 font-semibold min-w-[95px]">Material / Color</th>
                        <th className="py-1.5 px-1 text-center font-semibold w-12 leading-tight">
                          Slicing
                        </th>
                        <th className="py-1.5 px-1 text-center font-semibold w-14 leading-tight">
                          Spool<br/>checked
                        </th>
                        <th className="py-1.5 px-1 text-center font-semibold w-16 leading-tight">
                          Build plate<br/>clean
                        </th>
                        <th className="py-1.5 px-1 text-center font-semibold w-12 leading-tight">
                          First<br/>layer
                        </th>
                        <th className="py-1.5 px-1 text-center font-semibold w-16 leading-tight">
                          Print<br/>completed
                        </th>
                        <th className="py-1.5 px-1 text-center font-semibold w-20 leading-tight">
                          Post-processing<br/>completed
                        </th>
                        <th className="py-1.5 px-1 text-center font-semibold w-10 leading-tight">
                          QA
                        </th>
                        <th className="py-1.5 px-1 text-center font-semibold w-16 leading-tight">
                          Documentation
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {milestonePrintRows.map((row) => (
                        <tr key={row.id} className="hover:bg-slate-50/50 print-avoid-break">
                          <td className="py-1.5 px-1 text-center text-slate-500 font-mono text-[10px] align-top">
                            {row.unitIndex}
                          </td>
                          <td className="py-1.5 px-2 font-semibold text-slate-900 leading-tight align-top">
                            <div>{row.partName}</div>
                            <div className="text-[9.5px] font-bold text-purple-700 mt-0.5">
                              {row.unitLabel}
                            </div>
                          </td>
                          <td className="py-1.5 px-2 text-slate-600 text-[10px] leading-tight align-top">
                            {row.colors && row.colors.length > 1 ? (
                              <div className="space-y-0.5">
                                <div className="font-bold text-purple-900 text-[9px] flex items-center gap-1 mb-0.5">
                                  <span>🎨 Multi-Color ({row.colors.length} spools)</span>
                                </div>
                                {row.colors.map((c, ci) => (
                                  <div key={c.id || ci} className="flex items-center gap-1 text-[9px] leading-tight">
                                    <span
                                      className="w-2 h-2 rounded-full border border-slate-300 flex-shrink-0"
                                      style={getFilamentBackgroundStyle(c.colorHex, c.rgb)}
                                    />
                                    <span className="truncate max-w-[130px]">
                                      {c.masterCode && <strong className="font-mono text-purple-900 mr-0.5">#{c.masterCode}</strong>}
                                      {c.colorName || `${c.brand} ${c.type}`}: {c.grams}g
                                    </span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="flex items-center gap-1">
                                {row.colorHex && (
                                  <span
                                    className="w-2 h-2 rounded-full border border-slate-300 flex-shrink-0"
                                    style={getFilamentBackgroundStyle(row.colorHex, row.rgb)}
                                  />
                                )}
                                <span>{row.materialLabel}</span>
                              </div>
                            )}
                          </td>
                          {MILESTONES.map((m) => {
                            const isChecked = Boolean(order?.milestones?.[row.id]?.[m.key]);
                            return (
                              <td key={m.key} className="py-1.5 px-1 text-center align-middle">
                                <span
                                  className={`inline-flex items-center justify-center w-3.5 h-3.5 border-2 rounded-sm text-[9px] font-black ${
                                    isChecked
                                      ? 'border-purple-800 bg-purple-100 text-purple-900 print:border-black print:text-black print:bg-slate-100'
                                      : 'border-slate-400 text-transparent print:border-slate-500'
                                  }`}
                                  title={`${m.label}: ${isChecked ? 'Checked' : 'Pending'}`}
                                >
                                  {isChecked ? '✓' : ''}
                                </span>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Operator Sign-off & Production Run Log */}
                <div className="border-t border-slate-300 pt-4 space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">Operator Name</span>
                      <div className="border-b border-slate-400 h-6"></div>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">Actual Run Time</span>
                      <div className="border-b border-slate-400 h-6"></div>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">Actual Filament (g)</span>
                      <div className="border-b border-slate-400 h-6"></div>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">Date Completed</span>
                      <div className="border-b border-slate-400 h-6"></div>
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">
                      Workshop Notes / Slicer Settings / Anomalies
                    </span>
                    <div className="border-b border-slate-400 h-6"></div>
                    <div className="border-b border-slate-400 h-6 mt-2"></div>
                  </div>
                </div>

              </div>
            )}

          </div>

        </div>

        {/* Modal Footer (Screen Only) */}
        <div className="no-print p-3 bg-slate-800 border-t border-slate-700 flex flex-wrap items-center justify-between text-xs text-slate-400 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span>💡 Tip:</span>
            <span>In the system print preview, select <strong>"Save as PDF"</strong> to save a PDF file or choose your printer to print on paper.</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-300 hover:text-white px-3 py-1 rounded bg-slate-700 hover:bg-slate-600 transition"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default PrintDocumentModal;
