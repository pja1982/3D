

import React from 'react';
import type { Quote } from '../types';
import { QuoteStatus } from '../types';
import TrashIcon from './icons/TrashIcon';
import CheckIcon from './icons/CheckIcon';
import XIcon from './icons/XIcon';

interface QuoteListProps {
  quotes: Quote[];
  onDelete: (id: string) => void;
  onUpdateStatus: (id: string, status: QuoteStatus) => void;
}

const statusColors: Record<QuoteStatus, string> = {
  [QuoteStatus.Pending]: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  [QuoteStatus.Accepted]: 'bg-green-500/20 text-green-300 border-green-500/30',
  [QuoteStatus.Rejected]: 'bg-red-500/20 text-red-300 border-red-500/30',
};

const QuoteItem: React.FC<{ quote: Quote; onDelete: (id: string) => void; onUpdateStatus: (id: string, status: QuoteStatus) => void }> = ({ quote, onDelete, onUpdateStatus }) => {
  return (
    <li className="bg-slate-800 p-4 rounded-lg border border-slate-700 hover:border-cyan-500 transition-all duration-300">
      <div className="flex justify-between items-start">
        <div>
          {/* Fix: Property 'name' does not exist on type 'Quote'. Use 'jobName' instead. */}
          <h3 className="font-bold text-lg text-slate-100">{quote.jobName}</h3>
          <p className="text-sm text-slate-400">Created: {new Date(quote.createdAt).toLocaleDateString()}</p>
          <p className="text-2xl font-bold text-cyan-400 mt-2">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(quote.quotePrice)}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
            <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${statusColors[quote.status]}`}>
                {quote.status}
            </span>
            <div className="flex items-center gap-2 mt-2">
                <button onClick={() => onUpdateStatus(quote.id, QuoteStatus.Accepted)} className="p-1.5 rounded-full bg-green-500/20 hover:bg-green-500/40 text-green-300 transition-colors"><CheckIcon className="w-4 h-4" /></button>
                <button onClick={() => onUpdateStatus(quote.id, QuoteStatus.Rejected)} className="p-1.5 rounded-full bg-red-500/20 hover:bg-red-500/40 text-red-300 transition-colors"><XIcon className="w-4 h-4" /></button>
                <button onClick={() => onDelete(quote.id)} className="p-1.5 rounded-full bg-slate-600 hover:bg-red-500/40 text-slate-300 hover:text-red-300 transition-colors"><TrashIcon className="w-4 h-4" /></button>
            </div>
        </div>
      </div>
    </li>
  );
};


const QuoteList: React.FC<QuoteListProps> = ({ quotes, onDelete, onUpdateStatus }) => {
  return (
    <div>
      <h2 className="text-2xl font-semibold text-cyan-400 border-b border-slate-600 pb-2 mb-4">Saved Quotes</h2>
      {quotes.length === 0 ? (
        <div className="text-center py-10 text-slate-500">
          <p>You have no saved quotes.</p>
          <p className="text-sm">Use the calculator and click "Save Quote" to add one.</p>
        </div>
      ) : (
        <ul className="space-y-4 max-h-96 overflow-y-auto pr-2">
          {quotes.map(quote => (
            <QuoteItem key={quote.id} quote={quote} onDelete={onDelete} onUpdateStatus={onUpdateStatus} />
          ))}
        </ul>
      )}
    </div>
  );
};

export default QuoteList;