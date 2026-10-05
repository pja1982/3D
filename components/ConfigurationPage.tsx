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

const POPULAR_COLORS = [
  { name: 'Black', hex: '#18181b' },
  { name: 'White', hex: '#f8fafc' },
  { name: 'Slate Gray', hex: '#64748b' },
  { name: 'Fire Red', hex: '#ef4444' },
  { name: 'Orange', hex: '#f97316' },
  { name: 'Amber Gold', hex: '#f59e0b' },
  { name: 'Lime Green', hex: '#10b981' },
  { name: 'Forest Green', hex: '#047857' },
  { name: 'Cyan Blue', hex: '#06b6d4' },
  { name: 'Royal Blue', hex: '#3b82f6' },
  { name: 'Deep Purple', hex: '#8b5cf6' },
  { name: 'Magenta Pink', hex: '#ec4899' },
];

export const getContrastTheme = (hexColor?: string): 'dark-on-light' | 'light-on-dark' => {
  if (!hexColor) return 'light-on-dark';
  let hex = hexColor.replace('#', '').trim();
  if (hex.length === 3) {
    hex = hex.split('').map(c => c + c).join('');
  }
  if (hex.length !== 6) return 'light-on-dark';
  
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return 'light-on-dark';

  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 140 ? 'dark-on-light' : 'light-on-dark';
};

export const normalizeHex = (hex?: string): string => {
  if (!hex) return '#3b82f6';
  let cleaned = hex.trim();
  if (!cleaned.startsWith('#')) {
    cleaned = `#${cleaned}`;
  }
  return cleaned;
};

const emptyFilament: Omit<Filament, 'id'> = {
  type: '',
  brand: '',
  colorName: '',
  costPerKg: 20,
  colorHex: '#3b82f6',
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

  const handleColorHexChange = (value: string) => {
    setEditingFilament(prev => ({
      ...prev,
      colorHex: value,
    }));
  };

  const handleSelectPreset = (preset: { name: string; hex: string }) => {
    setEditingFilament(prev => ({
      ...prev,
      colorHex: preset.hex,
      // If colorName is empty or matches an existing preset name, update it to the clicked preset's name
      colorName: (!prev.colorName || POPULAR_COLORS.some(p => p.name === prev.colorName)) ? preset.name : prev.colorName,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const filType = (editingFilament.type || (editingFilament as any).name || '').trim();
    const brand = editingFilament.brand.trim();
    if (!filType || !brand) return;

    const normalizedColor = normalizeHex(editingFilament.colorHex || '#3b82f6');
    const colorName = (editingFilament.colorName || '').trim();

    const filamentData = {
      ...editingFilament,
      type: filType,
      name: filType, // keep name synchronized for backward compatibility
      brand,
      colorName,
      colorHex: normalizedColor,
    };

    if (isEditing && 'id' in editingFilament) {
      onUpdate(filamentData as Filament);
    } else {
      onAdd(filamentData);
    }
    handleCancelEdit();
  };
  
  const handleEdit = (filament: Filament) => {
    setEditingFilament({
      ...filament,
      type: filament.type || (filament as any).name || '',
      colorName: filament.colorName || '',
      colorHex: filament.colorHex || '#3b82f6',
    });
    setIsEditing(true);
  };
  
  const handleCancelEdit = () => {
    setEditingFilament(emptyFilament);
    setIsEditing(false);
  };

  const currentPreviewHex = normalizeHex(editingFilament.colorHex || '#3b82f6');
  const previewTheme = getContrastTheme(currentPreviewHex);
  const isPreviewLight = previewTheme === 'dark-on-light';

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8">
      {/* Filament Form */}
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
              placeholder="e.g., Bambu Lab, Polymaker, Overture"
              className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              required
            />
          </div>

          <div>
            <label htmlFor="type" className="block text-sm font-medium text-slate-300 mb-1">Filament Type</label>
            <input
              type="text"
              id="type"
              name="type"
              value={editingFilament.type || (editingFilament as any).name || ''}
              onChange={handleChange}
              placeholder="e.g., PLA, PETG, ABS, TPU, Silk PLA"
              className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              required
            />
          </div>

          <div>
            <label htmlFor="colorName" className="block text-sm font-medium text-slate-300 mb-1">
              Colour Name
            </label>
            <input
              type="text"
              id="colorName"
              name="colorName"
              value={editingFilament.colorName || ''}
              onChange={handleChange}
              placeholder="e.g., Matte Black, Signal White, Galaxy Purple"
              className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          <div>
            <label htmlFor="colorHex" className="block text-sm font-medium text-slate-300 mb-1">
              Color (Hex Code)
            </label>
            <div className="flex items-center gap-3">
              {/* Native color picker */}
              <div className="relative flex-shrink-0">
                <input
                  type="color"
                  id="colorPicker"
                  value={
                    /^#[0-9A-Fa-f]{6}$/.test(normalizeHex(editingFilament.colorHex || ''))
                      ? normalizeHex(editingFilament.colorHex || '')
                      : '#3b82f6'
                  }
                  onChange={(e) => handleColorHexChange(e.target.value.toLowerCase())}
                  className="w-11 h-10 rounded-lg cursor-pointer border border-slate-600 bg-slate-700 p-0.5 shadow-sm"
                  title="Click to open color palette"
                />
              </div>

              {/* Text input for hex code */}
              <div className="relative flex-1">
                <input
                  type="text"
                  id="colorHex"
                  name="colorHex"
                  value={editingFilament.colorHex || ''}
                  onChange={(e) => handleColorHexChange(e.target.value)}
                  placeholder="#3B82F6"
                  maxLength={9}
                  className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-slate-100 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 uppercase"
                />
              </div>
            </div>

            {/* Popular presets */}
            <div className="mt-3">
              <div className="text-xs text-slate-400 mb-1.5 flex justify-between items-center">
                <span>Color Presets:</span>
                <span className="font-mono text-[11px] text-cyan-400">
                  {currentPreviewHex.toUpperCase()}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {POPULAR_COLORS.map(c => (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => handleSelectPreset(c)}
                    className={`w-6 h-6 rounded-md border transition-all transform hover:scale-110 ${
                      (editingFilament.colorHex || '').toLowerCase() === c.hex.toLowerCase()
                        ? 'ring-2 ring-cyan-400 scale-105 border-white shadow'
                        : 'border-slate-600 hover:border-slate-400'
                    }`}
                    style={{ backgroundColor: c.hex }}
                    title={`${c.name} (${c.hex})`}
                  />
                ))}
              </div>
            </div>
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

          {/* Live Card Preview */}
          <div className="pt-2 border-t border-slate-700/60">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">Live Background Preview</span>
            <div
              style={{ backgroundColor: currentPreviewHex }}
              className={`p-3.5 rounded-xl border shadow-md flex justify-between items-center transition-all ${
                isPreviewLight ? 'border-black/15 text-slate-900 shadow-slate-900/10' : 'border-white/20 text-white shadow-black/30'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className={`w-4 h-4 rounded-full border shadow-inner flex-shrink-0 ${
                    isPreviewLight ? 'border-black/30' : 'border-white/40'
                  }`}
                  style={{ backgroundColor: currentPreviewHex }}
                />
                <div className="min-w-0 truncate">
                  <div className="font-bold text-sm truncate flex items-center gap-1.5">
                    <span>{(editingFilament.brand || 'Brand')} - {(editingFilament.type || (editingFilament as any).name || 'Filament Type')}</span>
                    {editingFilament.colorName && (
                      <span className={`text-[11px] px-1.5 py-0.2 rounded font-medium border ${
                        isPreviewLight ? 'bg-black/10 border-black/20 text-slate-900' : 'bg-white/15 border-white/20 text-white'
                      }`}>
                        {editingFilament.colorName}
                      </span>
                    )}
                  </div>
                  <div className={`text-xs ${isPreviewLight ? 'text-slate-800 font-medium' : 'text-slate-200'}`}>
                    ${(editingFilament.costPerKg || 0).toFixed(2)}/kg
                  </div>
                </div>
              </div>
              <span className={`text-[11px] font-mono px-2 py-0.5 rounded border flex-shrink-0 ml-2 ${
                isPreviewLight ? 'bg-black/10 border-black/20 text-slate-900' : 'bg-white/15 border-white/20 text-white'
              }`}>
                {currentPreviewHex.toUpperCase()}
              </span>
            </div>
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

      {/* Saved Filaments List */}
      <div className="md:col-span-2 bg-slate-800/50 p-6 rounded-2xl shadow-lg border border-slate-700">
        <h2 className="text-2xl font-semibold text-cyan-400 border-b border-slate-600 pb-2 mb-4">Saved Filaments</h2>
        {filaments.length === 0 ? (
          <div className="text-center py-10 text-slate-500">
            <p>You have no saved filaments.</p>
            <p className="text-sm">Use the form to add one.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {filaments.map(filament => {
              const filType = filament.type || filament.name || 'Filament';
              const hex = normalizeHex(filament.colorHex);
              const theme = getContrastTheme(hex);
              const isLightBg = theme === 'dark-on-light';

              return (
                <li
                  key={filament.id}
                  style={{ backgroundColor: hex }}
                  className={`p-4 rounded-xl border shadow-md flex justify-between items-center transition-all hover:shadow-lg ${
                    isLightBg
                      ? 'border-black/15 text-slate-900 shadow-slate-950/5'
                      : 'border-white/15 text-white shadow-black/40'
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <span
                      className={`w-6 h-6 rounded-full border shadow-inner flex-shrink-0 ${
                        isLightBg ? 'border-black/30 ring-1 ring-black/10' : 'border-white/40 ring-1 ring-white/20'
                      }`}
                      style={{ backgroundColor: hex }}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-base tracking-tight truncate">
                          {filament.brand} - {filType}
                        </span>
                        {filament.colorName && (
                          <span
                            className={`text-xs px-2 py-0.5 rounded font-medium border flex-shrink-0 ${
                              isLightBg
                                ? 'bg-black/10 border-black/20 text-slate-900'
                                : 'bg-white/15 border-white/20 text-white'
                            }`}
                          >
                            {filament.colorName}
                          </span>
                        )}
                        <span
                          className={`text-xs px-2 py-0.5 rounded font-mono font-semibold border flex-shrink-0 ${
                            isLightBg
                              ? 'bg-black/10 border-black/20 text-slate-900'
                              : 'bg-white/15 border-white/20 text-white'
                          }`}
                        >
                          {hex.toUpperCase()}
                        </span>
                      </div>
                      <div className={`text-sm mt-0.5 ${isLightBg ? 'text-slate-800 font-medium' : 'text-slate-200'}`}>
                        ${filament.costPerKg.toFixed(2)}/kg
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                    <button
                      onClick={() => handleEdit(filament)}
                      className={`p-2 rounded-lg transition-colors ${
                        isLightBg
                          ? 'bg-black/10 hover:bg-black/20 text-slate-900'
                          : 'bg-white/15 hover:bg-white/25 text-white'
                      }`}
                      title="Edit Filament"
                    >
                      <PencilIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDelete(filament.id)}
                      className={`p-2 rounded-lg transition-colors ${
                        isLightBg
                          ? 'bg-red-600/20 hover:bg-red-600/30 text-red-950'
                          : 'bg-red-500/30 hover:bg-red-500/50 text-red-200'
                      }`}
                      title="Delete Filament"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};

export default ConfigurationPage;
