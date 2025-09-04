import React, { useState, useEffect } from 'react';
import type { Printer } from '../types';
import TrashIcon from './icons/TrashIcon';
import PencilIcon from './icons/PencilIcon';

interface PrinterConfigurationPageProps {
  printers: Printer[];
  onAdd: (printer: Omit<Printer, 'id'>) => void;
  onUpdate: (printer: Printer) => void;
  onDelete: (id: string) => void;
}

const emptyPrinter: Omit<Printer, 'id'> = {
  name: '',
  brand: '',
  watts: 150,
};

const PrinterConfigurationPage: React.FC<PrinterConfigurationPageProps> = ({ printers, onAdd, onUpdate, onDelete }) => {
  const [editingPrinter, setEditingPrinter] = useState<Omit<Printer, 'id'> | Printer>(emptyPrinter);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (isEditing && 'id' in editingPrinter && !printers.find(p => p.id === editingPrinter.id)) {
      handleCancelEdit();
    }
  }, [printers, isEditing, editingPrinter]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditingPrinter(prev => ({
      ...prev,
      [name]: name === 'watts' ? parseInt(value, 10) || 0 : value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPrinter.name || !editingPrinter.brand) return;

    if (isEditing && 'id' in editingPrinter) {
      onUpdate(editingPrinter as Printer);
    } else {
      onAdd(editingPrinter);
    }
    handleCancelEdit();
  };
  
  const handleEdit = (printer: Printer) => {
    setEditingPrinter(printer);
    setIsEditing(true);
  };
  
  const handleCancelEdit = () => {
    setEditingPrinter(emptyPrinter);
    setIsEditing(false);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8">
      <div className="md:col-span-1 bg-slate-800/50 p-6 rounded-2xl shadow-lg border border-slate-700">
        <h2 className="text-2xl font-semibold text-cyan-400 border-b border-slate-600 pb-2 mb-4">
          {isEditing ? 'Edit Printer' : 'Add New Printer'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="brand" className="block text-sm font-medium text-slate-300 mb-1">Brand</label>
            <input
              type="text"
              id="brand"
              name="brand"
              value={editingPrinter.brand}
              onChange={handleChange}
              placeholder="e.g., Creality"
              className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              required
            />
          </div>
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-slate-300 mb-1">Printer Name / Model</label>
            <input
              type="text"
              id="name"
              name="name"
              value={editingPrinter.name}
              onChange={handleChange}
              placeholder="e.g., Ender 3 V2"
              className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              required
            />
          </div>
          <div>
            <label htmlFor="watts" className="block text-sm font-medium text-slate-300 mb-1">Power Consumption (Watts)</label>
            <input
              type="number"
              id="watts"
              name="watts"
              value={editingPrinter.watts}
              onChange={handleChange}
              min="0"
              step="1"
              className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              required
            />
          </div>
          <div className="flex gap-4 pt-2">
            <button
              type="submit"
              className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 px-4 rounded-lg transition-colors"
            >
              {isEditing ? 'Update Printer' : 'Add Printer'}
            </button>
            {isEditing && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="flex-1 bg-slate-600 hover:bg-slate-500 text-slate-200 font-bold py-2 px-4 rounded-lg transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>
      <div className="md:col-span-2 bg-slate-800/50 p-6 rounded-2xl shadow-lg border border-slate-700">
        <h2 className="text-2xl font-semibold text-cyan-400 border-b border-slate-600 pb-2 mb-4">Saved Printers</h2>
        {printers.length === 0 ? (
          <div className="text-center py-10 text-slate-500">
            <p>You have no saved printers.</p>
            <p className="text-sm">Use the form to add one.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {printers.map(printer => (
              <li key={printer.id} className="bg-slate-800 p-3 rounded-lg border border-slate-700 flex justify-between items-center">
                <div>
                  <span className="font-semibold text-slate-100">{printer.brand} - {printer.name}</span>
                  <span className="text-slate-400 text-sm ml-2">({printer.watts}W)</span>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleEdit(printer)} className="p-2 rounded-full bg-slate-600 hover:bg-cyan-500/40 text-slate-300 hover:text-cyan-300 transition-colors"><PencilIcon className="w-4 h-4" /></button>
                  <button onClick={() => onDelete(printer.id)} className="p-2 rounded-full bg-slate-600 hover:bg-red-500/40 text-slate-300 hover:text-red-300 transition-colors"><TrashIcon className="w-4 h-4" /></button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default PrinterConfigurationPage;
