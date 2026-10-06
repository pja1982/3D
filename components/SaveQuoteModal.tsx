import React, { useState, useEffect } from 'react';

interface SaveQuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (jobName: string, customerName: string, jobNumber: number, isCreateNew?: boolean) => void;
  nextJobNumber: number;
  initialJobName?: string;
  initialCustomerName?: string;
  initialJobNumber?: number;
  isRevision?: boolean;
}

const SaveQuoteModal: React.FC<SaveQuoteModalProps> = ({ 
  isOpen, 
  onClose, 
  onSave, 
  nextJobNumber,
  initialJobName = '',
  initialCustomerName = '',
  initialJobNumber,
  isRevision = false,
}) => {
  const [jobName, setJobName] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [jobNumber, setJobNumber] = useState(nextJobNumber);
  const [saveAction, setSaveAction] = useState<'update' | 'create_new'>('update');

  useEffect(() => {
    if (isOpen) {
      setJobName(initialJobName);
      setCustomerName(initialCustomerName);
      if (isRevision && initialJobNumber !== undefined) {
        setJobNumber(initialJobNumber);
        setSaveAction('update');
      } else {
        setJobNumber(nextJobNumber);
        setSaveAction('create_new');
      }
    }
  }, [isOpen, nextJobNumber, initialJobName, initialCustomerName, initialJobNumber, isRevision]);

  const handleActionChange = (action: 'update' | 'create_new') => {
    setSaveAction(action);
    if (action === 'create_new') {
      setJobNumber(nextJobNumber);
      if (initialJobName && !jobName.includes('(Copy)') && !jobName.includes('(New)')) {
        setJobName(`${initialJobName} (Copy)`);
      }
    } else if (initialJobNumber !== undefined) {
      setJobNumber(initialJobNumber);
      setJobName(initialJobName);
    }
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (jobName.trim() && customerName.trim() && jobNumber > 0) {
      const isNew = isRevision ? saveAction === 'create_new' : true;
      onSave(jobName.trim(), customerName.trim(), jobNumber, isNew);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50" role="dialog" aria-modal="true" aria-labelledby="modal-title" onClick={onClose}>
      <div className="bg-slate-800 rounded-2xl shadow-xl w-full max-w-md p-6 border border-slate-700" onClick={e => e.stopPropagation()}>
        <h2 id="modal-title" className="text-2xl font-semibold text-cyan-400 border-b border-slate-600 pb-2 mb-4">
          {isRevision ? 'Save Quote' : 'Save New Quote'}
        </h2>

        {isRevision && (
          <div className="mb-4 bg-slate-900/60 p-3 rounded-xl border border-slate-700/80 space-y-2">
            <span className="text-xs font-semibold text-slate-300 block">Choose Save Option:</span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleActionChange('update')}
                className={`py-2 px-3 rounded-lg text-xs font-semibold border transition text-left flex flex-col gap-0.5 ${
                  saveAction === 'update'
                    ? 'bg-amber-500/20 border-amber-500 text-amber-200 ring-1 ring-amber-500/50'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600'
                }`}
              >
                <span className="font-bold">🔄 Update Existing</span>
                <span className="text-[10px] opacity-80">Overwrite Quote #{initialJobNumber}</span>
              </button>
              <button
                type="button"
                onClick={() => handleActionChange('create_new')}
                className={`py-2 px-3 rounded-lg text-xs font-semibold border transition text-left flex flex-col gap-0.5 ${
                  saveAction === 'create_new'
                    ? 'bg-cyan-500/20 border-cyan-500 text-cyan-200 ring-1 ring-cyan-500/50'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600'
                }`}
              >
                <span className="font-bold">📋 Create New from Template</span>
                <span className="text-[10px] opacity-80">New Quote #{nextJobNumber}</span>
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="jobNumber" className="block text-sm font-medium text-slate-300 mb-1">
              Job Number {isRevision && saveAction === 'create_new' && <span className="text-cyan-400 text-xs font-normal">(Auto-assigned new #)</span>}
            </label>
            <input
              type="number"
              id="jobNumber"
              value={jobNumber}
              onChange={(e) => setJobNumber(parseInt(e.target.value, 10) || 0)}
              className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono"
              required
              aria-required="true"
              min="1"
            />
          </div>
          <div>
            <label htmlFor="jobName" className="block text-sm font-medium text-slate-300 mb-1">Job Name</label>
            <input
              type="text"
              id="jobName"
              value={jobName}
              onChange={(e) => setJobName(e.target.value)}
              placeholder="e.g., Lithophane Lamp"
              className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              required
              aria-required="true"
            />
          </div>
          <div>
            <label htmlFor="customerName" className="block text-sm font-medium text-slate-300 mb-1">Customer Name</label>
            <input
              type="text"
              id="customerName"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="e.g., John Doe"
              className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              required
              aria-required="true"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-600 hover:bg-slate-500 text-slate-200 font-semibold transition-colors text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`px-5 py-2 rounded-lg text-white font-semibold transition-colors text-sm shadow ${
                isRevision && saveAction === 'create_new'
                  ? 'bg-cyan-600 hover:bg-cyan-500'
                  : isRevision
                  ? 'bg-amber-600 hover:bg-amber-500'
                  : 'bg-cyan-600 hover:bg-cyan-500'
              }`}
            >
              {isRevision
                ? saveAction === 'create_new'
                  ? 'Save as New Quote'
                  : `Update Quote #${initialJobNumber}`
                : 'Save Quote'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SaveQuoteModal;