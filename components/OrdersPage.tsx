import React, { useState } from 'react';
import type { Order, Quote } from '../types';
import { OrderStatus } from '../types';
import TrashIcon from './icons/TrashIcon';
import ChevronDownIcon from './icons/ChevronDownIcon';
import CreateOrderIcon from './icons/CreateOrderIcon';

interface OrdersPageProps {
  orders: Order[];
  quotes: Quote[];
  onDelete: (id: string) => void;
  onUpdateStatus: (id: string, status: OrderStatus) => void;
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

const OrderDetailView: React.FC<{ quote: Quote }> = ({ quote }) => {
    return (
      <div className="bg-slate-900/50 p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <DetailItem label="Job Name" value={quote.jobName} />
          <DetailItem label="Customer" value={quote.customerName} />
          <DetailItem label="Quoted Price" value={formatCurrency(quote.quotePrice)} />
        </div>
        {quote.parts && quote.parts.length > 0 && (
          <div className="border-t border-slate-700/60 pt-3">
            <span className="text-sm font-semibold text-cyan-400">Parts List ({quote.parts.length}):</span>
            <div className="flex flex-wrap gap-2 mt-2">
              {quote.parts.map((p, idx) => (
                <span key={p.id || idx} className="bg-slate-800 border border-slate-700 text-xs px-2.5 py-1 rounded-md text-slate-300">
                  {p.name} <span className="text-cyan-400 font-bold">x{p.quantity}</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    );
};

const OrdersPage: React.FC<OrdersPageProps> = ({ orders, quotes, onDelete, onUpdateStatus }) => {
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  const handleToggleExpand = (orderId: string) => {
      setExpandedOrderId(prevId => prevId === orderId ? null : orderId);
  };
  
  return (
    <div className="mt-8">
      <div className="bg-slate-800/50 p-6 rounded-2xl shadow-lg border border-slate-700">
        <div className="flex justify-between items-center border-b border-slate-600 pb-2 mb-6">
          <h2 className="flex items-center gap-3 text-2xl font-semibold text-cyan-400">
            <CreateOrderIcon className="w-7 h-7" />
            Active Orders
          </h2>
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
                         <td colSpan={8} className="px-6 py-4 text-red-400 italic">
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
                      <td className="px-6 py-4">
                        <select 
                          value={order.status}
                          onChange={(e) => onUpdateStatus(order.id, e.target.value as OrderStatus)}
                          onClick={e => e.stopPropagation()}
                          className={`px-3 py-1 text-xs font-semibold rounded-full border ${statusColors[order.status]} bg-transparent appearance-none text-center focus:outline-none focus:ring-1 focus:ring-cyan-400`}
                        >
                          {Object.values(OrderStatus).map(status => (
                            <option key={status} value={status} className="bg-slate-800 text-slate-200">{status}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-6 py-4 text-right">
                       <div className="flex items-center justify-end gap-2" onClick={e => e.stopPropagation()}>
                          <button onClick={() => onDelete(order.id)} className="p-1.5 rounded-full bg-slate-600 hover:bg-red-500/40 text-slate-300 hover:text-red-300 transition-colors" title="Delete Order"><TrashIcon className="w-4 h-4" /></button>
                       </div>
                      </td>
                    </tr>
                    {expandedOrderId === order.id && (
                      <tr className="bg-slate-800 border-b border-slate-700">
                        <td colSpan={8} className="p-0">
                          <OrderDetailView quote={quote} />
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

export default OrdersPage;
