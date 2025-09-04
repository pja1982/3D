import React, { useState, useEffect } from 'react';
import type { Filament } from '../types';
import TrashIcon from './icons/TrashIcon';
import PencilIcon from './icons/PencilIcon';

interface ConfigurationPageProps {
  filaments: Filament[];
  onAdd: (filament: Omit<Filament, 'id'>) => void;
  onUpdate: (filament: Filament) => void;
  onDelete: (id: string) => void;
}

const emptyFilament: Omit<Filament, 'id'> = {
  name: '',
  brand: '',
  costPerKg: 20,
};

const ConfigurationPage: React.FC<ConfigurationPageProps> = ({ filaments, onAdd, onUpdate, onDelete }) => {
  const [editingFilament, setEditingFilament] = useState<Omit<Filament, 'id'> | Filament>(emptyFilament);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    // If the filament being edited is deleted from the main list, reset the form.
    if (isEditing && 'id' in editingFilament && !filaments.find(m => m.id === editingFilament.id)) {
      handleCancelEdit();
    }
  }, [filaments]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditingFilament(prev => ({
      ...prev,
      [name]: name === 'costPerKg' ? parseFloat(value) || 0 : value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFilament.name || !editingFilament.brand) return;

    if (isEditing && 'id' in editingFilament) {
      onUpdate(editingFilament as Filament);
    } else {
      onAdd(editingFilament);
    }
    handleCancelEdit();
  };
  
  const handleEdit = (filament: Filament) => {
    setEditingFilament(filament);
    setIsEditing(true);
  };
  
  const handleCancelEdit = () => {
    setEditingFilament(emptyFilament);
    setIsEditing(false);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8">
      <div className="md:col-span-1 bg-slate-800/50 p-6 rounded-2xl shadow-lg border border-slate-700">
        <h2 className="text-2xl font-semibold text-cyan-400 border-b border-slate-600 pb-2 mb-4">
          {isEditing ? 'Edit Filament' : 'Add New Filament'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="brand" className="block text-sm font-medium text-slate-300 mb-1">Brand</label>
            <input
              type="text"
              id="brand"
              name="brand"
              value={editingFilament.brand}
              onChange={handleChange}
              placeholder="e.g., Overture"
              className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              required
            />
          </div>
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-slate-300 mb-1">Filament Name</label>
            <input
              type="text"
              id="name"
              name="name"
              value={editingFilament.name}
              onChange={handleChange}
              placeholder="e.g., Silk PLA"
              className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              required
            />
          </div>
          <div>
            <label htmlFor="costPerKg" className="block text-sm font-medium text-slate-300 mb-1">Cost per Kg ($)</label>
            <input
              type="number"
              id="costPerKg"
              name="costPerKg"
              value={editingFilament.costPerKg}
              onChange={handleChange}
              min="0"
              step="0.01"
              className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              required
            />
          </div>
          <div className="flex gap-4 pt-2">
            <button
              type="submit"
              className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 px-4 rounded-lg transition-colors"
            >
              {isEditing ? 'Update Filament' : 'Add Filament'}
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
        <h2 className="text-2xl font-semibold text-cyan-400 border-b border-slate-600 pb-2 mb-4">Saved Filaments</h2>
        {filaments.length === 0 ? (
          <div className="text-center py-10 text-slate-500">
            <p>You have no saved filaments.</p>
            <p className="text-sm">Use the form to add one.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {filaments.map(filament => (
              <li key={filament.id} className="bg-slate-800 p-3 rounded-lg border border-slate-700 flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div>
                    <span className="font-semibold text-slate-100">{filament.brand} - {filament.name}</span>
                    <span className="text-slate-400 text-sm ml-2">(${filament.costPerKg.toFixed(2)}/kg)</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleEdit(filament)} className="p-2 rounded-full bg-slate-600 hover:bg-cyan-500/40 text-slate-300 hover:text-cyan-300 transition-colors"><PencilIcon className="w-4 h-4" /></button>
                  <button onClick={() => onDelete(filament.id)} className="p-2 rounded-full bg-slate-600 hover:bg-red-500/40 text-slate-300 hover:text-red-300 transition-colors"><TrashIcon className="w-4 h-4" /></button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default ConfigurationPage;