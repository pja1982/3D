import React from 'react';
import type { Quote } from '../types';
import { QuoteStatus } from '../types';
import TrashIcon from './icons/TrashIcon';
import CheckIcon from './icons/CheckIcon';
import XIcon from './icons/XIcon';

interface JobsPageProps {
  quotes: Quote[];
  onDelete: (id: string) => void;
  onUpdateStatus: (id: string, status: QuoteStatus) => void;
}

const statusColors: Record<QuoteStatus, string> = {
  [QuoteStatus.Pending]: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  [QuoteStatus.Accepted]: 'bg-green-500/20 text-green-300 border-green-500/30',
  [QuoteStatus.Rejected]: 'bg-red-500/20 text-red-300 border-red-500/30',
};

const JobsPage: React.FC<JobsPageProps> = ({ quotes, onDelete, onUpdateStatus }) => {
  const formatCurrency = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString();

  return (
    <div className="mt-8">
      <div className="bg-slate-800/50 p-6 rounded-2xl shadow-lg border border-slate-700">
        <h2 className="text-2xl font-semibold text-cyan-400 border-b border-slate-600 pb-2 mb-6">
          Saved Jobs & Quotes
        </h2>
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
                {quotes.map(quote => (
                  <tr key={quote.id} className="bg-slate-800/50 border-b border-slate-700 hover:bg-slate-700/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-300">#{quote.jobNumber}</td>
                    <td className="px-6 py-4 font-bold text-slate-100">{quote.jobName}</td>
                    <td className="px-6 py-4 text-slate-300">{quote.customerName}</td>
                    <td className="px-6 py-4 text-slate-400">{formatDate(quote.createdAt)}</td>
                    <td className="px-6 py-4 font-mono text-cyan-400">{formatCurrency(quote.quotePrice)}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${statusColors[quote.status]}`}>
                        {quote.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                       <div className="flex items-center justify-end gap-2">
                          <button onClick={() => onUpdateStatus(quote.id, QuoteStatus.Accepted)} className="p-1.5 rounded-full bg-green-500/20 hover:bg-green-500/40 text-green-300 transition-colors" title="Accept"><CheckIcon className="w-4 h-4" /></button>
                          <button onClick={() => onUpdateStatus(quote.id, QuoteStatus.Rejected)} className="p-1.5 rounded-full bg-red-500/20 hover:bg-red-500/40 text-red-300 transition-colors" title="Reject"><XIcon className="w-4 h-4" /></button>
                          <button onClick={() => onDelete(quote.id)} className="p-1.5 rounded-full bg-slate-600 hover:bg-red-500/40 text-slate-300 hover:text-red-300 transition-colors" title="Delete"><TrashIcon className="w-4 h-4" /></button>
                       </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default JobsPage;
