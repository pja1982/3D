import React, { useState, useEffect } from 'react';
import type { Part } from '../types';
import TrashIcon from './icons/TrashIcon';
import PencilIcon from './icons/PencilIcon';
import CubeIcon from './icons/CubeIcon';

interface PartsPageProps {
  parts: Part[];
  onAdd: (part: Omit<Part, 'id'>) => void;
  onUpdate: (part: Part) => void;
  onDelete: (id: string) => void;
}

const emptyPart: Omit<Part, 'id'> = {
  name: '',
  description: '',
  filamentGrams: 50,
  printHours: 2.5,
  postProcessingHours: 0.25,
  hardwareCost: 0,
};

const PartsPage: React.FC<PartsPageProps> = ({ parts, onAdd, onUpdate, onDelete }) => {
  const [editingPart, setEditingPart] = useState<Omit<Part, 'id'> | Part>(emptyPart);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (isEditing && 'id' in editingPart && !parts.find(p => p.id === editingPart.id)) {
      handleCancelEdit();
    }
  }, [parts, isEditing, editingPart]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const isNumeric = ['filamentGrams', 'printHours', 'postProcessingHours', 'hardwareCost'].includes(name);
    setEditingPart(prev => ({
      ...prev,
      [name]: isNumeric ? parseFloat(value) || 0 : value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPart.name) return;

    if (isEditing && 'id' in editingPart) {
      onUpdate(editingPart as Part);
    } else {
      onAdd(editingPart);
    }
    handleCancelEdit();
  };
  
  const handleEdit = (part: Part) => {
    setEditingPart(part);
    setIsEditing(true);
  };
  
  const handleCancelEdit = () => {
    setEditingPart(emptyPart);
    setIsEditing(false);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8">
      <div className="md:col-span-1 bg-slate-800/50 p-6 rounded-2xl shadow-lg border border-slate-700">
        <h2 className="flex items-center gap-3 text-2xl font-semibold text-cyan-400 border-b border-slate-600 pb-2 mb-4">
          <CubeIcon className="w-7 h-7" />
          {isEditing ? 'Edit Part' : 'Add New Part'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-slate-300 mb-1">Part Name</label>
            <input
              type="text" id="name" name="name" value={editingPart.name} onChange={handleChange}
              placeholder="e.g., Benchy"
              className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              required
            />
          </div>
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-slate-300 mb-1">Description</label>
            <textarea
              id="description" name="description" value={editingPart.description} onChange={handleChange}
              placeholder="e.g., A small boat to test printer calibration"
              rows={3}
              className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
          <div>
            <label htmlFor="filamentGrams" className="block text-sm font-medium text-slate-300 mb-1">Filament Weight (grams)</label>
            <input
              type="number" id="filamentGrams" name="filamentGrams" value={editingPart.filamentGrams} onChange={handleChange} min="0" step="0.1"
              className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500" required
            />
          </div>
           <div>
            <label htmlFor="printHours" className="block text-sm font-medium text-slate-300 mb-1">Print Time (hours)</label>
            <input
              type="number" id="printHours" name="printHours" value={editingPart.printHours} onChange={handleChange} min="0" step="0.01"
              className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500" required
            />
          </div>
          <div>
            <label htmlFor="postProcessingHours" className="block text-sm font-medium text-slate-300 mb-1">Post-Processing Time (hours)</label>
            <input
              type="number" id="postProcessingHours" name="postProcessingHours" value={editingPart.postProcessingHours} onChange={handleChange} min="0" step="0.01"
              className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500" required
            />
          </div>
          <div>
            <label htmlFor="hardwareCost" className="block text-sm font-medium text-slate-300 mb-1">Additional Hardware Cost ($)</label>
            <input
              type="number" id="hardwareCost" name="hardwareCost" value={editingPart.hardwareCost} onChange={handleChange} min="0" step="0.01"
              className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500" required
            />
          </div>
          <div className="flex gap-4 pt-2">
            <button
              type="submit"
              className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 px-4 rounded-lg transition-colors"
            >
              {isEditing ? 'Update Part' : 'Add Part'}
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
        <h2 className="text-2xl font-semibold text-cyan-400 border-b border-slate-600 pb-2 mb-4">Saved Parts</h2>
        {parts.length === 0 ? (
          <div className="text-center py-10 text-slate-500">
            <p>You have no saved parts.</p>
            <p className="text-sm">Use the form to add one.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {parts.map(part => (
              <li key={part.id} className="bg-slate-800 p-3 rounded-lg border border-slate-700 flex justify-between items-center">
                <div>
                  <h3 className="font-semibold text-slate-100">{part.name}</h3>
                  <p className="text-sm text-slate-400">{part.description}</p>
                  <div className="flex gap-4 text-xs mt-2 text-slate-400">
                     <span><span className="font-medium text-slate-300">{part.filamentGrams}</span>g</span>
                     <span><span className="font-medium text-slate-300">{part.printHours}</span>hr</span>
                     <span><span className="font-medium text-slate-300">{part.postProcessingHours}</span>hr p.p.</span>
                     <span>$<span className="font-medium text-slate-300">{part.hardwareCost.toFixed(2)}</span> h/w</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                  <button onClick={() => handleEdit(part)} className="p-2 rounded-full bg-slate-600 hover:bg-cyan-500/40 text-slate-300 hover:text-cyan-300 transition-colors"><PencilIcon className="w-4 h-4" /></button>
                  <button onClick={() => onDelete(part.id)} className="p-2 rounded-full bg-slate-600 hover:bg-red-500/40 text-slate-300 hover:text-red-300 transition-colors"><TrashIcon className="w-4 h-4" /></button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default PartsPage;
