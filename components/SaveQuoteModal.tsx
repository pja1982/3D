import React, { useState, useEffect } from 'react';

interface SaveQuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (jobName: string, customerName: string) => void;
}

const SaveQuoteModal: React.FC<SaveQuoteModalProps> = ({ isOpen, onClose, onSave }) => {
  const [jobName, setJobName] = useState('');
  const [customerName, setCustomerName] = useState('');

  useEffect(() => {
    if (isOpen) {
      // Reset form on open
      setJobName('');
      setCustomerName('');
    }
  }, [isOpen]);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (jobName.trim() && customerName.trim()) {
      onSave(jobName, customerName);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50" role="dialog" aria-modal="true" aria-labelledby="modal-title" onClick={onClose}>
      <div className="bg-slate-800 rounded-2xl shadow-xl w-full max-w-md p-6 border border-slate-700" onClick={e => e.stopPropagation()}>
        <h2 id="modal-title" className="text-2xl font-semibold text-cyan-400 border-b border-slate-600 pb-2 mb-4">Save Quote</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
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
          <div className="flex justify-end gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 rounded-lg bg-slate-600 hover:bg-slate-500 text-slate-200 font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold transition-colors"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SaveQuoteModal;
