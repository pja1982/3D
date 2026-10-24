import React, { useState, useRef } from 'react';
import type { Order, Quote, Filament, Printer } from '../types';
import { OrderStatus } from '../types';
import TrashIcon from './icons/TrashIcon';
import ChevronDownIcon from './icons/ChevronDownIcon';
import CreateOrderIcon from './icons/CreateOrderIcon';
import MarkdownIcon from './icons/MarkdownIcon';
import CameraIcon from './icons/CameraIcon';
import PhotoIcon from './icons/PhotoIcon';
import ArchiveIcon from './icons/ArchiveIcon';
import RestoreIcon from './icons/RestoreIcon';
import PrinterIcon from './icons/PrinterIcon';
import ClipboardCheckIcon from './icons/ClipboardCheckIcon';
import ImageModal from './ImageModal';
import JobPartsTable from './JobPartsTable';
import PrintDocumentModal from './PrintDocumentModal';
import OrderMilestonesTracker from './OrderMilestonesTracker';
import { getOrderMilestoneStats } from '../utils/orderMilestones';
import type { GeneralSettings } from '../types';
import { compressAndFormatImage, isValidImageFile } from '../utils/imageUtils';
import { 
  generateOrderMarkdown, 
  generateAllOrdersMarkdown, 
  generateInvoiceMarkdown, 
  generateAllInvoicesMarkdown, 
  downloadMarkdownFile, 
  copyMarkdownToClipboard 
} from '../utils/markdownExport';

interface OrdersPageProps {
  orders: Order[];
  quotes: Quote[];
  filaments?: Filament[];
  printers?: Printer[];
  onDelete: (id: string) => void;
  onUpdateStatus: (id: string, status: OrderStatus) => void;
  onUpdateOrderPhoto?: (id: string, imageUrl?: string) => void;
  onArchive?: (id: string, archive: boolean) => void;
  generalSettings?: GeneralSettings;
  onUpdateGeneralSettings?: (settings: Partial<GeneralSettings>) => void;
  onUpdateOrderMilestones?: (orderId: string, milestones: Record<string, Partial<Record<string, boolean>>>) => void;
}

const statusColors: Record<OrderStatus, string> = {
  [OrderStatus.InProgress]: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  [OrderStatus.Completed]: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  [OrderStatus.Shipped]: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
  [OrderStatus.Cancelled]: 'bg-red-500/20 text-red-300 border-red-500/30',
};

const formatCurrency = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString();

const DetailItem: React.FC<{ label: string; value: string | number }> = ({ label, value }) => (
  <div className="flex justify-between text-sm py-1">
    <span className="text-slate-400">{label}:</span>
    <span className="font-medium text-slate-200 text-right">{value}</span>
  </div>
);

const OrderDetailView: React.FC<{
  order: Order;
  quote: Quote;
  filaments?: Filament[];
  printers?: Printer[];
  onUpdateOrderPhoto?: (id: string, imageUrl?: string) => void;
  onOpenPhotoModal: (url: string, title: string) => void;
  onArchive?: (id: string, archive: boolean) => void;
  onPrint?: (order: Order, quote: Quote, docType: 'quote' | 'checklist') => void;
  onUpdateOrderMilestones?: (orderId: string, milestones: Record<string, Partial<Record<string, boolean>>>) => void;
  onUpdateStatus?: (id: string, status: OrderStatus) => void;
}> = ({ order, quote, filaments = [], printers = [], onUpdateOrderPhoto, onOpenPhotoModal, onArchive, onPrint, onUpdateOrderMilestones, onUpdateStatus }) => {
  const [copied, setCopied] = useState(false);
  const [copiedInvoice, setCopiedInvoice] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDownloadMd = () => {
    const cleanJob = (quote.jobName || 'Order').replace(/[^a-zA-Z0-9_-]/g, '_');
    downloadMarkdownFile(`Order_${order.orderNumber}_${cleanJob}.md`, generateOrderMarkdown(order, quote, filaments, printers));
  };

  const handleDownloadInvoice = () => {
    const cleanJob = (quote.jobName || 'Invoice').replace(/[^a-zA-Z0-9_-]/g, '_');
    downloadMarkdownFile(`Invoice_Order_${order.orderNumber}_${cleanJob}.md`, generateInvoiceMarkdown(quote, filaments, printers, order));
  };

  const handleCopyMd = async () => {
    const ok = await copyMarkdownToClipboard(generateOrderMarkdown(order, quote, filaments, printers));
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCopyInvoice = async () => {
    const ok = await copyMarkdownToClipboard(generateInvoiceMarkdown(quote, filaments, printers, order));
    if (ok) {
      setCopiedInvoice(true);
      setTimeout(() => setCopiedInvoice(false), 2000);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!isValidImageFile(file)) {
      alert('Please choose a valid image file (JPG, PNG, WEBP, etc.)');
      return;
    }

    try {
      setIsCompressing(true);
      const compressedDataUrl = await compressAndFormatImage(file, {
        maxWidth: 1200,
        maxHeight: 1200,
        quality: 0.84,
      });
      if (onUpdateOrderPhoto) {
        onUpdateOrderPhoto(order.id, compressedDataUrl);
      }
    } catch (err) {
      console.error('Failed to compress order photo', err);
      alert('Error processing photo. Please try a different image.');
    } finally {
      setIsCompressing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleApplyUrl = () => {
    if (urlInput.trim() && onUpdateOrderPhoto) {
      onUpdateOrderPhoto(order.id, urlInput.trim());
      setUrlInput('');
      setShowUrlInput(false);
    }
  };

  const handleRemovePhoto = () => {
    if (onUpdateOrderPhoto && window.confirm('Remove finished order photo?')) {
      onUpdateOrderPhoto(order.id, undefined);
    }
  };

  const isCompleted = order.status === OrderStatus.Completed;

  return (
    <div className="bg-slate-900/50 p-5 space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <DetailItem label="Job Name" value={quote.jobName} />
        <DetailItem label="Customer" value={quote.customerName} />
        <DetailItem label="Quoted Price" value={formatCurrency(quote.quotePrice)} />
      </div>

      {/* Order Fabrication Parts Table */}
      <div className="border-t border-slate-700/60 pt-4">
        <JobPartsTable
          quote={quote}
          filaments={filaments}
          printers={printers}
          onOpenPhotoModal={onOpenPhotoModal}
          title={`Order #${order.orderNumber} Parts & Production Table`}
        />
      </div>

      {/* Fabrication & Quality Milestones Interactive Tracker */}
      <div className="border-t border-slate-700/60 pt-4">
        <OrderMilestonesTracker
          order={order}
          quote={quote}
          filaments={filaments}
          printers={printers}
          onUpdateMilestones={onUpdateOrderMilestones}
          onUpdateStatus={onUpdateStatus}
        />
      </div>

      {/* Completed Print Photo Section */}
      <div className="border-t border-slate-700/60 pt-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <CameraIcon className="w-4 h-4 text-purple-400" />
            <span>Finished Print & Inspection Photo</span>
            {order.completedImageUrl ? (
              <span className="text-[11px] bg-purple-900/50 border border-purple-500/40 text-purple-300 px-2 py-0.5 rounded-full font-medium">
                ✓ Photo Documented
              </span>
            ) : isCompleted ? (
              <span className="text-[11px] bg-amber-900/40 border border-amber-600/40 text-amber-300 px-2 py-0.5 rounded-full font-medium">
                Photo Recommended for Completed Order
              </span>
            ) : null}
          </h4>

          {order.completedImageUrl && (
            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={() => onOpenPhotoModal(order.completedImageUrl!, `Order #${order.orderNumber} Completed Print: ${quote.jobName}`)}
                className="text-cyan-400 hover:text-cyan-300 transition"
              >
                View Fullscreen
              </button>
              <span className="text-slate-600">•</span>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-purple-400 hover:text-purple-300 transition"
              >
                Replace
              </button>
              <span className="text-slate-600">•</span>
              <button
                type="button"
                onClick={handleRemovePhoto}
                className="text-red-400 hover:text-red-300 transition"
              >
                Remove
              </button>
            </div>
          )}
        </div>

        {order.completedImageUrl ? (
          <div className="bg-slate-950/70 p-3 rounded-xl border border-purple-900/40 flex flex-col sm:flex-row items-center gap-4">
            <div
              className="relative group cursor-pointer w-full sm:w-48 h-36 rounded-lg overflow-hidden border border-slate-700 flex-shrink-0 bg-slate-900 shadow-md"
              onClick={() => onOpenPhotoModal(order.completedImageUrl!, `Order #${order.orderNumber} Completed Print: ${quote.jobName}`)}
              title="Click to view full size"
            >
              <img
                src={order.completedImageUrl}
                alt={`Order #${order.orderNumber} finished print`}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
              />
              <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <PhotoIcon className="w-6 h-6 text-white drop-shadow-md" />
              </div>
            </div>

            <div className="text-xs text-slate-400 space-y-1.5 flex-1">
              <div className="text-slate-200 font-semibold text-sm flex items-center gap-1.5">
                <span>Completed 3D Print Documentation</span>
              </div>
              <p>
                This photo verifies dimensional quality, surface finish, and print completeness for Order #{order.orderNumber} ({quote.jobName}).
              </p>
              {order.completedAt && (
                <p className="text-slate-500 font-mono text-[11px]">
                  Recorded on {new Date(order.completedAt).toLocaleDateString()} at {new Date(order.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              )}
              <div className="pt-1">
                <span className="text-purple-400 bg-purple-950/60 border border-purple-800/60 px-2 py-0.5 rounded text-[11px] font-medium">
                  Included in Obsidian Markdown export
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-slate-950/40 p-4 rounded-xl border border-dashed border-slate-700 hover:border-purple-500/60 transition">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handlePhotoUpload}
              accept="image/*"
              className="hidden"
            />
            
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-950/50 border border-purple-800/40 flex items-center justify-center text-purple-400 flex-shrink-0">
                  <CameraIcon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-200">
                    {isCompleted ? 'Add a photo of the completed 3D print' : 'Add finished or test print photo'}
                  </p>
                  <p className="text-xs text-slate-400">
                    Upload camera shot or inspection image to keep visual records with this order.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isCompressing}
                  className="bg-purple-700 hover:bg-purple-600 text-white font-medium py-1.5 px-3 rounded-lg text-xs transition shadow flex items-center gap-1.5"
                >
                  <CameraIcon className="w-3.5 h-3.5" />
                  <span>{isCompressing ? 'Processing...' : 'Upload Photo'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowUrlInput(!showUrlInput)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium py-1.5 px-3 rounded-lg text-xs transition border border-slate-700"
                >
                  {showUrlInput ? 'Cancel' : 'Paste URL'}
                </button>
              </div>
            </div>

            {showUrlInput && (
              <div className="flex gap-2 mt-3 pt-3 border-t border-slate-800">
                <input
                  type="url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://example.com/finished-print.jpg"
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-md py-1.5 px-3 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
                <button
                  type="button"
                  onClick={handleApplyUrl}
                  className="bg-purple-700 hover:bg-purple-600 text-white text-xs px-3.5 py-1.5 rounded-md font-medium transition"
                >
                  Attach Photo
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Actions & Obsidian Markdown Exports */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-700/60 pt-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleDownloadMd}
            className="flex items-center gap-1.5 bg-purple-700 hover:bg-purple-600 text-purple-100 font-semibold py-1.5 px-3 rounded-lg text-xs shadow transition-colors"
            title="Download this order as an Obsidian Markdown note (.md)"
          >
            <MarkdownIcon className="w-3.5 h-3.5" />
            <span>Export Order (.md)</span>
          </button>
          <button
            type="button"
            onClick={handleDownloadInvoice}
            className="flex items-center gap-1.5 bg-indigo-700 hover:bg-indigo-600 text-indigo-100 font-semibold py-1.5 px-3 rounded-lg text-xs shadow transition-colors"
            title="Download customer invoice for this order as an Obsidian note (.md) linking to parts/"
          >
            <span>🧾 Export Invoice (.md)</span>
          </button>
          <button
            type="button"
            onClick={handleCopyMd}
            className="flex items-center gap-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium py-1.5 px-3 rounded-lg text-xs transition"
            title="Copy Obsidian Markdown note to clipboard"
          >
            <span>{copied ? '✓ Copied Order!' : 'Copy Order'}</span>
          </button>
          <button
            type="button"
            onClick={handleCopyInvoice}
            className="flex items-center gap-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium py-1.5 px-3 rounded-lg text-xs transition"
            title="Copy Invoice Markdown note to clipboard"
          >
            <span>{copiedInvoice ? '✓ Copied Invoice!' : 'Copy Invoice'}</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {onPrint && (
            <>
              <button
                type="button"
                onClick={() => onPrint(order, quote, 'quote')}
                className="flex items-center gap-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold py-1.5 px-3 rounded-lg text-xs shadow transition-colors cursor-pointer"
                title="Print Customer Invoice to PDF or physical paper"
              >
                <PrinterIcon className="w-3.5 h-3.5" />
                <span>Print Invoice (PDF)</span>
              </button>
              <button
                type="button"
                onClick={() => onPrint(order, quote, 'checklist')}
                className="flex items-center gap-1.5 bg-purple-700 hover:bg-purple-600 text-purple-100 font-semibold py-1.5 px-3 rounded-lg text-xs shadow transition-colors cursor-pointer"
                title="Print Order Production Fabrication Checklist to PDF or paper"
              >
                <ClipboardCheckIcon className="w-3.5 h-3.5" />
                <span>Print Checklist (PDF)</span>
              </button>
            </>
          )}
          {onArchive && (
            <button
              type="button"
              onClick={() => onArchive(order.id, !order.isArchived)}
              className={`flex items-center gap-1.5 font-semibold py-1.5 px-3 rounded-lg text-xs shadow transition-colors cursor-pointer ${
                order.isArchived
                  ? 'bg-amber-600 hover:bg-amber-500 text-white'
                  : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
              }`}
              title={order.isArchived ? "Restore this order to active orders" : "Archive this order to remove from active list"}
            >
              {order.isArchived ? <RestoreIcon className="w-3.5 h-3.5" /> : <ArchiveIcon className="w-3.5 h-3.5" />}
              <span>{order.isArchived ? 'Restore to Active' : 'Archive Order'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const OrdersPage: React.FC<OrdersPageProps> = ({
  orders,
  quotes,
  filaments = [],
  printers = [],
  onDelete,
  onUpdateStatus,
  onUpdateOrderPhoto,
  onArchive,
  generalSettings,
  onUpdateGeneralSettings,
  onUpdateOrderMilestones,
}) => {
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [modalImage, setModalImage] = useState<{ url: string; title: string } | null>(null);
  const [archiveFilter, setArchiveFilter] = useState<'active' | 'archived' | 'all'>('active');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [printModalState, setPrintModalState] = useState<{
    isOpen: boolean;
    order: Order | null;
    quote: Quote | null;
    docType: 'quote' | 'checklist';
  }>({
    isOpen: false,
    order: null,
    quote: null,
    docType: 'quote',
  });

  const activeCount = orders.filter(o => !o.isArchived).length;
  const archivedCount = orders.filter(o => o.isArchived).length;
  const totalCount = orders.length;

  const displayOrders = orders.filter(o => {
    if (archiveFilter === 'active' && o.isArchived) return false;
    if (archiveFilter === 'archived' && !o.isArchived) return false;
    if (searchQuery.trim()) {
      const qLower = searchQuery.toLowerCase();
      const quote = quotes.find(q => q.id === o.quoteId);
      const matchOrderNum = o.orderNumber.toString().includes(qLower);
      const matchJob = quote ? quote.jobName.toLowerCase().includes(qLower) : false;
      const matchCust = quote ? quote.customerName.toLowerCase().includes(qLower) : false;
      const matchStatus = o.status.toLowerCase().includes(qLower);
      if (!matchOrderNum && !matchJob && !matchCust && !matchStatus) return false;
    }
    return true;
  });

  const handleToggleExpand = (orderId: string) => {
    setExpandedOrderId(prevId => prevId === orderId ? null : orderId);
  };

  const handleStatusChange = (orderId: string, newStatus: OrderStatus) => {
    onUpdateStatus(orderId, newStatus);
    // If marked as Completed and order doesn't have a photo yet, automatically expand it so user can add the photo
    if (newStatus === OrderStatus.Completed) {
      setExpandedOrderId(orderId);
    }
  };

  const handleExportAllMarkdown = () => {
    const listToExport = displayOrders.length > 0 ? displayOrders : orders;
    if (listToExport.length === 0) return;
    const today = new Date().toISOString().split('T')[0];
    const md = generateAllOrdersMarkdown(listToExport, quotes, filaments, printers);
    downloadMarkdownFile(`3D_Print_Orders_${archiveFilter}_${today}.md`, md);
  };

  const handleExportAllInvoicesMarkdown = () => {
    const listToExport = displayOrders.length > 0 ? displayOrders : orders;
    if (listToExport.length === 0) return;
    const today = new Date().toISOString().split('T')[0];
    // Gather quotes for current orders
    const orderQuotes = listToExport.map(o => quotes.find(q => q.id === o.quoteId)).filter(Boolean) as Quote[];
    const md = generateAllInvoicesMarkdown(orderQuotes, filaments, printers);
    downloadMarkdownFile(`3D_Print_Invoices_${archiveFilter}_${today}.md`, md);
  };
  
  return (
    <div className="mt-8 pb-12">
      <div className="bg-slate-800/50 p-6 rounded-2xl shadow-lg border border-slate-700">
        <div className="flex flex-wrap justify-between items-center gap-3 border-b border-slate-600 pb-3 mb-6">
          <div className="flex items-center gap-3">
            <CreateOrderIcon className="w-7 h-7 text-cyan-400" />
            <h2 className="text-2xl font-semibold text-cyan-400">
              Orders Tracking
            </h2>
            <span className="text-xs text-slate-400 bg-slate-800 px-2.5 py-1 rounded-full border border-slate-700">
              {displayOrders.length} shown ({activeCount} active{archivedCount > 0 ? `, ${archivedCount} archived` : ''})
            </span>
          </div>
          {orders.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleExportAllMarkdown}
                className="flex items-center gap-2 bg-purple-700 hover:bg-purple-600 text-purple-100 font-semibold py-2 px-3.5 rounded-lg transition-colors text-sm shadow-sm"
                title="Export shown orders as an Obsidian-ready Markdown archive note (.md)"
              >
                <MarkdownIcon className="w-4 h-4" />
                <span>Export Orders (.md)</span>
              </button>
              <button
                onClick={handleExportAllInvoicesMarkdown}
                className="flex items-center gap-2 bg-indigo-700 hover:bg-indigo-600 text-indigo-100 font-semibold py-2 px-3.5 rounded-lg transition-colors text-sm shadow-sm"
                title="Export customer invoices for shown orders as an Obsidian-ready note (.md)"
              >
                <span>🧾 Export Invoices (.md)</span>
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
              <span>Active Orders</span>
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
              <span>All Orders</span>
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
              placeholder="Search by order #, job, customer..."
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

        {orders.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            <h3 className="text-xl font-semibold">No Orders Found</h3>
            <p className="mt-2">Accept a job from the 'Jobs' page to create a new order.</p>
          </div>
        ) : displayOrders.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            <h3 className="text-xl font-semibold">
              {searchQuery
                ? `No orders match "${searchQuery}"`
                : archiveFilter === 'archived'
                ? 'No Archived Orders'
                : 'No Active Orders Found'}
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
                'Orders you archive will be kept here safely without cluttering active production.'
              ) : (
                'All orders are currently archived. Switch to the Archived tab to view or restore them.'
              )}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="text-xs text-slate-400 uppercase bg-slate-800">
                <tr>
                  <th scope="col" className="px-2 py-3 w-12"><span className="sr-only">Details</span></th>
                  <th scope="col" className="px-6 py-3">Order #</th>
                  <th scope="col" className="px-6 py-3">Job Name</th>
                  <th scope="col" className="px-6 py-3">Customer</th>
                  <th scope="col" className="px-6 py-3">Date</th>
                  <th scope="col" className="px-6 py-3">Price</th>
                  <th scope="col" className="px-6 py-3">Finished Photo</th>
                  <th scope="col" className="px-6 py-3">Status</th>
                  <th scope="col" className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayOrders.map(order => {
                  const quote = quotes.find(q => q.id === order.quoteId);
                  if (!quote) {
                    return (
                       <tr key={order.id} className="border-b border-slate-700 bg-red-900/20">
                         <td colSpan={9} className="px-6 py-4 text-red-400 italic">
                            Order #{order.orderNumber} - Associated quote has been deleted.
                         </td>
                       </tr>
                    );
                  }

                  const milestoneStats = getOrderMilestoneStats(order, quote, filaments, printers);

                  return (
                  <React.Fragment key={order.id}>
                    <tr 
                      className={`border-b border-slate-700 transition-colors cursor-pointer ${expandedOrderId === order.id ? 'bg-slate-700/80' : 'hover:bg-slate-700/50'}`}
                      onClick={() => handleToggleExpand(order.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleToggleExpand(order.id)}
                      aria-expanded={expandedOrderId === order.id}
                    >
                      <td className="px-2 py-4 text-center">
                        <ChevronDownIcon className={`w-5 h-5 text-slate-400 transition-transform ${expandedOrderId === order.id ? 'rotate-180' : ''}`} />
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-300">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span>#{order.orderNumber}</span>
                          {order.isArchived && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.2 rounded-full">
                              🗄️ Archived
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-100">{quote.jobName}</td>
                      <td className="px-6 py-4 text-slate-300">{quote.customerName}</td>
                      <td className="px-6 py-4 text-slate-400">{formatDate(order.createdAt)}</td>
                      <td className="px-6 py-4 font-mono text-cyan-400">{formatCurrency(quote.quotePrice)}</td>

                      {/* Finished Photo Column */}
                      <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                        {order.completedImageUrl ? (
                          <div 
                            className="flex items-center gap-2 cursor-pointer group"
                            onClick={() => setModalImage({ url: order.completedImageUrl!, title: `Order #${order.orderNumber} Completed Print: ${quote.jobName}` })}
                            title="Click to view full finished photo"
                          >
                            <img
                              src={order.completedImageUrl}
                              alt={`Order #${order.orderNumber}`}
                              className="w-9 h-9 rounded-lg object-cover border border-purple-500/50 group-hover:border-purple-400 transition shadow-sm"
                            />
                            <span className="text-[11px] text-purple-300 font-medium group-hover:underline hidden sm:inline">
                              View Photo
                            </span>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              handleToggleExpand(order.id);
                            }}
                            className="text-xs text-slate-500 hover:text-purple-300 transition flex items-center gap-1"
                            title="Click to expand and add photo"
                          >
                            <CameraIcon className="w-3.5 h-3.5" />
                            <span className="text-[11px]">+ Add</span>
                          </button>
                        )}
                      </td>

                      {/* Status Dropdown & Fabrication Milestone Progress */}
                      <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex flex-col gap-1.5 items-start">
                          <select 
                            value={order.status}
                            onChange={(e) => handleStatusChange(order.id, e.target.value as OrderStatus)}
                            onClick={e => e.stopPropagation()}
                            className={`px-3 py-1 text-xs font-semibold rounded-full border ${statusColors[order.status]} bg-transparent appearance-none text-center focus:outline-none focus:ring-1 focus:ring-cyan-400 cursor-pointer`}
                          >
                            {Object.values(OrderStatus).map(status => (
                              <option key={status} value={status} className="bg-slate-800 text-slate-200">{status}</option>
                            ))}
                          </select>

                          {/* Interactive Checklist Quick Indicator */}
                          {milestoneStats.totalSteps > 0 && (
                            <button
                              type="button"
                              onClick={() => handleToggleExpand(order.id)}
                              className="group flex items-center gap-1.5 py-0.5 text-left cursor-pointer transition hover:opacity-90"
                              title={`${milestoneStats.completedSteps} of ${milestoneStats.totalSteps} milestones checked (${milestoneStats.percent}% complete) - Click to open fabrication checklist`}
                            >
                              <div className="w-14 h-1.5 bg-slate-700/80 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full transition-all duration-300 ${
                                    milestoneStats.percent === 100 
                                      ? 'bg-emerald-400' 
                                      : milestoneStats.completedSteps > 0 
                                        ? 'bg-purple-400' 
                                        : 'bg-transparent'
                                  }`}
                                  style={{ width: `${milestoneStats.percent}%` }}
                                />
                              </div>
                              <span className={`text-[10px] font-mono font-medium ${
                                milestoneStats.percent === 100 
                                  ? 'text-emerald-400 font-bold' 
                                  : milestoneStats.completedSteps > 0 
                                    ? 'text-purple-300 group-hover:text-purple-200' 
                                    : 'text-slate-500 group-hover:text-slate-400'
                              }`}>
                                {milestoneStats.completedSteps}/{milestoneStats.totalSteps}
                              </span>
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                       <div className="flex items-center justify-end gap-2" onClick={e => e.stopPropagation()}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setPrintModalState({ isOpen: true, order, quote, docType: 'quote' });
                            }}
                            className="p-1.5 rounded-full bg-cyan-500/20 hover:bg-cyan-500/40 text-cyan-300 transition-colors cursor-pointer"
                            title="Print Customer Invoice (PDF or Paper)"
                          >
                            <PrinterIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setPrintModalState({ isOpen: true, order, quote, docType: 'checklist' });
                            }}
                            className="p-1.5 rounded-full bg-purple-500/20 hover:bg-purple-500/40 text-purple-300 transition-colors cursor-pointer"
                            title="Print Order Production Fabrication Checklist (PDF or Paper)"
                          >
                            <ClipboardCheckIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const cleanJob = (quote.jobName || 'Order').replace(/[^a-zA-Z0-9_-]/g, '_');
                              downloadMarkdownFile(`Order_${order.orderNumber}_${cleanJob}.md`, generateOrderMarkdown(order, quote, filaments, printers));
                            }}
                            className="p-1.5 rounded-full bg-purple-500/20 hover:bg-purple-500/40 text-purple-300 transition-colors"
                            title="Export to Obsidian Order Markdown (.md)"
                          >
                            <MarkdownIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const cleanJob = (quote.jobName || 'Invoice').replace(/[^a-zA-Z0-9_-]/g, '_');
                              downloadMarkdownFile(`Invoice_Order_${order.orderNumber}_${cleanJob}.md`, generateInvoiceMarkdown(quote, filaments, printers, order));
                            }}
                            className="p-1.5 rounded-full bg-indigo-500/20 hover:bg-indigo-500/40 text-indigo-300 transition-colors text-xs flex items-center justify-center font-bold"
                            title="Export Customer Invoice (.md)"
                          >
                            🧾
                          </button>
                          {onArchive && (
                            <button
                              onClick={() => onArchive(order.id, !order.isArchived)}
                              className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                                order.isArchived
                                  ? 'bg-amber-500/20 hover:bg-amber-500/40 text-amber-300'
                                  : 'bg-slate-700/60 hover:bg-amber-500/30 text-slate-300 hover:text-amber-300'
                              }`}
                              title={order.isArchived ? "Restore to Active Orders" : "Archive Order"}
                            >
                              {order.isArchived ? <RestoreIcon className="w-4 h-4" /> : <ArchiveIcon className="w-4 h-4" />}
                            </button>
                          )}
                          <button
                            onClick={() => onDelete(order.id)}
                            className="p-1.5 rounded-full bg-slate-600 hover:bg-red-500/40 text-slate-300 hover:text-red-300 transition-colors"
                            title="Delete Order"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                       </div>
                      </td>
                    </tr>
                    {expandedOrderId === order.id && (
                      <tr className="bg-slate-800 border-b border-slate-700">
                        <td colSpan={9} className="p-0">
                          <OrderDetailView
                            order={order}
                            quote={quote}
                            filaments={filaments}
                            printers={printers}
                            onUpdateOrderPhoto={onUpdateOrderPhoto}
                            onOpenPhotoModal={(url, title) => setModalImage({ url, title })}
                            onArchive={onArchive}
                            onPrint={(o, q, docType) => setPrintModalState({ isOpen: true, order: o, quote: q, docType })}
                            onUpdateOrderMilestones={onUpdateOrderMilestones}
                            onUpdateStatus={onUpdateStatus}
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

      {/* Lightbox Modal */}
      {modalImage && (
        <ImageModal
          isOpen={true}
          onClose={() => setModalImage(null)}
          imageUrl={modalImage.url}
          title={modalImage.title}
          subtitle="Completed 3D print & inspection record"
        />
      )}

      {/* Print Document Modal */}
      {printModalState.isOpen && printModalState.quote && (
        <PrintDocumentModal
          isOpen={printModalState.isOpen}
          onClose={() => setPrintModalState(prev => ({ ...prev, isOpen: false }))}
          quote={printModalState.quote}
          order={printModalState.order}
          filaments={filaments}
          printers={printers}
          initialDocType={printModalState.docType}
          generalSettings={generalSettings}
          onUpdateGeneralSettings={onUpdateGeneralSettings}
        />
      )}
    </div>
  );
};

export default OrdersPage;
