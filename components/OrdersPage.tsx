import React, { useState, useRef } from 'react';
import type { Order, Quote, Filament, Printer } from '../types';
import { OrderStatus } from '../types';
import TrashIcon from './icons/TrashIcon';
import ChevronDownIcon from './icons/ChevronDownIcon';
import CreateOrderIcon from './icons/CreateOrderIcon';
import MarkdownIcon from './icons/MarkdownIcon';
import CameraIcon from './icons/CameraIcon';
import PhotoIcon from './icons/PhotoIcon';
import ImageModal from './ImageModal';
import JobPartsTable from './JobPartsTable';
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
}> = ({ order, quote, filaments = [], printers = [], onUpdateOrderPhoto, onOpenPhotoModal }) => {
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

      {/* Obsidian Markdown Export Actions */}
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
        <span className="text-xs text-slate-400">
          Ready to save into your Obsidian Vault for order tracking & fulfillment logs.
        </span>
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
}) => {
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [modalImage, setModalImage] = useState<{ url: string; title: string } | null>(null);

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
    if (orders.length === 0) return;
    const today = new Date().toISOString().split('T')[0];
    const md = generateAllOrdersMarkdown(orders, quotes, filaments, printers);
    downloadMarkdownFile(`3D_Print_Orders_Obsidian_${today}.md`, md);
  };

  const handleExportAllInvoicesMarkdown = () => {
    if (orders.length === 0) return;
    const today = new Date().toISOString().split('T')[0];
    // Gather quotes for current orders
    const orderQuotes = orders.map(o => quotes.find(q => q.id === o.quoteId)).filter(Boolean) as Quote[];
    const md = generateAllInvoicesMarkdown(orderQuotes, filaments, printers);
    downloadMarkdownFile(`3D_Print_Invoices_Obsidian_${today}.md`, md);
  };
  
  return (
    <div className="mt-8 pb-12">
      <div className="bg-slate-800/50 p-6 rounded-2xl shadow-lg border border-slate-700">
        <div className="flex flex-wrap justify-between items-center gap-3 border-b border-slate-600 pb-2 mb-6">
          <div className="flex items-center gap-3">
            <CreateOrderIcon className="w-7 h-7 text-cyan-400" />
            <h2 className="text-2xl font-semibold text-cyan-400">
              Active Orders
            </h2>
            <span className="text-xs text-slate-400 bg-slate-800 px-2.5 py-1 rounded-full border border-slate-700">
              {orders.length} {orders.length === 1 ? 'order' : 'orders'}
            </span>
          </div>
          {orders.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleExportAllMarkdown}
                className="flex items-center gap-2 bg-purple-700 hover:bg-purple-600 text-purple-100 font-semibold py-2 px-3.5 rounded-lg transition-colors text-sm shadow-sm"
                title="Export all orders as an Obsidian-ready Markdown archive note (.md)"
              >
                <MarkdownIcon className="w-4 h-4" />
                <span>Export Orders (.md)</span>
              </button>
              <button
                onClick={handleExportAllInvoicesMarkdown}
                className="flex items-center gap-2 bg-indigo-700 hover:bg-indigo-600 text-indigo-100 font-semibold py-2 px-3.5 rounded-lg transition-colors text-sm shadow-sm"
                title="Export all customer invoices for these orders as an Obsidian-ready note (.md) linking to parts/"
              >
                <span>🧾 Export Invoices (.md)</span>
              </button>
            </div>
          )}
        </div>

        {orders.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            <h3 className="text-xl font-semibold">No Active Orders</h3>
            <p className="mt-2">Accept a job from the 'Jobs' page to create a new order.</p>
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
                {orders.map(order => {
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
                      <td className="px-6 py-4 font-medium text-slate-300">#{order.orderNumber}</td>
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

                      {/* Status Dropdown */}
                      <td className="px-6 py-4">
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
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                       <div className="flex items-center justify-end gap-2" onClick={e => e.stopPropagation()}>
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
    </div>
  );
};

export default OrdersPage;
